import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Session } from '@supabase/supabase-js';

import { SupabaseService } from './core/supabase.service';
import { Todo } from './todos/todo.model';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly supabase = inject(SupabaseService).client;
  private authSubscription?: { unsubscribe: () => void };

  protected readonly session = signal<Session | null>(null);
  protected readonly authEmail = signal('');
  protected readonly authPassword = signal('');
  protected readonly authMode = signal<'sign-in' | 'sign-up'>('sign-in');
  protected readonly authMessage = signal('');
  protected readonly isAuthLoading = signal(true);
  protected readonly isAuthSubmitting = signal(false);
  protected readonly newTodoTitle = signal('');
  protected readonly todos = signal<Todo[]>([]);
  protected readonly isLoading = signal(false);
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

  protected readonly userEmail = computed(() => this.session()?.user.email ?? '');

  async ngOnInit(): Promise<void> {
    const { data, error } = await this.supabase.auth.getSession();

    if (error) {
      this.errorMessage.set(error.message);
    }

    this.session.set(data.session);
    this.isAuthLoading.set(false);

    if (data.session) {
      await this.loadTodos();
    }

    const { data: authListener } = this.supabase.auth.onAuthStateChange(
      (_event, session) => {
        this.session.set(session);

        if (session) {
          void this.loadTodos();
        } else {
          this.todos.set([]);
          this.isLoading.set(false);
        }
      },
    );

    this.authSubscription = authListener.subscription;
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  protected async signIn(): Promise<void> {
    await this.submitAuth('sign-in');
  }

  protected async signUp(): Promise<void> {
    await this.submitAuth('sign-up');
  }

  protected async signOut(): Promise<void> {
    this.errorMessage.set('');
    await this.supabase.auth.signOut();
  }

  protected switchAuthMode(mode: 'sign-in' | 'sign-up'): void {
    this.authMode.set(mode);
    this.authMessage.set('');
    this.errorMessage.set('');
  }

  protected async addTodo(): Promise<void> {
    const title = this.newTodoTitle().trim();
    const userId = this.session()?.user.id;

    if (!title || !userId) {
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

  protected async toggleTodo(todo: Todo): Promise<void> {
    const completed = !todo.completed;
    const userId = this.session()?.user.id;

    this.errorMessage.set('');

    if (!userId) {
      return;
    }

    const { data, error } = await this.supabase
      .from('todos')
      .update({ completed })
      .eq('id', todo.id)
      .eq('user_id', userId)
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
    const userId = this.session()?.user.id;

    if (!title || title === todo.title || !userId) {
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

    this.todos.update((todos) =>
      todos.map((todo) =>
        todo.id === data.id ? (data as Todo) : todo,
      ),
    );
    this.cancelEdit();
  }

  protected async deleteTodo(id: number): Promise<void> {
    const userId = this.session()?.user.id;

    this.errorMessage.set('');

    if (!userId) {
      return;
    }

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
  }

  private async loadTodos(): Promise<void> {
    const userId = this.session()?.user.id;

    if (!userId) {
      this.todos.set([]);
      return;
    }

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

  private async submitAuth(mode: 'sign-in' | 'sign-up'): Promise<void> {
    const email = this.authEmail().trim();
    const password = this.authPassword();

    if (!email || !password) {
      this.errorMessage.set('Renseigne un email et un mot de passe.');
      return;
    }

    this.isAuthSubmitting.set(true);
    this.errorMessage.set('');
    this.authMessage.set('');

    const { error } =
      mode === 'sign-in'
        ? await this.supabase.auth.signInWithPassword({ email, password })
        : await this.supabase.auth.signUp({ email, password });

    this.isAuthSubmitting.set(false);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    if (mode === 'sign-up') {
      this.authMessage.set('Compte cree. Verifie tes emails si Supabase demande une confirmation.');
    }
  }
}
