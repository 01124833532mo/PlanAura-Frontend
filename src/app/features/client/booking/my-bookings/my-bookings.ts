import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { DocumentDownload } from '../../../../shared/ui/document-download/document-download';
import { PaymentBreakdown } from '../../../../shared/ui/payment-breakdown/payment-breakdown';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  BookingPaymentStatus,
  BookingRequest,
  BookingStatus,
  PayRemainderResult,
} from '../../../../core/interfaces/booking-request.model';
import { EventPlan } from '../../../../core/interfaces/event-plan.model';
import { VendorPackage } from '../../../../core/interfaces/vendor-package.model';
import { VendorProfile } from '../../../../core/interfaces/vendor-profile.model';
import { BookingRequestService } from '../../../../core/services/booking-request.service';
import { EventPlanService } from '../../../../core/services/event-plan.service';
import { VendorPackageService } from '../../../../core/services/vendor-package.service';
import { VendorService } from '../../../../core/services/vendor.service';
import { STRIPE_PUBLISHABLE_KEY } from '../../../../core/config/app-config';
import { StripeService } from '../../../../core/services/stripe.service';
import { notifyError, notifySuccess } from '../../../../shared/utils/notify';

/** The tab groups shown above the list — coarser than the 8 raw BookingStatus values so the bar stays scannable. */
type BookingTab = 'all' | 'needsAction' | 'upcoming' | 'completed' | 'closed';

/**
 * Read-only, navigational list of every booking the client has across all
 * their event plans. Actions (cancel/dispute/confirm/review) live on the
 * dedicated Booking Details page (booking-details.ts) — this page just
 * links into it, avoiding duplicating the action code here.
 */
@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [
    AlertBanner,
    Button,
    DocumentDownload,
    PaymentBreakdown,
    StatusBadge,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './my-bookings.html',
  styleUrl: './my-bookings.css',
})
export class MyBookings implements OnInit {
  // Exposed so the template can reference enum members directly.
  protected readonly BookingPaymentStatus = BookingPaymentStatus;
  protected readonly BookingStatus = BookingStatus;

  private readonly router = inject(Router);
  private readonly bookingService = inject(BookingRequestService);
  private readonly eventPlanService = inject(EventPlanService);
  private readonly vendorService = inject(VendorService);
  private readonly packageService = inject(VendorPackageService);
  private readonly stripeService = inject(StripeService);

  protected readonly bookings = signal<BookingRequest[]>([]);
  protected readonly eventPlansById = signal<Map<number, EventPlan>>(new Map());
  protected readonly vendorsById = signal<Map<number, VendorProfile>>(new Map());
  protected readonly packagesById = signal<Map<number, VendorPackage>>(new Map());

  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  // ---- Tabs ----
  protected readonly activeTab = signal<BookingTab>('all');
  protected readonly tabs: { key: BookingTab; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'list_alt' },
    { key: 'needsAction', label: 'Needs action', icon: 'priority_high' },
    { key: 'upcoming', label: 'Upcoming', icon: 'event_upcoming' },
    { key: 'completed', label: 'Completed', icon: 'task_alt' },
    { key: 'closed', label: 'Closed', icon: 'archive' },
  ];

  private tabMatch(tab: BookingTab, b: BookingRequest): boolean {
    switch (tab) {
      case 'all':
        return true;
      case 'needsAction':
        return (
          b.paymentStatus === BookingPaymentStatus.RemainderFailed ||
          b.status === BookingStatus.AwaitingConfirmation ||
          b.status === BookingStatus.Pending
        );
      case 'upcoming':
        return (
          b.status === BookingStatus.Accepted && new Date(b.eventDate).getTime() >= Date.now()
        );
      case 'completed':
        return b.status === BookingStatus.Completed;
      case 'closed':
        return (
          b.status === BookingStatus.Cancelled ||
          b.status === BookingStatus.Rejected ||
          b.status === BookingStatus.Expired
        );
    }
  }

  /** Per-tab counts against the full (unfiltered) list, so the bar shows what each tab holds before tapping it. */
  protected readonly tabCounts = computed(() => {
    const all = this.bookings();
    const counts = {} as Record<BookingTab, number>;
    for (const tab of this.tabs) {
      counts[tab.key] = all.filter((b) => this.tabMatch(tab.key, b)).length;
    }
    return counts;
  });

  protected readonly filteredBookings = computed(() =>
    this.bookings().filter((b) => this.tabMatch(this.activeTab(), b)),
  );

  protected selectTab(tab: BookingTab): void {
    this.activeTab.set(tab);
  }

  // ---- Pay remainder (DepositPaid / RemainderFailed) — same on-session SCA flow as
  // event-plan-detail.ts / booking-details.ts, so it's resolvable from every list this booking appears in.
  protected readonly payingRemainderId = signal<number | null>(null);
  protected readonly remainderStatusMessage = signal<string | null>(null);

  protected async payRemainder(booking: BookingRequest): Promise<void> {
    this.payingRemainderId.set(booking.id);
    this.remainderStatusMessage.set(null);

    try {
      const result: PayRemainderResult = await firstValueFrom(
        this.bookingService.payRemainder(booking.id),
      );

      if (result.requiresAction && result.clientSecret) {
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
        this.remainderStatusMessage.set('Finalizing payment…');
        await this.pollUntilPaid(booking.id);
      } else {
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

  private async pollUntilPaid(id: number): Promise<void> {
    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const updated = await this.refreshBooking(id);
      if (updated?.paymentStatus === BookingPaymentStatus.Paid) {
        return;
      }
    }
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

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      bookings: this.bookingService.listMyBookings({ pageSize: 100 }),
      plans: this.eventPlanService.getMyEventPlans(),
    }).subscribe({
      next: ({ bookings, plans }) => {
        // Most recent first — createdAt is an ISO string, safe to sort lexically.
        const sorted = [...bookings.items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        this.bookings.set(sorted);
        this.eventPlansById.set(new Map(plans.map((p) => [p.id, p])));
        this.loadBookingDetails(sorted);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  /** Same batched-lookup-by-unique-id pattern as event-plan-detail, for the same reason (no embedded names on BookingRequestDto). */
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
      this.vendorsById.set(new Map(vendors.filter((v) => v).map((v) => [v!.id, v!])));
      this.packagesById.set(new Map(packages.filter((p) => p).map((p) => [p!.id, p!])));
      this.loading.set(false);
    });
  }

  protected vendorName(booking: BookingRequest): string {
    return this.vendorsById().get(booking.vendorId)?.businessName ?? `Vendor #${booking.vendorId}`;
  }

  protected packageTitle(booking: BookingRequest): string | null {
    return booking.vendorPackageId
      ? (this.packagesById().get(booking.vendorPackageId)?.title ?? null)
      : null;
  }

  protected planTitle(booking: BookingRequest): string {
    return this.eventPlansById().get(booking.eventPlanId)?.title ?? `Plan #${booking.eventPlanId}`;
  }

  /** agreedPrice has no currency field of its own — sourced from the fetched package, EGP fallback otherwise. */
  protected priceCurrency(booking: BookingRequest): string {
    const pkg = booking.vendorPackageId ? this.packagesById().get(booking.vendorPackageId) : null;
    return pkg?.currency ?? 'EGP';
  }

  protected openBooking(booking: BookingRequest): void {
    this.router.navigate(['/client/bookings', booking.id]);
  }

  /** The outstanding remainder on a deposit booking (total − deposit), server-recorded on the DTO. */
  protected remainderAmount(booking: BookingRequest): number {
    return (booking.totalAmount ?? 0) - (booking.depositAmount ?? 0);
  }

  protected goToVendors(): void {
    this.router.navigateByUrl('/explore/vendors');
  }
}
