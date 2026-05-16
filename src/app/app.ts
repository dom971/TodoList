import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SupabaseService } from './core/supabase.service';
import { Todo } from './todos/todo.model';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly supabase = inject(SupabaseService).client;

  protected readonly newTodoTitle = signal('');
  protected readonly todos = signal<Todo[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly editingTodoId = signal<number | null>(null);
  protected readonly editingTodoTitle = signal('');
  protected readonly errorMessage = signal('');

  protected readonly remainingCount = computed(
    () => this.todos().filter((todo) => !todo.completed).length,
  );

  protected readonly completedCount = computed(
    () => this.todos().filter((todo) => todo.completed).length,
  );

  async ngOnInit(): Promise<void> {
    await this.loadTodos();
  }

  protected async addTodo(): Promise<void> {
    const title = this.newTodoTitle().trim();

    if (!title) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('todos')
      .insert({ title })
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

  protected async toggleTodo(todo: Todo): Promise<void> {
    const completed = !todo.completed;

    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('todos')
      .update({ completed })
      .eq('id', todo.id)
      .select()
      .single();

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.todos.update((todos) =>
      todos.map((todo) =>
        todo.id === data.id ? (data as Todo) : todo,
      ),
    );
  }

  protected startEdit(todo: Todo): void {
    this.editingTodoId.set(todo.id);
    this.editingTodoTitle.set(todo.title);
    this.errorMessage.set('');
  }

  protected cancelEdit(): void {
    this.editingTodoId.set(null);
    this.editingTodoTitle.set('');
  }

  protected async saveTodoTitle(todo: Todo): Promise<void> {
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
      .select()
      .single();

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.todos.update((todos) =>
      todos.map((todo) =>
        todo.id === data.id ? (data as Todo) : todo,
      ),
    );
    this.cancelEdit();
  }

  protected async deleteTodo(id: number): Promise<void> {
    this.errorMessage.set('');

    const { error } = await this.supabase.from('todos').delete().eq('id', id);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.todos.update((todos) => todos.filter((todo) => todo.id !== id));
  }

  private async loadTodos(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    this.isLoading.set(false);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.todos.set((data ?? []) as Todo[]);
  }
}
