import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { App } from './app';
import { AuthService } from './core/auth.service';
import { NotesService } from './notes/notes.service';
import { ScansService } from './scanner/scans.service';
import { TodosService } from './todos/todos.service';

describe('App', () => {
  const authServiceMock = {
    session: () => null,
    isLoading: () => false,
    initialize: () => Promise.resolve(),
    destroy: () => undefined,
  };

  const todosServiceMock = {
    clear: () => undefined,
    loadTodos: () => Promise.resolve(),
  };
  const notesServiceMock = {
    clear: () => undefined,
    loadNotes: () => Promise.resolve(),
  };
  const scansServiceMock = {
    clear: () => undefined,
    loadScans: () => Promise.resolve(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotesService, useValue: notesServiceMock },
        { provide: ScansService, useValue: scansServiceMock },
        { provide: TodosService, useValue: todosServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render a router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
