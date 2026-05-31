import { Injectable, signal } from '@angular/core';

export type AppView = 'todos' | 'coming-soon';

@Injectable({
  providedIn: 'root',
})
export class AppNavigationService {
  readonly currentView = signal<AppView>('todos');

  open(view: AppView): void {
    this.currentView.set(view);
  }
}
