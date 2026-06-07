import { Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { AuthService } from '../core/auth.service';
import { Note } from './note.model';
import { NotesService } from './notes.service';

@Component({
  selector: 'app-notes-board',
  imports: [FormsModule],
  templateUrl: './notes-board.component.html',
  styleUrl: './notes-board.component.scss',
})
export class NotesBoardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly notesService = inject(NotesService);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly noteCount = computed(() => this.notesService.notes().length);

  constructor() {
    effect(() => {
      const selectedId = Number(this.queryParamMap().get('selected'));

      if (!selectedId) {
        return;
      }

      const note = this.notesService.notes().find((currentNote) => currentNote.id === selectedId);

      if (!note) {
        return;
      }

      this.notesService.cancelEdit();
      this.notesService.selectedNoteId.set(note.id);
      this.scrollToSelectedItem('note', note.id);
    });
  }

  protected addNote(): Promise<void> {
    return this.withUser((userId) => this.notesService.addNote(userId));
  }

  protected saveNote(note: Note): Promise<void> {
    return this.withUser((userId) => this.notesService.saveNote(note, userId));
  }

  protected deleteNote(id: number): Promise<void> {
    return this.withUser((userId) => this.notesService.deleteNote(id, userId));
  }

  private async withUser(action: (userId: string) => Promise<void>): Promise<void> {
    const userId = this.auth.session()?.user.id;

    if (!userId) {
      return;
    }

    await action(userId);
  }

  private scrollToSelectedItem(prefix: string, id: number): void {
    setTimeout(() => {
      document.getElementById(`${prefix}-${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  }
}
