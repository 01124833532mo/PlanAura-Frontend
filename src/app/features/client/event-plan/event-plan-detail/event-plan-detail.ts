import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { DocumentDownload } from '../../../../shared/ui/document-download/document-download';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  BookingPaymentStatus,
  BookingRequest,
  BookingStatus,
  BookingStatusHistoryEntry,
  CancellationQuote,
  DisputeStatus,
  PayRemainderResult,
} from '../../../../core/interfaces/booking-request.model';
import { STRIPE_PUBLISHABLE_KEY } from '../../../../core/config/app-config';
import { StripeService } from '../../../../core/services/stripe.service';
import { EventPlan } from '../../../../core/interfaces/event-plan.model';
import { ServiceCategory } from '../../../../core/interfaces/vendor.model';
import { VendorPackage } from '../../../../core/interfaces/vendor-package.model';
import { VendorProfile } from '../../../../core/interfaces/vendor-profile.model';
import { BookingRequestService } from '../../../../core/services/booking-request.service';
import { EventPlanService } from '../../../../core/services/event-plan.service';
import { ReviewService } from '../../../../core/services/review.service';
import { ServiceCategoryService } from '../../../../core/services/service-category.service';
import { VendorPackageService } from '../../../../core/services/vendor-package.service';
import { VendorService } from '../../../../core/services/vendor.service';
import { BookingTimeline } from '../../../../shared/ui/booking-timeline/booking-timeline';
import { notifyError, notifySuccess } from '../../../../shared/utils/notify';

@Component({
  selector: 'app-event-plan-detail',
  standalone: true,
  imports: [
    AlertBanner,
    Button,
    ConfirmDialog,
    DocumentDownload,
    TextField,
    ReactiveFormsModule,
    StatusBadge,
    BookingTimeline,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './event-plan-detail.html',
  styleUrl: './event-plan-detail.css',
})
export class EventPlanDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly eventPlanService = inject(EventPlanService);
  private readonly bookingService = inject(BookingRequestService);
  private readonly reviewService = inject(ReviewService);
  private readonly vendorService = inject(VendorService);
  private readonly packageService = inject(VendorPackageService);
  private readonly categoryService = inject(ServiceCategoryService);
  private readonly stripeService = inject(StripeService);

  // Exposed so the template can reference enum members directly.
  protected readonly BookingStatus = BookingStatus;
  protected readonly BookingPaymentStatus = BookingPaymentStatus;
  protected readonly DisputeStatus = DisputeStatus;

  protected readonly plan = signal<EventPlan | null>(null);
  protected readonly bookings = signal<BookingRequest[]>([]);
  protected readonly vendorsById = signal<Map<number, VendorProfile>>(new Map());
  protected readonly packagesById = signal<Map<number, VendorPackage>>(new Map());

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly actioningId = signal<number | null>(null);

  // Booking Activity: the permanent audit trail, expanded on demand (one booking at a time) and
  // cached per booking id so re-toggling doesn't re-fetch.
  protected readonly timelineOpenId = signal<number | null>(null);
  protected readonly timelines = signal<Map<number, BookingStatusHistoryEntry[]>>(new Map());
  protected readonly timelineLoading = signal<number | null>(null);
  protected readonly timelineError = signal<string | null>(null);

  // Checklist widget: categories the client marked as needed for this plan (Venue, Photographer,
  // Catering, ...), each showing satisfied/unsatisfied based on active bookings.
  protected readonly allCategories = signal<ServiceCategory[]>([]);
  protected readonly checklistUpdatingId = signal<number | null>(null);
  protected readonly selectedCategoryToAdd = signal<number | null>(null);
  protected readonly availableCategoriesToAdd = computed(() => {
    const onChecklist = new Set((this.plan()?.checklist ?? []).map((c) => c.serviceCategoryId));
    return this.allCategories().filter((c) => !onChecklist.has(c.id));
  });

  protected readonly disputeTargetId = signal<number | null>(null);
  protected readonly disputeForm = this.fb.nonNullable.group({
    reason: ['', Validators.required],
  });
  protected readonly disputeSubmitting = signal(false);
  protected readonly disputeError = signal<AppError | null>(null);

  protected readonly cancelTarget = signal<BookingRequest | null>(null);

  // Request-cancellation flow (Accepted bookings only) — shows the estimated refund before the
  // client commits, then submits a reason; the booking moves to CancellationRequested pending
  // admin review (see BookingRequestsController.RequestCancellation).
  protected readonly cancellationTarget = signal<BookingRequest | null>(null);
  protected readonly cancellationQuote = signal<CancellationQuote | null>(null);
  protected readonly cancellationQuoteLoading = signal(false);
  protected readonly cancellationForm = this.fb.nonNullable.group({
    reason: ['', Validators.required],
  });
  protected readonly cancellationSubmitting = signal(false);
  protected readonly cancellationError = signal<AppError | null>(null);

  // "Confirm service delivered" for AwaitingConfirmation bookings — "Report a problem" reuses the
  // existing dispute flow below.
  protected readonly confirmingCompletionId = signal<number | null>(null);

  protected readonly reviewTargetId = signal<number | null>(null);
  protected readonly reviewTarget = computed(
    () => this.bookings().find((b) => b.id === this.reviewTargetId()) ?? null,
  );
  protected readonly reviewRating = signal(0);
  protected readonly reviewForm = this.fb.nonNullable.group({
    comment: ['', Validators.maxLength(1000)],
  });
  protected readonly reviewSubmitting = signal(false);
  protected readonly reviewError = signal<AppError | null>(null);

  private planId = 0;

  ngOnInit(): void {
    this.planId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadAll();
    this.categoryService.getActiveCategories().subscribe({
      next: (categories) => this.allCategories.set(categories),
    });
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    this.eventPlanService.getEventPlan(this.planId).subscribe({
      next: (plan) => this.plan.set(plan),
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });

    // No eventPlanId filter exists server-side (confirmed in Phase 0) — fetch
    // the client's bookings (up to the backend's max pageSize) and filter here.
    this.bookingService.listMyBookings({ pageSize: 100 }).subscribe({
      next: (result) => {
        const forThisPlan = result.items.filter((b) => b.eventPlanId === this.planId);
        this.bookings.set(forThisPlan);
        this.loadBookingDetails(forThisPlan);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Batches vendor/package lookups by unique id (not one call per booking)
   * since BookingRequestDto only carries vendorId/vendorPackageId, no
   * embedded display names. Each lookup falls back to null on failure so one
   * missing record doesn't block the whole page.
   */
  private loadBookingDetails(bookings: BookingRequest[]): void {
    const vendorIds = [...new Set(bookings.map((b) => b.vendorId))];
    const packageIds = [
      ...new Set(bookings.map((b) => b.vendorPackageId).filter((id): id is number => id != null)),
    ];

    const vendorCalls = vendorIds.length
      ? forkJoin(
          vendorIds.map((id) => this.vendorService.getById(id).pipe(catchError(() => of(null)))),
        )
      : of([]);
    const packageCalls = packageIds.length
      ? forkJoin(
          packageIds.map((id) => this.packageService.getById(id).pipe(catchError(() => of(null)))),
        )
      : of([]);

    forkJoin([vendorCalls, packageCalls]).subscribe(([vendors, packages]) => {
      const vendorMap = new Map<number, VendorProfile>();
      for (const v of vendors) {
        if (v) {
          vendorMap.set(v.id, v);
        }
      }
      this.vendorsById.set(vendorMap);

      const packageMap = new Map<number, VendorPackage>();
      for (const p of packages) {
        if (p) {
          packageMap.set(p.id, p);
        }
      }
      this.packagesById.set(packageMap);

      this.loading.set(false);
    });
  }

  protected vendorName(booking: BookingRequest): string {
    return this.vendorsById().get(booking.vendorId)?.businessName ?? `Vendor #${booking.vendorId}`;
  }

  protected vendorLogo(booking: BookingRequest): string | null {
    return this.vendorsById().get(booking.vendorId)?.logoUrl ?? null;
  }

  protected packageTitle(booking: BookingRequest): string | null {
    return booking.vendorPackageId
      ? (this.packagesById().get(booking.vendorPackageId)?.title ?? null)
      : null;
  }

  /** agreedPrice has no currency field of its own — sourced from the fetched package, EGP fallback otherwise. */
  protected priceCurrency(booking: BookingRequest): string {
    const pkg = booking.vendorPackageId ? this.packagesById().get(booking.vendorPackageId) : null;
    return pkg?.currency ?? 'EGP';
  }

  /**
   * A deposit-path booking whose remainder has NOT been paid (DepositPaid or RemainderFailed). Cancelling
   * such a booking forfeits the deposit immediately — no admin review — so the warning is strong. A
   * fully-paid booking (Paid) instead goes to admin refund review.
   */
  protected isDepositOnly(booking: BookingRequest): boolean {
    return (
      booking.paymentStatus === BookingPaymentStatus.DepositPaid ||
      booking.paymentStatus === BookingPaymentStatus.RemainderFailed
    );
  }

  /** The outstanding remainder on a deposit booking (total − deposit), server-recorded on the DTO. */
  protected remainderAmount(booking: BookingRequest): number {
    return (booking.totalAmount ?? 0) - (booking.depositAmount ?? 0);
  }

  // Pay-remainder (on-session, SCA) — Phase 4. payingRemainderId marks the booking whose remainder payment
  // is in flight; remainderStatusMessage shows SCA / finalizing progress next to the button.
  protected readonly payingRemainderId = signal<number | null>(null);
  protected readonly remainderStatusMessage = signal<string | null>(null);

  /**
   * Client pays the outstanding remainder on-session. Calls the backend; if SCA is required, completes 3-D
   * Secure with Stripe.js (the saved card is already on the PaymentIntent, so no card input), then polls the
   * booking until the webhook finalizes it as Paid. A decline/error leaves the booking RemainderFailed and
   * lets the client retry.
   */
  protected async payRemainder(booking: BookingRequest): Promise<void> {
    this.payingRemainderId.set(booking.id);
    this.remainderStatusMessage.set(null);

    try {
      const result: PayRemainderResult = await firstValueFrom(this.bookingService.payRemainder(booking.id));

      if (result.requiresAction && result.clientSecret) {
        // Browser-only: getStripe returns null during SSR, but this only runs on a user click.
        const stripe = await this.stripeService.getStripe(STRIPE_PUBLISHABLE_KEY);
        if (!stripe) {
          throw new Error('Payments are unavailable right now. Please try again.');
        }
        this.remainderStatusMessage.set('Confirming your payment…');
        const { error, paymentIntent } = await stripe.confirmCardPayment(result.clientSecret);
        if (error) {
          throw new Error(error.message ?? 'Card authentication failed.');
        }
        if (paymentIntent?.status !== 'succeeded') {
          throw new Error('The payment was not completed. Please try again.');
        }
        // The webhook finalizes the booking asynchronously — wait for it to read Paid.
        this.remainderStatusMessage.set('Finalizing payment…');
        await this.pollUntilPaid(booking.id);
      } else {
        // No SCA — the backend already charged and recorded it; just refresh.
        await this.refreshBooking(booking.id);
      }

      this.payingRemainderId.set(null);
      this.remainderStatusMessage.set(null);
      notifySuccess('Payment complete — your booking is fully paid.');
    } catch (err: unknown) {
      this.payingRemainderId.set(null);
      this.remainderStatusMessage.set(null);
      const message = (err as { message?: string })?.message ?? 'The payment could not be completed.';
      notifyError('Could not complete payment', message);
    }
  }

  /** Polls the booking (2s × up to 8 ≈ 16s) until the webhook marks it Paid, refreshing the row each time. */
  private async pollUntilPaid(id: number): Promise<void> {
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const updated = await this.refreshBooking(id);
      if (updated?.paymentStatus === BookingPaymentStatus.Paid) {
        return;
      }
    }
    // Timed out waiting for the webhook — the payment did succeed at Stripe; the row will catch up on reload.
  }

  private async refreshBooking(id: number): Promise<BookingRequest | null> {
    try {
      const updated = await firstValueFrom(this.bookingService.getBooking(id));
      this.bookings.update((list) => list.map((b) => (b.id === id ? updated : b)));
      return updated;
    } catch {
      return null;
    }
  }

  protected cancelBooking(booking: BookingRequest): void {
    this.cancelTarget.set(booking);
  }

  protected closeCancel(): void {
    this.cancelTarget.set(null);
  }

  protected confirmCancel(): void {
    const booking = this.cancelTarget();
    if (!booking) {
      return;
    }

    this.actioningId.set(booking.id);
    this.error.set(null);

    this.bookingService.cancelBooking(booking.id).subscribe({
      next: (updated) => {
        this.bookings.update((list) => list.map((b) => (b.id === updated.id ? updated : b)));
        this.actioningId.set(null);
        this.cancelTarget.set(null);
        notifySuccess('Booking request cancelled.');
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.actioningId.set(null);
        this.cancelTarget.set(null);
        notifyError('Could not cancel booking', err.message);
      },
    });
  }

  protected openRequestCancellation(booking: BookingRequest): void {
    this.cancellationTarget.set(booking);
    this.cancellationForm.reset({ reason: '' });
    this.cancellationError.set(null);
    this.cancellationQuote.set(null);

    // Deposit-only cancel is an immediate forfeit — there is no refund quote to fetch or show.
    if (this.isDepositOnly(booking)) {
      this.cancellationQuoteLoading.set(false);
      return;
    }

    this.cancellationQuoteLoading.set(true);
    this.bookingService.getCancellationQuote(booking.id).subscribe({
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
    this.cancellationTarget.set(null);
  }

  protected submitCancellationRequest(): void {
    if (this.cancellationForm.invalid) {
      this.cancellationForm.markAllAsTouched();
      return;
    }

    const booking = this.cancellationTarget();
    if (!booking) {
      return;
    }

    this.cancellationSubmitting.set(true);
    this.cancellationError.set(null);

    this.bookingService
      .requestCancellation(booking.id, this.cancellationForm.getRawValue().reason)
      .subscribe({
        next: (updated) => {
          this.bookings.update((list) => list.map((b) => (b.id === updated.id ? updated : b)));
          this.cancellationSubmitting.set(false);
          this.cancellationTarget.set(null);
          // Deposit-only forfeit cancels immediately (Cancelled); fully-paid goes to admin review.
          notifySuccess(
            updated.status === BookingStatus.Cancelled
              ? 'Booking cancelled.'
              : 'Cancellation requested — an admin will review it shortly.',
          );
        },
        error: (err: AppError) => {
          this.cancellationError.set(err);
          this.cancellationSubmitting.set(false);
          notifyError('Could not request cancellation', err.message);
        },
      });
  }

  protected confirmServiceDelivered(booking: BookingRequest): void {
    this.confirmingCompletionId.set(booking.id);
    this.error.set(null);

    this.bookingService.confirmCompletion(booking.id).subscribe({
      next: (updated) => {
        this.bookings.update((list) => list.map((b) => (b.id === updated.id ? updated : b)));
        this.confirmingCompletionId.set(null);
        notifySuccess('Thanks for confirming — booking marked complete.');
      },
      error: (err: AppError) => {
        this.confirmingCompletionId.set(null);
        notifyError('Could not confirm booking', err.message);
      },
    });
  }

  protected toggleTimeline(booking: BookingRequest): void {
    if (this.timelineOpenId() === booking.id) {
      this.timelineOpenId.set(null);
      return;
    }

    this.timelineOpenId.set(booking.id);
    if (this.timelines().has(booking.id)) {
      return;
    }

    this.timelineLoading.set(booking.id);
    this.timelineError.set(null);
    this.bookingService.getTimeline(booking.id).subscribe({
      next: (entries) => {
        this.timelines.update((map) => new Map(map).set(booking.id, entries));
        this.timelineLoading.set(null);
      },
      error: (err: AppError) => {
        this.timelineError.set(err.message || 'Could not load booking activity.');
        this.timelineLoading.set(null);
      },
    });
  }

  protected openDispute(booking: BookingRequest): void {
    this.disputeTargetId.set(booking.id);
    this.disputeForm.reset({ reason: '' });
    this.disputeError.set(null);
  }

  protected closeDispute(): void {
    this.disputeTargetId.set(null);
  }

  protected submitDispute(): void {
    if (this.disputeForm.invalid) {
      this.disputeForm.markAllAsTouched();
      return;
    }

    const id = this.disputeTargetId();
    if (!id) {
      return;
    }

    this.disputeSubmitting.set(true);
    this.disputeError.set(null);

    this.bookingService.disputeBooking(id, this.disputeForm.getRawValue().reason).subscribe({
      next: (updated) => {
        this.bookings.update((list) => list.map((b) => (b.id === updated.id ? updated : b)));
        this.disputeSubmitting.set(false);
        this.disputeTargetId.set(null);
        notifySuccess('Your report has been submitted.');
      },
      error: (err: AppError) => {
        this.disputeError.set(err);
        this.disputeSubmitting.set(false);
        notifyError('Could not submit report', err.message);
      },
    });
  }

  protected openReview(booking: BookingRequest): void {
    this.reviewTargetId.set(booking.id);
    this.reviewRating.set(booking.reviewRating ?? 0);
    this.reviewForm.reset({ comment: booking.reviewComment ?? '' });
    this.reviewError.set(null);
  }

  protected closeReview(): void {
    this.reviewTargetId.set(null);
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

    const booking = this.reviewTarget();
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
        this.bookings.update((list) =>
          list.map((b) =>
            b.id === booking.id
              ? { ...b, reviewId: review.id, reviewRating: review.rating, reviewComment: review.comment }
              : b,
          ),
        );
        this.reviewSubmitting.set(false);
        this.reviewTargetId.set(null);
        notifySuccess(isEdit ? 'Review updated.' : 'Thanks for your review!');
      },
      error: (err: AppError) => {
        this.reviewError.set(err);
        this.reviewSubmitting.set(false);
        notifyError(isEdit ? 'Could not update review' : 'Could not submit review', err.message);
      },
    });
  }

  protected goToVendors(): void {
    this.router.navigate(['/client/vendors'], { queryParams: { eventPlanId: this.planId } });
  }

  protected goToEdit(): void {
    this.router.navigate(['/client/event-plans', this.planId, 'edit']);
  }

  protected goToInvitation(): void {
    this.router.navigate(['/client/event-plans', this.planId, 'invitation']);
  }

  protected selectCategoryToAdd(categoryId: number | null): void {
    this.selectedCategoryToAdd.set(categoryId);
  }

  protected addChecklistCategory(): void {
    const categoryId = this.selectedCategoryToAdd();
    if (!categoryId) {
      return;
    }

    this.checklistUpdatingId.set(categoryId);
    this.eventPlanService.addChecklistItem(this.planId, categoryId).subscribe({
      next: (item) => {
        this.plan.update((p) => (p ? { ...p, checklist: [...p.checklist, item] } : p));
        this.checklistUpdatingId.set(null);
        this.selectedCategoryToAdd.set(null);
      },
      error: (err: AppError) => {
        this.checklistUpdatingId.set(null);
        notifyError('Could not add category', err.message);
      },
    });
  }

  protected removeChecklistCategory(serviceCategoryId: number): void {
    this.checklistUpdatingId.set(serviceCategoryId);
    this.eventPlanService.removeChecklistItem(this.planId, serviceCategoryId).subscribe({
      next: () => {
        this.plan.update((p) =>
          p
            ? { ...p, checklist: p.checklist.filter((c) => c.serviceCategoryId !== serviceCategoryId) }
            : p,
        );
        this.checklistUpdatingId.set(null);
      },
      error: (err: AppError) => {
        this.checklistUpdatingId.set(null);
        notifyError('Could not remove category', err.message);
      },
    });
  }
}
