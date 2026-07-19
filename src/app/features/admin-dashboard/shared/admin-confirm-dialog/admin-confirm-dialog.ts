import { Component, EventEmitter, Input, Output } from '@angular/core';

export type AdminConfirmVariant = 'primary' | 'danger';

/** Admin-themed confirmation modal — approve/reject/refund/suspend/etc. all funnel through this. */
@Component({
  selector: 'admin-confirm-dialog',
  standalone: true,
  templateUrl: './admin-confirm-dialog.html',
  styleUrl: './admin-confirm-dialog.css',
})
export class AdminConfirmDialog {
  @Input() icon = 'help';
  @Input() title = 'Are you sure?';
  @Input() message = '';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() variant: AdminConfirmVariant = 'primary';
  @Input() loading = false;
  @Input() errorMessage: string | null = null;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  protected handleBackdropClick(): void {
    if (!this.loading) {
      this.cancelled.emit();
    }
  }
}
