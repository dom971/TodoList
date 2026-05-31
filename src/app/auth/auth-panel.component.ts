import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth-panel',
  imports: [FormsModule],
  templateUrl: './auth-panel.component.html',
  styleUrl: './auth-panel.component.scss',
})
export class AuthPanelComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected async submit(): Promise<void> {
    if (this.auth.mode() === 'reset-password') {
      await this.auth.requestPasswordReset();
      return;
    }

    if (this.auth.mode() === 'update-password') {
      await this.auth.updatePassword();
      return;
    }

    if (this.auth.mode() === 'sign-in') {
      await this.auth.signIn();

      if (this.auth.session()) {
        await this.router.navigate(['/app/todos']);
      }

      return;
    }

    await this.auth.signUp();
  }

  protected toggleMode(): void {
    this.auth.switchMode(this.auth.mode() === 'sign-in' ? 'sign-up' : 'sign-in');
  }
}
