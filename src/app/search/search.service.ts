import { Injectable, inject, signal } from '@angular/core';

import { SupabaseService } from '../core/supabase.service';
import { Note } from '../notes/note.model';
import { Photo } from '../photos/photo.model';
import { Scan } from '../scanner/scan.model';
import { Todo } from '../todos/todo.model';
import { SearchResult } from './search-result.model';

const SEARCH_LIMIT = 20;

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private readonly supabase = inject(SupabaseService).client;

  readonly query = signal('');
  readonly results = signal<SearchResult[]>([]);
  readonly isSearching = signal(false);
  readonly errorMessage = signal('');

  clear(): void {
    this.query.set('');
    this.results.set([]);
    this.isSearching.set(false);
    this.errorMessage.set('');
  }

  async search(userId: string): Promise<void> {
    const query = this.query().trim();

    if (!query) {
      this.results.set([]);
      this.errorMessage.set('');
      return;
    }

    this.isSearching.set(true);
    this.errorMessage.set('');

    try {
      const [todos, notes, scans, photos] = await Promise.all([
        this.searchTodos(userId, query),
        this.searchNotes(userId, query),
        this.searchScans(userId, query),
        this.searchPhotos(userId, query),
      ]);

      this.results.set(
        [...todos, ...notes, ...scans, ...photos].sort((first, second) =>
          (second.created_at ?? '').localeCompare(first.created_at ?? ''),
        ),
      );
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Recherche impossible.');
    } finally {
      this.isSearching.set(false);
    }
  }

  private async searchTodos(userId: string, query: string): Promise<SearchResult[]> {
    const { data, error } = await this.supabase
      .from('todos')
      .select('id,title,completed,created_at')
      .eq('user_id', userId)
      .ilike('title', this.toPattern(query))
      .order('created_at', { ascending: false })
      .limit(SEARCH_LIMIT);

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as Todo[]).map((todo) => ({
      id: todo.id,
      type: 'todo',
      title: todo.title,
      description: todo.completed ? 'Tâche terminée' : 'Tâche à faire',
      route: '/app/todos',
      created_at: todo.created_at,
    }));
  }

  private async searchNotes(userId: string, query: string): Promise<SearchResult[]> {
    const [byTitle, byContent] = await Promise.all([
      this.searchNotesColumn(userId, query, 'title'),
      this.searchNotesColumn(userId, query, 'content'),
    ]);

    return this.uniqueById([...byTitle, ...byContent]).map((note) => ({
      id: note.id,
      type: 'note',
      title: note.title,
      description: note.content || 'Note sans contenu',
      route: '/app/notes',
      created_at: note.created_at,
    }));
  }

  private async searchScans(userId: string, query: string): Promise<SearchResult[]> {
    const [byValue, byLabel, byFormat] = await Promise.all([
      this.searchScansColumn(userId, query, 'value'),
      this.searchScansColumn(userId, query, 'label'),
      this.searchScansColumn(userId, query, 'format'),
    ]);

    return this.uniqueById([...byValue, ...byLabel, ...byFormat]).map((scan) => ({
      id: scan.id,
      type: 'scan',
      title: scan.label || scan.format || 'Scan',
      description: scan.value,
      route: '/app/scanner',
      created_at: scan.created_at,
    }));
  }

  private async searchPhotos(userId: string, query: string): Promise<SearchResult[]> {
    const [byTitle, byDescription] = await Promise.all([
      this.searchPhotosColumn(userId, query, 'title'),
      this.searchPhotosColumn(userId, query, 'description'),
    ]);

    return this.uniqueById([...byTitle, ...byDescription]).map((photo) => ({
      id: photo.id,
      type: 'photo',
      title: photo.title || 'Photo sans titre',
      description: photo.description || 'Photo',
      route: '/app/photos',
      created_at: photo.created_at,
    }));
  }

  private async searchNotesColumn(
    userId: string,
    query: string,
    column: 'title' | 'content',
  ): Promise<Note[]> {
    const { data, error } = await this.supabase
      .from('notes')
      .select('id,title,content,created_at')
      .eq('user_id', userId)
      .ilike(column, this.toPattern(query))
      .order('created_at', { ascending: false })
      .limit(SEARCH_LIMIT);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Note[];
  }

  private async searchScansColumn(
    userId: string,
    query: string,
    column: 'value' | 'label' | 'format',
  ): Promise<Scan[]> {
    const { data, error } = await this.supabase
      .from('scans')
      .select('id,value,format,label,created_at')
      .eq('user_id', userId)
      .ilike(column, this.toPattern(query))
      .order('created_at', { ascending: false })
      .limit(SEARCH_LIMIT);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Scan[];
  }

  private async searchPhotosColumn(
    userId: string,
    query: string,
    column: 'title' | 'description',
  ): Promise<Photo[]> {
    const { data, error } = await this.supabase
      .from('photos')
      .select('id,title,description,created_at')
      .eq('user_id', userId)
      .ilike(column, this.toPattern(query))
      .order('created_at', { ascending: false })
      .limit(SEARCH_LIMIT);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as Photo[];
  }

  private uniqueById<T extends { id: number }>(items: T[]): T[] {
    return Array.from(new Map(items.map((item) => [item.id, item])).values());
  }

  private toPattern(query: string): string {
    return `%${query}%`;
  }
}
