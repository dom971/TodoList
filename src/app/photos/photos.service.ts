import { Injectable, inject, signal } from '@angular/core';

import { SupabaseService } from '../core/supabase.service';
import { Photo } from './photo.model';

const PHOTOS_BUCKET = 'photos';
const SIGNED_URL_DURATION_SECONDS = 60 * 60;

@Injectable({
  providedIn: 'root',
})
export class PhotosService {
  private readonly supabase = inject(SupabaseService).client;

  readonly photos = signal<Photo[]>([]);
  readonly title = signal('');
  readonly description = signal('');
  readonly selectedFileName = signal('');
  readonly isLoading = signal(false);
  readonly isUploading = signal(false);
  readonly errorMessage = signal('');

  private selectedFile?: File;

  clear(): void {
    this.photos.set([]);
    this.title.set('');
    this.description.set('');
    this.selectedFileName.set('');
    this.selectedFile = undefined;
    this.isLoading.set(false);
    this.isUploading.set(false);
    this.errorMessage.set('');
  }

  selectFile(file: File | undefined): void {
    this.selectedFile = file;
    this.selectedFileName.set(file?.name ?? '');
    this.errorMessage.set('');
  }

  async loadPhotos(userId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('photos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    this.isLoading.set(false);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.photos.set(await this.withSignedUrls((data ?? []) as Photo[]));
  }

  async uploadPhoto(userId: string): Promise<void> {
    const file = this.selectedFile;

    if (!file) {
      this.errorMessage.set('Sélectionne une image à envoyer.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Le fichier sélectionné doit être une image.');
      return;
    }

    this.isUploading.set(true);
    this.errorMessage.set('');

    const storagePath = `${userId}/${Date.now()}-${this.sanitizeFileName(file.name)}`;
    const uploadResult = await this.supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadResult.error) {
      this.isUploading.set(false);
      this.errorMessage.set(uploadResult.error.message);
      return;
    }

    const { data, error } = await this.supabase
      .from('photos')
      .insert({
        user_id: userId,
        storage_path: storagePath,
        title: this.title().trim() || file.name,
        description: this.description().trim() || null,
      })
      .select()
      .single();

    this.isUploading.set(false);

    if (error) {
      await this.supabase.storage.from(PHOTOS_BUCKET).remove([storagePath]);
      this.errorMessage.set(error.message);
      return;
    }

    const [photo] = await this.withSignedUrls([data as Photo]);
    this.photos.update((photos) => [photo, ...photos]);
    this.title.set('');
    this.description.set('');
    this.selectedFileName.set('');
    this.selectedFile = undefined;
  }

  async deletePhoto(photo: Photo, userId: string): Promise<void> {
    this.errorMessage.set('');

    const { error } = await this.supabase
      .from('photos')
      .delete()
      .eq('id', photo.id)
      .eq('user_id', userId);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    await this.supabase.storage.from(PHOTOS_BUCKET).remove([photo.storage_path]);
    this.photos.update((photos) => photos.filter((currentPhoto) => currentPhoto.id !== photo.id));
  }

  private async withSignedUrls(photos: Photo[]): Promise<Photo[]> {
    return Promise.all(
      photos.map(async (photo) => {
        const { data } = await this.supabase.storage
          .from(PHOTOS_BUCKET)
          .createSignedUrl(photo.storage_path, SIGNED_URL_DURATION_SECONDS);

        return {
          ...photo,
          signedUrl: data?.signedUrl,
        };
      }),
    );
  }

  private sanitizeFileName(fileName: string): string {
    return fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .toLowerCase();
  }
}
