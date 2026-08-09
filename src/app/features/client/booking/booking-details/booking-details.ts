import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { DocumentDownload } from '../../../../shared/ui/document-download/document-download';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { PaymentBreakdown } from '../../../../shared/ui/payment-breakdown/payment-breakdown';
import { BookingTimeline } from '../../../../shared/ui/booking-timeline/booking-timeline';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  BookingPaymentStatus,
  BookingRequest,
  BookingStatus,
  BookingStatusHistoryEntry,
  CancellationQuote,
} from '../../../../core/interfaces/booking-request.model';
import { EventPlan } from '../../../../core/interfaces/event-plan.model';
import { VendorPackage } from '../../../../core/interfaces/vendor-package.model';
import { VendorProfile } from '../../../../core/interfaces/vendor-profile.model';
import { BookingRequestService } from '../../../../core/services/booking-request.service';
import { EventPlanService } from '../../../../core/services/event-plan.service';
import { ReviewService } from '../../../../core/services/review.service';
import { VendorPackageService } from '../../../../core/services/vendor-package.service';
import { VendorService } from '../../../../core/services/vendor.service';
import { notifyError, notifySuccess } from '../../../../shared/utils/notify';

/**
 * Dedicated Booking Details page — the redesign spec explicitly asks that
 * clicking a booking opens "a proper Booking Details page" rather than
 * folding straight into event-plan-detail. All the mutation logic here
 * (cancel / request-cancellation / confirm-completion / dispute / review) is
 * the same BookingRequestService/ReviewService surface event-plan-detail.ts
 * already uses, just scoped to a single booking instead of a whole plan's
 * list.
 */
@Component({
  selector: 'app-booking-details',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    AlertBanner,
    Button,
    ConfirmDialog,
    DocumentDownload,
    TextField,
    StatusBadge,
    PaymentBreakdown,
    BookingTimeline,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './booking-details.html',
  styleUrl: './booking-details.css',
})
export class BookingDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly bookingService = inject(BookingRequestService);
  private readonly vendorService = inject(VendorService);
  private readonly packageService = inject(VendorPackageService);
  private readonly eventPlanService = inject(EventPlanService);
  private readonly reviewService = inject(ReviewService);

  protected readonly BookingStatus = BookingStatus;
  protected readonly BookingPaymentStatus = BookingPaymentStatus;

  protected readonly booking = signal<BookingRequest | null>(null);
  protected readonly vendor = signal<VendorProfile | null>(null);
  protected readonly pkg = signal<VendorPackage | null>(null);
  protected readonly plan = signal<EventPlan | null>(null);

  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);
  protected readonly actioning = signal(false);

  protected readonly timeline = signal<BookingStatusHistoryEntry[] | null>(null);
  protected readonly timelineLoading = signal(false);
  protected readonly timelineError = signal<string | null>(null);

  /** agreedPrice has no currency field of its own — sourced from the package, EGP fallback otherwise. */
  protected readonly currency = computed(() => this.pkg()?.currency ?? 'EGP');

  protected readonly showCancel = signal(false);

  protected readonly showRequestCancellation = signal(false);
  protected readonly cancellationQuote = signal<CancellationQuote | null>(null);
  protected readonly cancellationQuoteLoading = signal(false);
  protected readonly cancellationForm = this.fb.nonNullable.group({
    reason: ['', Validators.required],
  });
  protected readonly cancellationSubmitting = signal(false);
  protected readonly cancellationError = signal<AppError | null>(null);

  protected readonly showDispute = signal(false);
  protected readonly disputeForm = this.fb.nonNullable.group({
    reason: ['', Validators.required],
  });
  protected readonly disputeSubmitting = signal(false);
  protected readonly disputeError = signal<AppError | null>(null);

  protected readonly showReview = signal(false);
  protected readonly reviewRating = signal(0);
  protected readonly reviewForm = this.fb.nonNullable.group({
    comment: ['', Validators.maxLength(1000)],
  });
  protected readonly reviewSubmitting = signal(false);
  protected readonly reviewError = signal<AppError | null>(null);

  private bookingId = 0;

  ngOnInit(): void {
    this.bookingId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.bookingService.getBooking(this.bookingId).subscribe({
      next: (booking) => {
        this.booking.set(booking);
        this.loading.set(false);
        this.loadRelated(booking);
        this.loadTimeline();
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  private loadRelated(booking: BookingRequest): void {
    this.vendorService.getById(booking.vendorId).subscribe({ next: (v) => this.vendor.set(v) });

    if (booking.vendorPackageId) {
      this.packageService
        .getById(booking.vendorPackageId)
        .subscribe({ next: (p) => this.pkg.set(p) });
    }

    this.eventPlanService.getEventPlan(booking.eventPlanId).subscribe({
      next: (plan) => this.plan.set(plan),
      error: () => this.plan.set(null),
    });
  }

  private loadTimeline(): void {
    this.timelineLoading.set(true);
    this.timelineError.set(null);
    this.bookingService.getTimeline(this.bookingId).subscribe({
      next: (entries) => {
        this.timeline.set(entries);
        this.timelineLoading.set(false);
      },
      error: (err: AppError) => {
        this.timelineError.set(err.message || 'Could not load booking activity.');
        this.timelineLoading.set(false);
      },
    });
  }

  private updateBooking(updated: BookingRequest): void {
    this.booking.set(updated);
  }

  // ---- Cancel (Pending) ----

  protected openCancel(): void {
    this.showCancel.set(true);
  }

  protected closeCancel(): void {
    this.showCancel.set(false);
  }

  protected confirmCancel(): void {
    this.actioning.set(true);
    this.bookingService.cancelBooking(this.bookingId).subscribe({
      next: (updated) => {
        this.updateBooking(updated);
        this.actioning.set(false);
        this.showCancel.set(false);
        this.loadTimeline();
        notifySuccess('Booking request cancelled.');
      },
      error: (err: AppError) => {
        this.actioning.set(false);
        this.showCancel.set(false);
        notifyError('Could not cancel booking', err.message);
      },
    });
  }

  // ---- Request cancellation (Accepted) ----

  protected openRequestCancellation(): void {
    this.showRequestCancellation.set(true);
    this.cancellationForm.reset({ reason: '' });
    this.cancellationError.set(null);
    this.cancellationQuote.set(null);
    this.cancellationQuoteLoading.set(true);

    this.bookingService.getCancellationQuote(this.bookingId).subscribe({
      next: (quote) => {
        this.cancellationQuote.set(quote);
        this.cancellationQuoteLoading.set(false);
      },
      error: (err: AppError) => {
        this.cancellationError.set(err);
        this.cancellationQuoteLoading.set(false);
      },
    });
  }

  protected closeRequestCancellation(): void {
    this.showRequestCancellation.set(false);
  }

  protected submitCancellationRequest(): void {
    if (this.cancellationForm.invalid) {
      this.cancellationForm.markAllAsTouched();
      return;
    }

    this.cancellationSubmitting.set(true);
    this.cancellationError.set(null);

    this.bookingService
      .requestCancellation(this.bookingId, this.cancellationForm.getRawValue().reason)
      .subscribe({
        next: (updated) => {
          this.updateBooking(updated);
          this.cancellationSubmitting.set(false);
          this.showRequestCancellation.set(false);
          this.loadTimeline();
          notifySuccess('Cancellation requested — an admin will review it shortly.');
        },
        error: (err: AppError) => {
          this.cancellationError.set(err);
          this.cancellationSubmitting.set(false);
          notifyError('Could not request cancellation', err.message);
        },
      });
  }

  // ---- Confirm service delivered (AwaitingConfirmation) ----

  protected confirmServiceDelivered(): void {
    this.actioning.set(true);
    this.bookingService.confirmCompletion(this.bookingId).subscribe({
      next: (updated) => {
        this.updateBooking(updated);
        this.actioning.set(false);
        this.loadTimeline();
        notifySuccess('Thanks for confirming — booking marked complete.');
      },
      error: (err: AppError) => {
        this.actioning.set(false);
        notifyError('Could not confirm booking', err.message);
      },
    });
  }

  // ---- Report a problem / dispute ----

  protected openDispute(): void {
    this.showDispute.set(true);
    this.disputeForm.reset({ reason: '' });
    this.disputeError.set(null);
  }

  protected closeDispute(): void {
    this.showDispute.set(false);
  }

  protected submitDispute(): void {
    if (this.disputeForm.invalid) {
      this.disputeForm.markAllAsTouched();
      return;
    }

    this.disputeSubmitting.set(true);
    this.disputeError.set(null);

    this.bookingService.disputeBooking(this.bookingId, this.disputeForm.getRawValue().reason).subscribe({
      next: (updated) => {
        this.updateBooking(updated);
        this.disputeSubmitting.set(false);
        this.showDispute.set(false);
        this.loadTimeline();
        notifySuccess('Your report has been submitted.');
      },
      error: (err: AppError) => {
        this.disputeError.set(err);
        this.disputeSubmitting.set(false);
        notifyError('Could not submit report', err.message);
      },
    });
  }

  // ---- Review (Completed) ----

  protected openReview(): void {
    const booking = this.booking();
    this.showReview.set(true);
    this.reviewRating.set(booking?.reviewRating ?? 0);
    this.reviewForm.reset({ comment: booking?.reviewComment ?? '' });
    this.reviewError.set(null);
  }

  protected closeReview(): void {
    this.showReview.set(false);
  }

  protected setReviewRating(stars: number): void {
    this.reviewRating.set(stars);
  }

  protected submitReview(): void {
    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }
    if (this.reviewRating() < 1) {
      this.reviewError.set({ status: 400, message: 'Please select a star rating.', fieldErrors: [] });
      return;
    }

    const booking = this.booking();
    if (!booking) {
      return;
    }

    const isEdit = booking.reviewId != null;
    const rating = this.reviewRating();
    const comment = this.reviewForm.getRawValue().comment.trim() || undefined;

    this.reviewSubmitting.set(true);
    this.reviewError.set(null);

    const request$ = isEdit
      ? this.reviewService.updateReview(booking.reviewId!, { rating, comment })
      : this.reviewService.createReview({ bookingRequestId: booking.id, rating, comment });

    request$.subscribe({
      next: (review) => {
        this.booking.update((b) =>
          b
            ? { ...b, reviewId: review.id, reviewRating: review.rating, reviewComment: review.comment }
            : b,
        );
        this.reviewSubmitting.set(false);
        this.showReview.set(false);
        notifySuccess(isEdit ? 'Review updated.' : 'Thanks for your review!');
      },
      error: (err: AppError) => {
        this.reviewError.set(err);
        this.reviewSubmitting.set(false);
        notifyError(isEdit ? 'Could not update review' : 'Could not submit review', err.message);
      },
    });
  }

  protected goToMyBookings(): void {
    this.router.navigateByUrl('/client/bookings');
  }

  protected goToVendor(): void {
    const vendorId = this.booking()?.vendorId;
    if (vendorId) {
      this.router.navigate(['/vendors', vendorId]);
    }
  }
}
