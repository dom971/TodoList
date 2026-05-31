import { Component } from '@angular/core';

import { AuthPanelComponent } from './auth-panel.component';

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
        linear-gradient(135deg, rgba(37, 99, 235, 0.13), transparent 32%),
        linear-gradient(315deg, rgba(20, 184, 166, 0.15), transparent 34%),
        #f7f8fb;
    }

    .auth-shell {
      width: min(100%, 520px);
      padding: 28px;
      border: 1px solid #e4e7ec;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
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
export class AuthPageComponent {}
