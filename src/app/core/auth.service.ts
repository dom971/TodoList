import { Injectable, inject, signal } from '@angular/core';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';

export type AuthMode = 'sign-in' | 'sign-up' | 'reset-password' | 'update-password';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private authSubscription?: { unsubscribe: () => void };
  private initializePromise?: Promise<void>;

  readonly session = signal<Session | null>(null);
  readonly email = signal('');
  readonly password = signal('');
  readonly newPassword = signal('');
  readonly mode = signal<AuthMode>('sign-in');
  readonly isLoading = signal(true);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly statusMessage = signal('');

  async initialize(): Promise<void> {
    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = this.initializeSession();
    return this.initializePromise;
  }

  private async initializeSession(): Promise<void> {
    const { data, error } = await this.supabase.auth.getSession();

    if (error) {
      this.errorMessage.set(error.message);
    }

    this.session.set(data.session);
    this.isLoading.set(false);

    const { data: authListener } = this.supabase.auth.onAuthStateChange(
      (event, session) => {
        this.handleAuthEvent(event);
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

  async requestPasswordReset(): Promise<void> {
    const email = this.email().trim();

    if (!email) {
      this.errorMessage.set('Renseigne ton email pour recevoir le lien.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    this.isSubmitting.set(false);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.statusMessage.set('Email envoye. Ouvre le lien recu pour choisir un nouveau mot de passe.');
  }

  async updatePassword(): Promise<void> {
    const password = this.newPassword();

    if (password.length < 6) {
      this.errorMessage.set('Choisis un mot de passe de 6 caracteres minimum.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    const { error } = await this.supabase.auth.updateUser({ password });

    this.isSubmitting.set(false);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.newPassword.set('');
    this.mode.set('sign-in');
    this.statusMessage.set('Mot de passe mis a jour. Tu peux te connecter.');
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

  private handleAuthEvent(event: AuthChangeEvent): void {
    if (event === 'PASSWORD_RECOVERY') {
      this.mode.set('update-password');
      this.errorMessage.set('');
      this.statusMessage.set('Choisis ton nouveau mot de passe.');
    }
  }
}
