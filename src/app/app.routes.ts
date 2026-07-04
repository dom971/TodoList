import { Routes } from '@angular/router';

import { AuthPageComponent } from './auth/auth-page.component';
import { authGuard, guestGuard } from './core/auth.guard';
import { DashboardOverviewComponent } from './dashboard/dashboard-overview.component';
import { ComingSoonComponent } from './features/coming-soon.component';
import { NotesBoardComponent } from './notes/notes-board.component';
import { PhotosBoardComponent } from './photos/photos-board.component';
import { AppShellComponent } from './shell/app-shell.component';
import { TodoBoardComponent } from './todos/todo-board.component';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthPageComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'auth/reset-password',
    component: AuthPageComponent,
  },
  {
    path: 'app',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardOverviewComponent,
      },
      {
        path: 'todos',
        component: TodoBoardComponent,
      },
      {
        path: 'notes',
        component: NotesBoardComponent,
      },
      {
        path: 'photos',
        component: PhotosBoardComponent,
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./search/search-page.component').then((component) => component.SearchPageComponent),
      },
      {
        path: 'scanner',
        loadComponent: () =>
          import('./scanner/scanner-board.component').then(
            (component) => component.ScannerBoardComponent,
          ),
      },
      {
        path: 'solar',
        loadComponent: () =>
          import('./solar/solar-forecast.component').then(
            (component) => component.SolarForecastComponent,
          ),
      },
      {
        path: 'coming-soon',
        component: ComingSoonComponent,
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'app/dashboard',
  },
  {
    path: '**',
    redirectTo: 'app/dashboard',
  },
];
