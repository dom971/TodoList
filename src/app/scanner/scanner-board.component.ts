import { Component, ElementRef, OnDestroy, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

import { AuthService } from '../core/auth.service';
import { Scan } from './scan.model';
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
  private readonly route = inject(ActivatedRoute);
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly isScanning = signal(false);
  protected readonly scannedValue = signal('');
  protected readonly scannedFormat = signal('');
  protected readonly cameraMessage = signal('');
  protected readonly actionMessage = signal('');
  protected readonly hasSavedCurrentScan = signal(false);
  protected readonly isScannedValueUrl = computed(() => {
    try {
      const url = new URL(this.scannedValue());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  });
  protected readonly hasScans = computed(() => this.scansService.scans().length > 0);

  private readonly reader = new BrowserMultiFormatReader();
  private scannerControls?: IScannerControls;

  constructor() {
    effect(() => {
      const selectedId = Number(this.queryParamMap().get('selected'));

      if (!selectedId) {
        return;
      }

      const scan = this.scansService.scans().find((currentScan) => currentScan.id === selectedId);

      if (!scan) {
        return;
      }

      this.scansService.selectedScanId.set(scan.id);
      this.scrollToSelectedItem('scan', scan.id);
    });
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  protected async startScanner(): Promise<void> {
    const videoElement = this.previewVideo?.nativeElement;

    if (!videoElement) {
      return;
    }

    this.cameraMessage.set('');
    this.actionMessage.set('');
    this.scannedValue.set('');
    this.scannedFormat.set('');
    this.hasSavedCurrentScan.set(false);
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

  protected scanAgain(): void {
    this.scannedValue.set('');
    this.scannedFormat.set('');
    this.actionMessage.set('');
    this.hasSavedCurrentScan.set(false);
    this.scansService.label.set('');
  }

  protected async copyScannedValue(): Promise<void> {
    const value = this.scannedValue();

    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    this.actionMessage.set('Résultat copié.');
  }

  protected openScannedUrl(): void {
    const value = this.scannedValue();

    if (!this.isScannedValueUrl()) {
      return;
    }

    window.open(value, '_blank', 'noopener,noreferrer');
  }

  protected async saveCurrentScan(): Promise<void> {
    const userId = this.auth.session()?.user.id;
    const value = this.scannedValue();

    if (!userId || !value || this.hasSavedCurrentScan()) {
      return;
    }

    await this.scansService.saveScan(userId, value, this.scannedFormat());
    this.hasSavedCurrentScan.set(true);
    this.actionMessage.set('Scan enregistré.');
  }

  protected async deleteScan(id: number): Promise<void> {
    const userId = this.auth.session()?.user.id;

    if (!userId) {
      return;
    }

    await this.scansService.deleteScan(id, userId);
  }

  protected async copyScanValue(scan: Scan): Promise<void> {
    await navigator.clipboard.writeText(scan.value);
    this.actionMessage.set('Scan copié.');
  }

  protected openScanUrl(scan: Scan): void {
    if (!this.isUrl(scan.value)) {
      return;
    }

    window.open(scan.value, '_blank', 'noopener,noreferrer');
  }

  protected isScanUrl(scan: Scan): boolean {
    return this.isUrl(scan.value);
  }

  protected async shareScansList(): Promise<void> {
    const text = this.getScansExportText();

    if (!text) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Liste des scans',
          text,
        });
        return;
      } catch {
        // The browser also throws when the user cancels the native share sheet.
      }
    }

    await navigator.clipboard.writeText(text);
    this.actionMessage.set('Liste des scans copiée.');
  }

  protected async exportScansList(): Promise<void> {
    const text = this.getScansExportText();

    if (!text) {
      return;
    }

    const file = new File([text], 'scans-export.txt', {
      type: 'text/plain',
      lastModified: Date.now(),
    });
    const shareData: ShareData = {
      title: 'Export des scans',
      files: [file],
    };

    if (navigator.share && this.canShareFiles(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // The browser also throws when the user cancels the native share sheet.
      }
    }

    this.downloadFile(file);
    this.actionMessage.set('Export des scans téléchargé.');
  }

  private isUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private getScansExportText(): string {
    return this.scansService.scans().map((scan) => scan.value).join('\n');
  }

  private canShareFiles(shareData: ShareData): boolean {
    return 'canShare' in navigator && navigator.canShare(shareData);
  }

  private downloadFile(file: File): void {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');

    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  private scrollToSelectedItem(prefix: string, id: number): void {
    setTimeout(() => {
      document.getElementById(`${prefix}-${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }
}
