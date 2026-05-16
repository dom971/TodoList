import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Todo } from './todos/todo.model';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly newTodoTitle = signal('');
  protected readonly todos = signal<Todo[]>([
    { id: 1, title: 'Structurer le frontend Angular', completed: true },
    { id: 2, title: 'Creer la premiere interface Todo', completed: false },
    { id: 3, title: 'Brancher une API plus tard', completed: false },
  ]);

  protected readonly remainingCount = computed(
    () => this.todos().filter((todo) => !todo.completed).length,
  );

  protected readonly completedCount = computed(
    () => this.todos().filter((todo) => todo.completed).length,
  );

  protected addTodo(): void {
    const title = this.newTodoTitle().trim();

    if (!title) {
      return;
    }

    this.todos.update((todos) => [
      { id: Date.now(), title, completed: false },
      ...todos,
    ]);
    this.newTodoTitle.set('');
  }

  protected toggleTodo(id: number): void {
    this.todos.update((todos) =>
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  }

  protected deleteTodo(id: number): void {
    this.todos.update((todos) => todos.filter((todo) => todo.id !== id));
  }
}
