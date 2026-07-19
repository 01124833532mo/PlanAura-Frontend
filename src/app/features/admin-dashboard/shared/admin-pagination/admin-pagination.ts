import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Page/of-N control used at the bottom of every admin table. */
@Component({
  selector: 'admin-pagination',
  standalone: true,
  templateUrl: './admin-pagination.html',
  styleUrl: './admin-pagination.css',
})
export class AdminPagination {
  @Input({ required: true }) page = 1;
  @Input({ required: true }) pageSize = 20;
  @Input({ required: true }) totalCount = 0;
  @Output() pageChange = new EventEmitter<number>();

  protected get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  protected get rangeStart(): number {
    return this.totalCount === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  protected get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  protected goTo(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) {
      return;
    }
    this.pageChange.emit(page);
  }
}
