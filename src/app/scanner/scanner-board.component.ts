import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

import { AuthService } from '../core/auth.service';
import { ScansService } from './scans.service';

@Component({
  selector: 'app-scanner-board',
  imports: [FormsModule],
  templateUrl: './scanner-board.component.html',
  styleUrl: './scanner-board.component.scss',
})
export class ScannerBoardComponent implements OnDestroy {
  @ViewChild('previewVideo') private previewVideo?: ElementRef<HTMLVideoElement>;

  protected readonly auth = inject(AuthService);
  protected readonly scansService = inject(ScansService);

  protected readonly isScanning = signal(false);
  protected readonly scannedValue = signal('');
  protected readonly scannedFormat = signal('');
  protected readonly cameraMessage = signal('');

  private readonly reader = new BrowserMultiFormatReader();
  private scannerControls?: IScannerControls;

  ngOnDestroy(): void {
    this.stopScanner();
  }

  protected async startScanner(): Promise<void> {
    const videoElement = this.previewVideo?.nativeElement;

    if (!videoElement) {
      return;
    }

    this.cameraMessage.set('');
    this.scannedValue.set('');
    this.scannedFormat.set('');
    this.isScanning.set(true);

    try {
      this.scannerControls = await this.reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        },
        videoElement,
        (result) => {
          if (!result) {
            return;
          }

          this.scannedValue.set(result.getText());
          this.scannedFormat.set(String(result.getBarcodeFormat()));
          this.stopScanner();
        },
      );
    } catch {
      this.isScanning.set(false);
      this.cameraMessage.set(
        'Impossible d’ouvrir la caméra. Vérifie les permissions du navigateur.',
      );
    }
  }

  protected stopScanner(): void {
    this.scannerControls?.stop();
    this.scannerControls = undefined;
    this.isScanning.set(false);
  }

  protected async saveCurrentScan(): Promise<void> {
    const userId = this.auth.session()?.user.id;
    const value = this.scannedValue();

    if (!userId || !value) {
      return;
    }

    await this.scansService.saveScan(userId, value, this.scannedFormat());
  }

  protected async deleteScan(id: number): Promise<void> {
    const userId = this.auth.session()?.user.id;

    if (!userId) {
      return;
    }

    await this.scansService.deleteScan(id, userId);
  }
}
