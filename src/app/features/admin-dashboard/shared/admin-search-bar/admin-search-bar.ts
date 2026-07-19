import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

/** Debounced search input used at the top of every admin list page. */
@Component({
  selector: 'admin-search-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-search-bar.html',
  styleUrl: './admin-search-bar.css',
})
export class AdminSearchBar {
  @Input() placeholder = 'Search...';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe((term) => {
      this.search.emit(term);
    });
  }

  protected onInput(term: string): void {
    this.value = term;
    this.valueChange.emit(term);
    this.search$.next(term);
  }

  protected clear(): void {
    this.onInput('');
  }
}
