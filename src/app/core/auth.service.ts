import { Injectable, inject, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';

export type AuthMode = 'sign-in' | 'sign-up';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private authSubscription?: { unsubscribe: () => void };

  readonly session = signal<Session | null>(null);
  readonly email = signal('');
  readonly password = signal('');
  readonly mode = signal<AuthMode>('sign-in');
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly statusMessage = signal('');

  async initialize(): Promise<void> {
    const { data, error } = await this.supabase.auth.getSession();

    if (error) {
      this.errorMessage.set(error.message);
    }

    this.session.set(data.session);
    this.isLoading.set(false);

    const { data: authListener } = this.supabase.auth.onAuthStateChange(
      (_event, session) => {
        this.session.set(session);
      },
    );

    this.authSubscription = authListener.subscription;
  }

  destroy(): void {
    this.authSubscription?.unsubscribe();
  }

  switchMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.errorMessage.set('');
    this.statusMessage.set('');
  }

  async signIn(): Promise<void> {
    await this.submit('sign-in');
  }

  async signUp(): Promise<void> {
    await this.submit('sign-up');
  }

  async signOut(): Promise<void> {
    this.errorMessage.set('');
    this.statusMessage.set('');
    await this.supabase.auth.signOut();
  }

  private async submit(mode: AuthMode): Promise<void> {
    const email = this.email().trim();
    const password = this.password();

    if (!email || !password) {
      this.errorMessage.set('Renseigne un email et un mot de passe.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    const { error } =
      mode === 'sign-in'
        ? await this.supabase.auth.signInWithPassword({ email, password })
        : await this.supabase.auth.signUp({ email, password });

    this.isSubmitting.set(false);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    if (mode === 'sign-up') {
      this.statusMessage.set('Compte cree. Verifie tes emails pour confirmer ton inscription.');
    }
  }
}
