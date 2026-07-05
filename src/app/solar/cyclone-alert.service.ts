import { Injectable, signal } from '@angular/core';

import { CycloneAlert, CycloneAlertLevel } from './cyclone-alert.model';

const VIGILANCE_GUADELOUPE_URL = '/vigilance/fr/guadeloupe';
const VIGILANCE_GUADELOUPE_SOURCE_URL = 'https://vigilance.meteofrance.fr/fr/guadeloupe';

@Injectable({
  providedIn: 'root',
})
export class CycloneAlertService {
  readonly alert = signal<CycloneAlert | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  async loadAlert(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const response = await fetch(VIGILANCE_GUADELOUPE_URL);

      if (!response.ok) {
        throw new Error('Vigilance Météo-France indisponible.');
      }

      const html = await response.text();
      this.alert.set(this.toAlert(this.cleanText(html)));
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Vigilance Météo-France indisponible.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private toAlert(text: string): CycloneAlert {
    const level = this.getLevel(text);

    return {
      level,
      label: this.getLabel(level),
      detail: this.getDetail(level),
      sourceUrl: VIGILANCE_GUADELOUPE_SOURCE_URL,
      checkedAt: new Date().toISOString(),
    };
  }

  private getLevel(text: string): CycloneAlertLevel {
    const mentionsCyclone = /cyclone|cyclonique|ouragan|tempête tropicale/i.test(text);
    const mentionsMajorAlert = /violet|rouge|confinement|alerte cyclonique maximale/i.test(text);
    const mentionsWatch = /orange|jaune|pré-alerte|pre-alerte|vigilance cyclonique/i.test(text);

    if (mentionsCyclone && mentionsMajorAlert) {
      return 'alert';
    }

    if (mentionsCyclone && mentionsWatch) {
      return 'watch';
    }

    return 'clear';
  }

  private getLabel(level: CycloneAlertLevel): string {
    if (level === 'alert') {
      return 'Alerte cyclonique active';
    }

    if (level === 'watch') {
      return 'Vigilance cyclonique à surveiller';
    }

    return 'Pas d’alerte cyclonique détectée';
  }

  private getDetail(level: CycloneAlertLevel): string {
    if (level === 'alert') {
      return 'La page de vigilance Météo-France Guadeloupe mentionne une alerte cyclonique forte.';
    }

    if (level === 'watch') {
      return 'La page de vigilance Météo-France Guadeloupe mentionne une surveillance cyclonique.';
    }

    return 'Aucune mention cyclonique active détectée sur la vigilance Météo-France Guadeloupe.';
  }

  private cleanText(html: string): string {
    const document = new DOMParser().parseFromString(html, 'text/html');

    return (document.body.textContent ?? html).replace(/\s+/g, ' ').trim();
  }
}
