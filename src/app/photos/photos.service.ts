import { Injectable, inject, signal } from '@angular/core';

import { SupabaseService } from '../core/supabase.service';
import { Photo } from './photo.model';

const PHOTOS_BUCKET = 'photos';
const SIGNED_URL_DURATION_SECONDS = 60 * 60;
const COMPRESSED_IMAGE_MAX_SIZE = 1600;
const COMPRESSED_IMAGE_QUALITY = 0.74;

@Injectable({
  providedIn: 'root',
})
export class PhotosService {
  private readonly supabase = inject(SupabaseService).client;

  readonly photos = signal<Photo[]>([]);
  readonly title = signal('');
  readonly description = signal('');
  readonly selectedFileName = signal('');
  readonly selectedPhotoId = signal<number | null>(null);
  readonly editingPhotoId = signal<number | null>(null);
  readonly editingTitle = signal('');
  readonly editingDescription = signal('');
  readonly isLoading = signal(false);
  readonly isUploading = signal(false);
  readonly errorMessage = signal('');

  private selectedFile?: File;

  clear(): void {
    this.photos.set([]);
    this.title.set('');
    this.description.set('');
    this.selectedFileName.set('');
    this.selectedPhotoId.set(null);
    this.cancelEdit();
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

    const compressedFile = await this.compressImage(file);
    const storagePath = `${userId}/${Date.now()}-${this.sanitizeFileName(compressedFile.name)}`;
    const uploadResult = await this.supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(storagePath, compressedFile, {
        contentType: compressedFile.type,
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

    if (this.selectedPhotoId() === photo.id) {
      this.selectedPhotoId.set(null);
    }
  }

  selectPhoto(photo: Photo): void {
    this.selectedPhotoId.update((photoId) => (photoId === photo.id ? null : photo.id));
    this.cancelEdit();
  }

  closeSelection(): void {
    this.selectedPhotoId.set(null);
    this.cancelEdit();
  }

  startEdit(photo: Photo): void {
    this.selectedPhotoId.set(photo.id);
    this.editingPhotoId.set(photo.id);
    this.editingTitle.set(photo.title ?? '');
    this.editingDescription.set(photo.description ?? '');
    this.errorMessage.set('');
  }

  cancelEdit(): void {
    this.editingPhotoId.set(null);
    this.editingTitle.set('');
    this.editingDescription.set('');
  }

  async savePhotoMetadata(photo: Photo, userId: string): Promise<void> {
    const title = this.editingTitle().trim();
    const description = this.editingDescription().trim();

    if (!title) {
      this.errorMessage.set('Le titre de la photo est obligatoire.');
      return;
    }

    if (title === (photo.title ?? '') && description === (photo.description ?? '')) {
      this.cancelEdit();
      return;
    }

    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('photos')
      .update({
        title,
        description: description || null,
      })
      .eq('id', photo.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.photos.update((photos) =>
      photos.map((currentPhoto) =>
        currentPhoto.id === data.id
          ? {
              ...(data as Photo),
              signedUrl: currentPhoto.signedUrl,
            }
          : currentPhoto,
      ),
    );
    this.cancelEdit();
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

  private async compressImage(file: File): Promise<File> {
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
      return file;
    }

    let image: HTMLImageElement | undefined;

    try {
      image = await this.loadImage(file);
      const ratio = Math.min(
        1,
        COMPRESSED_IMAGE_MAX_SIZE / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const width = Math.round(image.naturalWidth * ratio);
      const height = Math.round(image.naturalHeight * ratio);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        return file;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', COMPRESSED_IMAGE_QUALITY);
      });

      if (!blob) {
        return file;
      }

      if (blob.size >= file.size) {
        return file;
      }

      return new File([blob], this.toCompressedFileName(file.name), {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    } catch {
      return file;
    } finally {
      if (image?.src) {
        URL.revokeObjectURL(image.src);
      }
    }
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = URL.createObjectURL(file);
    });
  }

  private toCompressedFileName(fileName: string): string {
    return fileName.replace(/\.[^.]+$/, '') + '.jpg';
  }
}
