export type SearchResultType = 'todo' | 'note' | 'scan' | 'photo';

export interface SearchResult {
  id: number;
  type: SearchResultType;
  title: string;
  description: string;
  route: string;
  created_at?: string;
}
