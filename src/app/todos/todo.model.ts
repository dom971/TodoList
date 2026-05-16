export interface Todo {
  id: number;
  user_id?: string;
  title: string;
  completed: boolean;
  created_at?: string;
}
