import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppError } from '../../../../core/interfaces/api-response.model';

/**
 * Modal requiring the admin to enter a rejection reason before a vendor
 * verification request can be rejected. Submit stays disabled until a
 * non-blank reason is entered (per RejectVendorDto's [Required] constraint).
 */
@Component({
  selector: 'app-reject-vendor-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reject-vendor-dialog.html',
  styleUrl: './reject-vendor-dialog.css',
})
export class RejectVendorDialog {
  @Input() vendorName = '';
  @Input() saving = false;
  @Input() error: AppError | null = null;

  @Output() submitted = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  protected reason = '';

  protected get canSubmit(): boolean {
    return this.reason.trim().length > 0 && !this.saving;
  }

  protected handleBackdropClick(): void {
    if (!this.saving) {
      this.cancelled.emit();
    }
  }

  protected submit(): void {
    if (!this.canSubmit) {
      return;
    }
    this.submitted.emit(this.reason.trim());
  }
}
