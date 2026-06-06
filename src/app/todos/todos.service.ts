import { Injectable, inject, signal } from '@angular/core';

import { SupabaseService } from '../core/supabase.service';
import { Todo } from './todo.model';

export type TodoFilter = 'all' | 'active' | 'completed';

@Injectable({
  providedIn: 'root',
})
export class TodosService {
  private readonly supabase = inject(SupabaseService).client;

  readonly todos = signal<Todo[]>([]);
  readonly newTodoTitle = signal('');
  readonly selectedTodoId = signal<number | null>(null);
  readonly editingTodoId = signal<number | null>(null);
  readonly editingTodoTitle = signal('');
  readonly filter = signal<TodoFilter>('all');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  clear(): void {
    this.todos.set([]);
    this.filter.set('all');
    this.selectedTodoId.set(null);
    this.isLoading.set(false);
    this.isSaving.set(false);
    this.cancelEdit();
  }

  async loadTodos(userId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    this.isLoading.set(false);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.todos.set((data ?? []) as Todo[]);
  }

  async addTodo(userId: string): Promise<void> {
    const title = this.newTodoTitle().trim();

    if (!title) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('todos')
      .insert({ title, user_id: userId })
      .select()
      .single();

    this.isSaving.set(false);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.todos.update((todos) => [data as Todo, ...todos]);
    this.newTodoTitle.set('');
  }

  async toggleTodo(todo: Todo, userId: string): Promise<void> {
    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('todos')
      .update({ completed: !todo.completed })
      .eq('id', todo.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.replaceTodo(data as Todo);
  }

  startEdit(todo: Todo): void {
    this.selectedTodoId.set(todo.id);
    this.editingTodoId.set(todo.id);
    this.editingTodoTitle.set(todo.title);
    this.errorMessage.set('');
  }

  cancelEdit(): void {
    this.editingTodoId.set(null);
    this.editingTodoTitle.set('');
  }

  async saveTodoTitle(todo: Todo, userId: string): Promise<void> {
    const title = this.editingTodoTitle().trim();

    if (!title || title === todo.title) {
      this.cancelEdit();
      return;
    }

    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('todos')
      .update({ title })
      .eq('id', todo.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.replaceTodo(data as Todo);
    this.cancelEdit();
  }

  async deleteTodo(id: number, userId: string): Promise<void> {
    this.errorMessage.set('');

    const { error } = await this.supabase
      .from('todos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.todos.update((todos) => todos.filter((todo) => todo.id !== id));

    if (this.selectedTodoId() === id) {
      this.selectedTodoId.set(null);
    }
  }

  selectTodo(todo: Todo): void {
    this.selectedTodoId.update((todoId) => (todoId === todo.id ? null : todo.id));
    this.cancelEdit();
  }

  closeSelection(): void {
    this.selectedTodoId.set(null);
    this.cancelEdit();
  }

  private replaceTodo(updatedTodo: Todo): void {
    this.todos.update((todos) =>
      todos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo)),
    );
  }
}
