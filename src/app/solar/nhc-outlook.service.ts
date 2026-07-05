import { Injectable, signal } from '@angular/core';

import { NhcOutlook, NhcRiskLevel, NhcSystem } from './nhc-outlook.model';

const NHC_ATLANTIC_OUTLOOK_URL = '/nhc/gtwo.xml';
const NHC_ATLANTIC_PAGE_URL = 'https://www.nhc.noaa.gov/gtwo.php?basin=atlc&fdays=7';

@Injectable({
  providedIn: 'root',
})
export class NhcOutlookService {
  readonly outlook = signal<NhcOutlook | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  async loadOutlook(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const response = await fetch(NHC_ATLANTIC_OUTLOOK_URL);

      if (!response.ok) {
        throw new Error('Bulletin NHC indisponible.');
      }

      const xml = await response.text();
      const document = new DOMParser().parseFromString(xml, 'application/xml');
      const parseError = document.querySelector('parsererror');

      if (parseError) {
        throw new Error('Bulletin NHC illisible.');
      }

      this.outlook.set(this.toOutlook(document));
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Bulletin NHC indisponible.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private toOutlook(document: Document): NhcOutlook {
    const channel = document.querySelector('channel');
    const items = [...document.querySelectorAll('item')];
    const systems = items.map((item) => this.toSystem(item));
    const fullText = systems.map((system) => system.summary).join(' ');
    const formationChance48Hours = this.maxChance(
      systems.map((system) => system.formationChance48Hours),
    );
    const formationChance7Days = this.maxChance(
      systems.map((system) => system.formationChance7Days),
    );
    const riskLevel = this.getRiskLevel(fullText, formationChance48Hours, formationChance7Days);

    return {
      title: this.getText(channel, 'title') || 'Tropical Weather Outlook Atlantique',
      summary: this.getSummary(systems, fullText),
      publishedAt: this.getText(channel, 'pubDate'),
      sourceUrl: NHC_ATLANTIC_PAGE_URL,
      riskLevel,
      riskLabel: this.getRiskLabel(riskLevel),
      formationChance48Hours,
      formationChance7Days,
      systems,
    };
  }

  private toSystem(item: Element): NhcSystem {
    const title = this.getText(item, 'title') || 'Bulletin NHC';
    const summary = this.cleanText(
      this.getText(item, 'description') || this.getText(item, 'summary') || title,
    );

    return {
      title,
      summary,
      link: this.getText(item, 'link') || NHC_ATLANTIC_PAGE_URL,
      formationChance48Hours: this.extractChance(summary, /48 hours?.*?(\d{1,3})\s*percent/i),
      formationChance7Days: this.extractChance(summary, /7 days?.*?(\d{1,3})\s*percent/i),
    };
  }

  private getSummary(systems: NhcSystem[], fullText: string): string {
    if (!systems.length || /no tropical cyclone activity/i.test(fullText)) {
      return 'Aucune zone cyclonique significative signalée actuellement par le NHC pour le bassin Atlantique.';
    }

    return systems[0].summary;
  }

  private getRiskLevel(
    text: string,
    formationChance48Hours: number | null,
    formationChance7Days: number | null,
  ): NhcRiskLevel {
    const maxChance = Math.max(formationChance48Hours ?? 0, formationChance7Days ?? 0);

    if (/hurricane|tropical storm|tropical cyclone/i.test(text) || maxChance >= 60) {
      return 'high';
    }

    if (/disturbance|area of low pressure|formation chance|invest/i.test(text) || maxChance >= 20) {
      return 'watch';
    }

    return 'low';
  }

  private getRiskLabel(riskLevel: NhcRiskLevel): string {
    if (riskLevel === 'high') {
      return 'Surveillance cyclonique active';
    }

    if (riskLevel === 'watch') {
      return 'Zone tropicale à surveiller';
    }

    return 'Aucun signal cyclonique NHC';
  }

  private maxChance(chances: Array<number | null>): number | null {
    const values = chances.filter((chance): chance is number => chance !== null);
    return values.length ? Math.max(...values) : null;
  }

  private extractChance(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);

    if (!match) {
      return null;
    }

    const value = Number(match[1]);

    return Number.isNaN(value) ? null : value;
  }

  private getText(parent: Element | null, selector: string): string {
    return parent?.querySelector(selector)?.textContent?.trim() ?? '';
  }

  private cleanText(value: string): string {
    const document = new DOMParser().parseFromString(value, 'text/html');

    return (document.body.textContent ?? value).replace(/\s+/g, ' ').trim();
  }
}
