import { Injectable, signal } from '@angular/core';

import { NhcOutlook, NhcRiskLevel, NhcSystem } from './nhc-outlook.model';

const NHC_ATLANTIC_OUTLOOK_SOURCES: NhcSource[] = [
  { url: '/nhc/xml/TWOAT.xml', type: 'xml' },
  { url: '/nhc/text/MIATWOAT.shtml', type: 'text' },
  { url: '/nhc/gtwo.xml', type: 'xml' },
];
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
      this.outlook.set(await this.fetchFirstReadableOutlook());
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Bulletin NHC indisponible.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private async fetchFirstReadableOutlook(): Promise<NhcOutlook> {
    for (const source of NHC_ATLANTIC_OUTLOOK_SOURCES) {
      try {
        const response = await fetch(source.url);

        if (!response.ok) {
          continue;
        }

        const text = await response.text();

        if (source.type === 'xml') {
          const document = this.parseXml(text);

          if (document) {
            return this.toOutlook(document);
          }
        } else {
          const outlook = this.toTextOutlook(text);

          if (outlook) {
            return outlook;
          }
        }
      } catch {
        continue;
      }
    }

    throw new Error('Bulletin NHC indisponible. Verifie que npm.cmd start a bien ete relance.');
  }

  private parseXml(xml: string): Document | null {
    const normalizedXml = xml
      .replace(/&nbsp;/g, ' ')
      .replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-f]+;)/gi, '&amp;');
    const document = new DOMParser().parseFromString(normalizedXml, 'application/xml');

    return document.querySelector('parsererror') ? null : document;
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

  private toTextOutlook(html: string): NhcOutlook | null {
    const text = this.cleanText(html);

    if (!/tropical weather outlook|national hurricane center|nhc/i.test(text)) {
      return null;
    }

    const summary = this.getTextSummary(text);
    const formationChance48Hours = this.extractChance(
      text,
      /48 hours?.*?(?:near\s+)?(\d{1,3})\s*percent/i,
    );
    const formationChance7Days = this.extractChance(
      text,
      /7 days?.*?(?:near\s+)?(\d{1,3})\s*percent/i,
    );
    const riskLevel = this.getRiskLevel(text, formationChance48Hours, formationChance7Days);

    return {
      title: 'Tropical Weather Outlook Atlantique',
      summary,
      publishedAt: this.extractPublishedAt(text),
      sourceUrl: NHC_ATLANTIC_PAGE_URL,
      riskLevel,
      riskLabel: this.getRiskLabel(riskLevel),
      formationChance48Hours,
      formationChance7Days,
      systems: [
        {
          title: 'Bulletin texte NHC',
          summary,
          link: NHC_ATLANTIC_PAGE_URL,
          formationChance48Hours,
          formationChance7Days,
        },
      ],
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
      formationChance48Hours: this.extractChance(
        summary,
        /48 hours?.*?(?:near\s+)?(\d{1,3})\s*percent/i,
      ),
      formationChance7Days: this.extractChance(
        summary,
        /7 days?.*?(?:near\s+)?(\d{1,3})\s*percent/i,
      ),
    };
  }

  private getSummary(systems: NhcSystem[], fullText: string): string {
    if (
      !systems.length ||
      /no tropical cyclone activity|tropical cyclone formation is not expected/i.test(fullText)
    ) {
      return 'Aucune zone cyclonique significative signalee actuellement par le NHC pour le bassin Atlantique.';
    }

    return systems[0].summary;
  }

  private getRiskLevel(
    text: string,
    formationChance48Hours: number | null,
    formationChance7Days: number | null,
  ): NhcRiskLevel {
    const maxChance = Math.max(formationChance48Hours ?? 0, formationChance7Days ?? 0);

    if (
      !/formation is not expected/i.test(text) &&
      (/hurricane|tropical storm|tropical cyclone/i.test(text) || maxChance >= 60)
    ) {
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
      return 'Zone tropicale a surveiller';
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

  private getTextSummary(text: string): string {
    const formationIndex = text.search(/tropical cyclone formation is not expected/i);

    if (formationIndex >= 0) {
      return 'Aucune formation cyclonique tropicale n est attendue dans les 7 prochains jours selon le NHC.';
    }

    const outlookIndex = text.search(/for the north atlantic/i);
    const start = outlookIndex >= 0 ? outlookIndex : 0;

    return text.slice(start, start + 520).trim();
  }

  private extractPublishedAt(text: string): string {
    const match = text.match(
      /\b\d{1,4}\s+(?:AM|PM)\s+[A-Z]{3,4}\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}\b/,
    );

    return match?.[0] ?? '';
  }
}

interface NhcSource {
  url: string;
  type: 'xml' | 'text';
}
