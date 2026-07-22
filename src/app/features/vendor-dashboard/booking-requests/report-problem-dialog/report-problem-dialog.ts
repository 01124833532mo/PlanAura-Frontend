import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { AppError } from '../../../../core/interfaces/api-response.model';

/**
 * Vendor-side "Report a problem", mirroring the client's dispute dialog on
 * event-plan-detail. Unlike the decline reason, this one is REQUIRED — the
 * server rejects a blank reason — so submit stays disabled until it's filled.
 */
@Component({
  selector: 'app-report-problem-dialog',
  standalone: true,
  imports: [FormsModule, AlertBanner, Button],
  templateUrl: './report-problem-dialog.html',
  styleUrl: './report-problem-dialog.css',
})
export class ReportProblemDialog {
  @Input() eventDate = '';
  @Input() clientName: string | null = null;
  @Input() saving = false;
  @Input() error: AppError | null = null;

  @Output() submitted = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  protected reason = '';
  protected touched = false;

  protected get invalid(): boolean {
    return this.reason.trim().length === 0;
  }

  protected handleBackdropClick(): void {
    if (!this.saving) {
      this.cancelled.emit();
    }
  }

  protected submit(): void {
    if (this.saving) {
      return;
    }
    this.touched = true;
    if (this.invalid) {
      return;
    }
    this.submitted.emit(this.reason.trim());
  }
}
