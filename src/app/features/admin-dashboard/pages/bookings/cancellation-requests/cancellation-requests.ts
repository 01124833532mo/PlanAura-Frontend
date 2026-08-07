import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminBookingService } from '../../../../../core/services/admin-booking.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import { CancellationRequestListItem } from '../../../../../core/interfaces/admin-booking.model';
import { AdminEmptyState } from '../../../shared/admin-empty-state/admin-empty-state';
import { AdminErrorState } from '../../../shared/admin-error-state/admin-error-state';
import { AdminSkeletonRows } from '../../../shared/admin-skeleton/admin-skeleton';

/**
 * The admin-approval queue for client-requested cancellations (BookingStatus.CancellationRequested).
 * Nothing is released or refunded until the admin approves here — see
 * AdminBookingService.ApproveCancellationAsync / RejectCancellationAsync on the backend.
 */
@Component({
  selector: 'app-cancellation-requests',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, AdminEmptyState, AdminErrorState, AdminSkeletonRows],
  templateUrl: './cancellation-requests.html',
  styleUrl: './cancellation-requests.css',
})
export class CancellationRequests implements OnInit {
  private readonly adminBookingService = inject(AdminBookingService);

  protected readonly requests = signal<CancellationRequestListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  // Review modal (shared for approve/reject) for one request at a time.
  protected readonly reviewTarget = signal<CancellationRequestListItem | null>(null);
  protected readonly reviewMode = signal<'approve' | 'reject' | null>(null);
  protected readonly reviewAmount = signal<number | null>(null);
  protected readonly reviewNote = signal('');
  protected readonly reviewSubmitting = signal(false);
  protected readonly reviewError = signal<AppError | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminBookingService.getCancellationRequests().subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  protected openApprove(request: CancellationRequestListItem): void {
    this.reviewTarget.set(request);
    this.reviewMode.set('approve');
    this.reviewAmount.set(request.cancellationRefundAmount);
    this.reviewNote.set('');
    this.reviewError.set(null);
  }

  protected openReject(request: CancellationRequestListItem): void {
    this.reviewTarget.set(request);
    this.reviewMode.set('reject');
    this.reviewAmount.set(null);
    this.reviewNote.set('');
    this.reviewError.set(null);
  }

  protected closeReview(): void {
    this.reviewTarget.set(null);
    this.reviewMode.set(null);
  }

  protected submitReview(): void {
    const target = this.reviewTarget();
    const mode = this.reviewMode();
    if (!target || !mode) {
      return;
    }

    if (mode === 'reject' && this.reviewNote().trim() === '') {
      this.reviewError.set({ status: 400, message: 'A note is required to reject a cancellation.', fieldErrors: [] });
      return;
    }

    this.reviewSubmitting.set(true);
    this.reviewError.set(null);

    const request$ =
      mode === 'approve'
        ? this.adminBookingService.approveCancellation(target.bookingId, {
            amount: this.reviewAmount() ?? undefined,
            note: this.reviewNote().trim() || undefined,
          })
        : this.adminBookingService.rejectCancellation(target.bookingId, {
            note: this.reviewNote().trim(),
          });

    request$.subscribe({
      next: () => {
        this.requests.update((list) => list.filter((r) => r.bookingId !== target.bookingId));
        this.reviewSubmitting.set(false);
        this.closeReview();
      },
      error: (err: AppError) => {
        this.reviewError.set(err);
        this.reviewSubmitting.set(false);
      },
    });
  }
}
