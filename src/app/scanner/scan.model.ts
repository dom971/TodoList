export interface Scan {
  id: number;
  user_id?: string;
  value: string;
  format?: string | null;
  label?: string | null;
  created_at?: string;
}
