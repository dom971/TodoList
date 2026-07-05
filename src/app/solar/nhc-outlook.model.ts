export interface NhcOutlook {
  title: string;
  summary: string;
  publishedAt: string;
  sourceUrl: string;
  riskLevel: NhcRiskLevel;
  riskLabel: string;
  formationChance48Hours: number | null;
  formationChance7Days: number | null;
  systems: NhcSystem[];
}

export interface NhcSystem {
  title: string;
  summary: string;
  link: string;
  formationChance48Hours: number | null;
  formationChance7Days: number | null;
}

export type NhcRiskLevel = 'low' | 'watch' | 'high';
