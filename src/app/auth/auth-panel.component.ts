import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-auth-panel',
  imports: [FormsModule],
  templateUrl: './auth-panel.component.html',
  styleUrl: './auth-panel.component.scss',
})
export class AuthPanelComponent {
  protected readonly auth = inject(AuthService);

  protected submit(): Promise<void> {
    if (this.auth.mode() === 'reset-password') {
      return this.auth.requestPasswordReset();
    }

    if (this.auth.mode() === 'update-password') {
      return this.auth.updatePassword();
    }

    return this.auth.mode() === 'sign-in' ? this.auth.signIn() : this.auth.signUp();
  }

  protected toggleMode(): void {
    this.auth.switchMode(this.auth.mode() === 'sign-in' ? 'sign-up' : 'sign-in');
  }
}
