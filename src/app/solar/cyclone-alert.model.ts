export interface CycloneAlert {
  label: string;
  detail: string;
  level: CycloneAlertLevel;
  sourceUrl: string;
  checkedAt: string;
}

export type CycloneAlertLevel = 'clear' | 'watch' | 'alert';
