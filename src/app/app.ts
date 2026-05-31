import { Component, OnDestroy, OnInit, effect, inject } from '@angular/core';

import { AuthPanelComponent } from './auth/auth-panel.component';
import { AppNavigationService } from './core/app-navigation.service';
import { AuthService } from './core/auth.service';
import { TodoBoardComponent } from './todos/todo-board.component';
import { TodosService } from './todos/todos.service';

@Component({
  selector: 'app-root',
  imports: [AuthPanelComponent, TodoBoardComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly navigation = inject(AppNavigationService);
  private readonly todosService = inject(TodosService);

  constructor() {
    effect(() => {
      const session = this.auth.session();

      if (this.auth.isLoading()) {
        return;
      }

      if (!session) {
        this.todosService.clear();
        return;
      }

      void this.todosService.loadTodos(session.user.id);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.auth.initialize();
  }

  ngOnDestroy(): void {
    this.auth.destroy();
  }
}
