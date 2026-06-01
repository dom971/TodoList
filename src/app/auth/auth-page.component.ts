import { Component, OnInit, inject } from '@angular/core';

import { AuthPanelComponent } from './auth-panel.component';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth-page',
  imports: [AuthPanelComponent],
  template: `
    <main class="auth-page">
      <section class="auth-shell" aria-labelledby="auth-title">
        <app-auth-panel />
      </section>
    </main>
  `,
  styles: `
    .auth-page {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 32px 16px;
      background:
        linear-gradient(135deg, var(--app-bg-accent-a), transparent 32%),
        linear-gradient(315deg, var(--app-bg-accent-b), transparent 34%),
        var(--app-bg);
    }

    .auth-shell {
      width: min(100%, 520px);
      padding: 28px;
      border: 1px solid var(--app-border);
      border-radius: 8px;
      background: var(--app-surface-strong);
      box-shadow: 0 24px 60px var(--app-shadow);
    }

    @media (max-width: 640px) {
      .auth-page {
        align-items: start;
        padding: 18px 12px;
      }

      .auth-shell {
        padding: 18px;
      }
    }
  `,
})
export class AuthPageComponent implements OnInit {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    if (window.location.pathname.includes('/auth/reset-password')) {
      this.auth.switchMode('update-password');
      this.auth.statusMessage.set('Choisis ton nouveau mot de passe.');
    }
  }
}
