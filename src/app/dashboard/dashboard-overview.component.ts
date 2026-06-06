import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NotesService } from '../notes/notes.service';
import { PhotosService } from '../photos/photos.service';
import { ScansService } from '../scanner/scans.service';
import { TodosService } from '../todos/todos.service';

@Component({
  selector: 'app-dashboard-overview',
  imports: [RouterLink],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.scss',
})
export class DashboardOverviewComponent {
  protected readonly notesService = inject(NotesService);
  protected readonly photosService = inject(PhotosService);
  protected readonly scansService = inject(ScansService);
  protected readonly todosService = inject(TodosService);

  protected readonly remainingTodos = computed(
    () => this.todosService.todos().filter((todo) => !todo.completed).length,
  );

  protected readonly completedTodos = computed(
    () => this.todosService.todos().filter((todo) => todo.completed).length,
  );

  protected readonly notesCount = computed(() => this.notesService.notes().length);
  protected readonly photosCount = computed(() => this.photosService.photos().length);
  protected readonly scansCount = computed(() => this.scansService.scans().length);
  protected readonly latestScans = computed(() => this.scansService.scans().slice(0, 3));
}
