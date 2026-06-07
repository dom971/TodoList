import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { SearchResult, SearchResultType } from './search-result.model';
import { SearchService } from './search.service';

@Component({
  selector: 'app-search-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss',
})
export class SearchPageComponent {
  protected readonly auth = inject(AuthService);
  protected readonly searchService = inject(SearchService);

  protected readonly resultCount = computed(() => this.searchService.results().length);
  protected readonly groupedResults = computed(() => [
    this.toGroup('todo', 'Tâches'),
    this.toGroup('note', 'Notes'),
    this.toGroup('scan', 'Scans'),
    this.toGroup('photo', 'Photos'),
  ]);

  protected search(): Promise<void> {
    const userId = this.auth.session()?.user.id;

    if (!userId) {
      return Promise.resolve();
    }

    return this.searchService.search(userId);
  }

  private toGroup(type: SearchResultType, label: string): SearchResultGroup {
    return {
      type,
      label,
      results: this.searchService.results().filter((result) => result.type === type),
    };
  }
}

interface SearchResultGroup {
  type: SearchResultType;
  label: string;
  results: SearchResult[];
}
