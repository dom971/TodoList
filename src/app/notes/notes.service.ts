import { Injectable, inject, signal } from '@angular/core';

import { SupabaseService } from '../core/supabase.service';
import { Note } from './note.model';

@Injectable({
  providedIn: 'root',
})
export class NotesService {
  private readonly supabase = inject(SupabaseService).client;

  readonly notes = signal<Note[]>([]);
  readonly title = signal('');
  readonly content = signal('');
  readonly selectedNoteId = signal<number | null>(null);
  readonly editingNoteId = signal<number | null>(null);
  readonly editingTitle = signal('');
  readonly editingContent = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');

  clear(): void {
    this.notes.set([]);
    this.title.set('');
    this.content.set('');
    this.selectedNoteId.set(null);
    this.cancelEdit();
    this.isLoading.set(false);
    this.isSaving.set(false);
  }

  async loadNotes(userId: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    this.isLoading.set(false);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.notes.set((data ?? []) as Note[]);
  }

  async addNote(userId: string): Promise<void> {
    const title = this.title().trim();
    const content = this.content().trim();

    if (!title) {
      this.errorMessage.set('Ajoute un titre pour créer une note.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('notes')
      .insert({ title, content, user_id: userId })
      .select()
      .single();

    this.isSaving.set(false);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.notes.update((notes) => [data as Note, ...notes]);
    this.title.set('');
    this.content.set('');
  }

  startEdit(note: Note): void {
    this.selectedNoteId.set(note.id);
    this.editingNoteId.set(note.id);
    this.editingTitle.set(note.title);
    this.editingContent.set(note.content);
    this.errorMessage.set('');
  }

  cancelEdit(): void {
    this.editingNoteId.set(null);
    this.editingTitle.set('');
    this.editingContent.set('');
  }

  async saveNote(note: Note, userId: string): Promise<void> {
    const title = this.editingTitle().trim();
    const content = this.editingContent().trim();

    if (!title) {
      this.errorMessage.set('Le titre de la note est obligatoire.');
      return;
    }

    if (title === note.title && content === note.content) {
      this.cancelEdit();
      return;
    }

    this.errorMessage.set('');

    const { data, error } = await this.supabase
      .from('notes')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', note.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.notes.update((notes) =>
      notes.map((currentNote) => (currentNote.id === data.id ? (data as Note) : currentNote)),
    );
    this.cancelEdit();
  }

  async deleteNote(id: number, userId: string): Promise<void> {
    this.errorMessage.set('');

    const { error } = await this.supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      this.errorMessage.set(error.message);
      return;
    }

    this.notes.update((notes) => notes.filter((note) => note.id !== id));

    if (this.selectedNoteId() === id) {
      this.selectedNoteId.set(null);
    }
  }

  selectNote(note: Note): void {
    this.selectedNoteId.update((noteId) => (noteId === note.id ? null : note.id));
    this.cancelEdit();
  }

  closeSelection(): void {
    this.selectedNoteId.set(null);
    this.cancelEdit();
  }
}
