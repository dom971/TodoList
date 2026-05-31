import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

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

  protected readonly noteCount = computed(() => this.notesService.notes().length);

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
}
