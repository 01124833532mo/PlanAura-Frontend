import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Button } from '../button/button';

export type ConfirmDialogVariant = 'primary' | 'danger';

/**
 * Generic modal confirmation dialog built on the shared .modal-backdrop /
 * .modal-card chrome (see styles.css). Used wherever an action needs an
 * explicit "are you sure?" step before it fires, e.g. approving a vendor.
 */
@Component({
  selector: 'ui-confirm-dialog',
  standalone: true,
  imports: [Button],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  @Input() icon = 'help';
  @Input() title = 'Are you sure?';
  @Input() message = '';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() variant: ConfirmDialogVariant = 'primary';
  @Input() loading = false;
  /** Optional inline error shown above the actions, e.g. after a failed API call. */
  @Input() errorMessage: string | null = null;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  protected handleBackdropClick(): void {
    if (!this.loading) {
      this.cancelled.emit();
    }
  }
}
