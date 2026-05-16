import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { SupabaseService } from './core/supabase.service';

describe('App', () => {
  const supabaseMock = {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: SupabaseService,
          useValue: { client: supabaseMock },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the todo application', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Mes taches');
    expect(compiled.textContent).toContain('Aucune tache pour le moment.');
  });
});
