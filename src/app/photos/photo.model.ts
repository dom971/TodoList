export interface Photo {
  id: number;
  user_id?: string;
  storage_path: string;
  title?: string | null;
  description?: string | null;
  created_at?: string;
  signedUrl?: string;
}
