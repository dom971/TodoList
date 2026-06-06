import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../core/auth.service';
import { Photo } from './photo.model';
import { PhotosService } from './photos.service';

@Component({
  selector: 'app-photos-board',
  imports: [FormsModule],
  templateUrl: './photos-board.component.html',
  styleUrl: './photos-board.component.scss',
})
export class PhotosBoardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly photosService = inject(PhotosService);

  protected readonly photoCount = computed(() => this.photosService.photos().length);

  protected selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.photosService.selectFile(input.files?.[0]);
  }

  protected uploadPhoto(): Promise<void> {
    return this.withUser((userId) => this.photosService.uploadPhoto(userId));
  }

  protected deletePhoto(photo: Photo): Promise<void> {
    return this.withUser((userId) => this.photosService.deletePhoto(photo, userId));
  }

  protected savePhotoMetadata(photo: Photo): Promise<void> {
    return this.withUser((userId) => this.photosService.savePhotoMetadata(photo, userId));
  }

  protected openPhoto(photo: Photo): void {
    if (!photo.signedUrl) {
      return;
    }

    window.open(photo.signedUrl, '_blank', 'noopener,noreferrer');
  }

  protected async sharePhoto(photo: Photo): Promise<void> {
    if (!photo.signedUrl) {
      return;
    }

    if (!navigator.share) {
      this.openPhoto(photo);
      return;
    }

    try {
      await navigator.share({
        title: photo.title || 'Photo',
        text: photo.description || undefined,
        url: photo.signedUrl,
      });
    } catch {
      // The browser also throws when the user cancels the native share sheet.
    }
  }

  private async withUser(action: (userId: string) => Promise<void>): Promise<void> {
    const userId = this.auth.session()?.user.id;

    if (!userId) {
      return;
    }

    await action(userId);
  }
}
