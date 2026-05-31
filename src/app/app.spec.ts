import { TestBed } from '@angular/core/testing';

import { App } from './app';
import { AuthService } from './core/auth.service';
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: TodosService, useValue: todosServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the authentication panel when signed out', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Personal Hub');
    expect(compiled.querySelector('h1')?.textContent).toContain('Connexion');
  });
});
