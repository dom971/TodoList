import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../core/auth.service';
import { Todo } from './todo.model';
import { TodosService } from './todos.service';

@Component({
  selector: 'app-todo-board',
  imports: [FormsModule],
  templateUrl: './todo-board.component.html',
  styleUrl: './todo-board.component.scss',
})
export class TodoBoardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly todosService = inject(TodosService);

  protected readonly remainingCount = computed(
    () => this.todosService.todos().filter((todo) => !todo.completed).length,
  );

  protected readonly completedCount = computed(
    () => this.todosService.todos().filter((todo) => todo.completed).length,
  );

  protected readonly filteredTodos = computed(() => {
    const todos = this.todosService.todos();

    switch (this.todosService.filter()) {
      case 'active':
        return todos.filter((todo) => !todo.completed);
      case 'completed':
        return todos.filter((todo) => todo.completed);
      default:
        return todos;
    }
  });

  protected readonly emptyTitle = computed(() => {
    switch (this.todosService.filter()) {
      case 'active':
        return 'Aucune tâche à faire.';
      case 'completed':
        return 'Aucune tâche terminée.';
      default:
        return 'Aucune tâche pour le moment.';
    }
  });

  protected readonly userEmail = computed(() => this.auth.session()?.user.email ?? '');
  protected readonly userId = computed(() => this.auth.session()?.user.id ?? '');

  protected addTodo(): Promise<void> {
    return this.withUser((userId) => this.todosService.addTodo(userId));
  }

  protected toggleTodo(todo: Todo): Promise<void> {
    return this.withUser((userId) => this.todosService.toggleTodo(todo, userId));
  }

  protected saveTodoTitle(todo: Todo): Promise<void> {
    return this.withUser((userId) => this.todosService.saveTodoTitle(todo, userId));
  }

  protected deleteTodo(id: number): Promise<void> {
    return this.withUser((userId) => this.todosService.deleteTodo(id, userId));
  }

  private async withUser(action: (userId: string) => Promise<void>): Promise<void> {
    const userId = this.auth.session()?.user.id;

    if (!userId) {
      return;
    }

    await action(userId);
  }
}
