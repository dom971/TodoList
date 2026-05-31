import { Injectable, inject, signal } from '@angular/core';

import { SupabaseService } from '../core/supabase.service';
import { Scan } from './scan.model';

@Injectable({
  providedIn: 'root',
})
export class ScansService {
  private readonly supabase = inject(SupabaseService).client;

  readonly scans = signal<Scan[]>([]);
  readonly label = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  clear(): void {
    this.scans.set([]);
    this.label.set('');
    this.isLoading.set(false);
    this.isSaving.set(false);
    this.errorMessage.set('');
  }

  async loadScans(userId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    this.isLoading.set(false);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.scans.set((data ?? []) as Scan[]);
  }

  async saveScan(userId: string, value: string, format?: string): Promise<void> {
    this.isSaving.set(true);
    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('scans')
      .insert({
        user_id: userId,
        value,
        format: format ?? null,
        label: this.label().trim() || null,
      })
      .select()
      .single();

    this.isSaving.set(false);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.scans.update((scans) => [data as Scan, ...scans]);
    this.label.set('');
  }

  async deleteScan(id: number, userId: string): Promise<void> {
    this.errorMessage.set('');

    const { error } = await this.supabase
      .from('scans')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.scans.update((scans) => scans.filter((scan) => scan.id !== id));
  }
}
