import { Component, Input } from '@angular/core';

/** Shimmering placeholder rows shown while a table/list is loading. */
@Component({
  selector: 'admin-skeleton-rows',
  standalone: true,
  templateUrl: './admin-skeleton.html',
  styleUrl: './admin-skeleton.css',
})
export class AdminSkeletonRows {
  @Input() rows = 5;
  @Input() columns = 4;

  protected get rowArray(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }

  protected get columnArray(): number[] {
    return Array.from({ length: this.columns }, (_, i) => i);
  }
}
