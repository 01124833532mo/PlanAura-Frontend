import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { AppError } from '../../../../core/interfaces/api-response.model';

/**
 * Modal letting a vendor decline a booking request. Unlike the admin
 * verification reject, the reason is OPTIONAL (RejectBookingRequestDto.Reason
 * is nullable), so submit stays enabled even with a blank reason.
 */
@Component({
  selector: 'app-reject-booking-dialog',
  standalone: true,
  imports: [FormsModule, AlertBanner, Button],
  templateUrl: './reject-booking-dialog.html',
  styleUrl: './reject-booking-dialog.css',
})
export class RejectBookingDialog {
  @Input() eventDate = '';
  @Input() saving = false;
  @Input() error: AppError | null = null;

  @Output() submitted = new EventEmitter<string | undefined>();
  @Output() cancelled = new EventEmitter<void>();

  protected reason = '';

  protected handleBackdropClick(): void {
    if (!this.saving) {
      this.cancelled.emit();
    }
  }

  protected submit(): void {
    if (this.saving) {
      return;
    }
    const trimmed = this.reason.trim();
    this.submitted.emit(trimmed.length > 0 ? trimmed : undefined);
  }
}
