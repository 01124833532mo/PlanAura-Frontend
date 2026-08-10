import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { DocumentDownload } from '../../../../shared/ui/document-download/document-download';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  BookingPaymentStatus,
  BookingRequest,
  BookingStatus,
  DisputeStatus,
} from '../../../../core/interfaces/booking-request.model';
import { VendorPackage } from '../../../../core/interfaces/vendor-package.model';
import { VendorBookingRequestService } from '../../../../core/services/vendor-booking-request.service';
import { VendorPackageService } from '../../../../core/services/vendor-package.service';
import { VendorProfileStateService } from '../../../../core/services/vendor-profile-state.service';
import { confirmAcceptBooking } from '../../../../shared/utils/confirm-accept-booking';
import { notifyError, notifySuccess } from '../../../../shared/utils/notify';
import { BookingRequestDetails } from '../booking-request-details/booking-request-details';
import { RejectBookingDialog } from '../reject-booking-dialog/reject-booking-dialog';
import { ReportProblemDialog } from '../report-problem-dialog/report-problem-dialog';

/** Slug used in the `?status=` query param so drill-down links stay readable. */
export type RequestTabKey =
  | 'all'
  | 'pending'
  | 'accepted'
  | 'completed'
  | 'declined'
  | 'refunded'
  | 'cancelled';

/**
 * A tab narrows on booking status, payment status, or neither. Refunded is a
 * payment-status tab: a refund leaves BookingStatus untouched, so refunded
 * bookings also still appear under their original status tab (badged "Refunded").
 */
interface StatusTab {
  label: string;
  key: RequestTabKey;
  status?: BookingStatus;
  paymentStatus?: BookingPaymentStatus;
}

@Component({
  selector: 'app-booking-request-list',
  standalone: true,
  imports: [
    AlertBanner,
    Button,
    DocumentDownload,
    StatusBadge,
    RejectBookingDialog,
    ReportProblemDialog,
    BookingRequestDetails,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './booking-request-list.html',
  styleUrl: './booking-request-list.css',
})
export class BookingRequestList implements OnInit {
  private readonly bookingService = inject(VendorBookingRequestService);
  private readonly packageService = inject(VendorPackageService);
  private readonly vendorProfileState = inject(VendorProfileStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /**
   * Set by the Overview page to embed a single-tab slice of this list: the page
   * header, tab bar and `?status=` sync are all suppressed and the tab is locked.
   */
  @Input() fixedTab?: RequestTabKey;
  @Input() pageSize = 20;

  protected get embedded(): boolean {
    return this.fixedTab !== undefined;
  }

  // Exposed so the template can reference enum members directly.
  protected readonly BookingStatus = BookingStatus;
  protected readonly DisputeStatus = DisputeStatus;

  protected readonly tabs: readonly StatusTab[] = [
    { label: 'All', key: 'all' },
    { label: 'Pending', key: 'pending', status: BookingStatus.Pending },
    { label: 'Accepted', key: 'accepted', status: BookingStatus.Accepted },
    { label: 'Completed', key: 'completed', status: BookingStatus.Completed },
    { label: 'Declined', key: 'declined', status: BookingStatus.Rejected },
    { label: 'Refunded', key: 'refunded', paymentStatus: BookingPaymentStatus.Refunded },
    { label: 'Cancelled', key: 'cancelled', status: BookingStatus.Cancelled },
  ];

  protected readonly activeTab = signal<RequestTabKey>('all');

  protected readonly requests = signal<BookingRequest[]>([]);
  protected readonly packagesById = signal<Map<number, VendorPackage>>(new Map());
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  // Id of the request whose accept/reject call is currently in flight.
  protected readonly actioningId = signal<number | null>(null);

  // Details modal (opened by clicking a request row).
  protected readonly detailsTarget = signal<BookingRequest | null>(null);

  // Reject dialog state.
  protected readonly rejectTarget = signal<BookingRequest | null>(null);
  protected readonly rejectSaving = signal(false);
  protected readonly rejectError = signal<AppError | null>(null);

  // "Report a problem" dialog state — raises a dispute for an admin to resolve.
  protected readonly disputeTarget = signal<BookingRequest | null>(null);
  protected readonly disputeSaving = signal(false);
  protected readonly disputeError = signal<AppError | null>(null);

  protected readonly page = signal(1);
  protected readonly totalCount = signal(0);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / this.pageSize)),
  );

  protected readonly emptyMessage = computed(() => {
    const label = this.tabs.find((t) => t.key === this.activeTab())?.label ?? '';
    return this.activeTab() === 'all'
      ? 'No booking requests here yet.'
      : `No ${label.toLowerCase()} booking requests.`;
  });

  ngOnInit(): void {
    if (this.embedded) {
      this.activeTab.set(this.fixedTab!);
      this.load();
      return;
    }

    // Drill-down links from the Overview stat cards land here with `?status=`.
    // Re-emits on in-place navigation, so switching tabs from a card while
    // already on this page still reloads.
    this.route.queryParamMap.subscribe((params) => {
      const requested = params.get('status');
      const match = this.tabs.find((t) => t.key === requested);
      this.activeTab.set(match?.key ?? 'all');
      this.page.set(1);
      this.load();
    });
  }

  protected selectTab(key: RequestTabKey): void {
    if (this.activeTab() === key) {
      return;
    }
    // Writing the query param drives the subscription above, which reloads.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: key },
      queryParamsHandling: 'merge',
    });
  }

  protected prevPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((p) => p - 1);
    this.load();
  }

  protected nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((p) => p + 1);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    const tab = this.tabs.find((t) => t.key === this.activeTab());

    this.bookingService
      .listIncoming({
        status: tab?.status,
        paymentStatus: tab?.paymentStatus,
        // A booking-status tab means "still in this state", so refunded bookings
        // are excluded — they belong to the Refunded tab (and to All).
        excludeRefunded: tab?.status !== undefined,
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (result) => {
          this.requests.set(result.items);
          this.totalCount.set(result.totalCount);
          this.loadPackages(result.items);
          this.loading.set(false);
        },
        error: (err: AppError) => {
          this.error.set(err);
          this.loading.set(false);
        },
      });
  }

  /**
   * BookingRequestDto only carries vendorPackageId (no embedded title), so we
   * batch-fetch each referenced package once. A vendor may only read their own
   * packages here; a failed lookup falls back to null rather than blocking the list.
   */
  private loadPackages(bookings: BookingRequest[]): void {
    const ids = [
      ...new Set(bookings.map((b) => b.vendorPackageId).filter((id): id is number => id != null)),
    ];
    if (ids.length === 0) {
      this.packagesById.set(new Map());
      return;
    }

    forkJoin(
      ids.map((id) => this.packageService.getById(id).pipe(catchError(() => of(null)))),
    ).subscribe((packages) => {
      const map = new Map<number, VendorPackage>();
      for (const p of packages) {
        if (p) {
          map.set(p.id, p);
        }
      }
      this.packagesById.set(map);
    });
  }

  protected packageTitle(booking: BookingRequest): string | null {
    return booking.vendorPackageId
      ? (this.packagesById().get(booking.vendorPackageId)?.title ?? null)
      : null;
  }

  /** agreedPrice has no currency of its own — sourced from the package, EGP fallback. */
  protected priceCurrency(booking: BookingRequest): string {
    const pkg = booking.vendorPackageId ? this.packagesById().get(booking.vendorPackageId) : null;
    return pkg?.currency ?? 'EGP';
  }

  protected openDetails(booking: BookingRequest): void {
    this.detailsTarget.set(booking);
  }

  protected closeDetails(): void {
    if (this.actioningId() !== null) {
      return;
    }
    this.detailsTarget.set(null);
  }

  protected async accept(booking: BookingRequest): Promise<void> {
    if (!(await confirmAcceptBooking())) {
      return;
    }

    this.actioningId.set(booking.id);
    this.error.set(null);

    this.bookingService.accept(booking.id).subscribe({
      next: () => {
        this.actioningId.set(null);
        this.detailsTarget.set(null);
        this.load();
        // Refreshes the cached vendor profile so a first-time Partnership
        // Agreement (generated server-side as part of accepting) shows up
        // immediately in the topbar/profile without a manual page reload.
        this.vendorProfileState.refresh();
        notifySuccess('Booking confirmed. Your Event Booking Contract has been generated.');
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.actioningId.set(null);
        this.detailsTarget.set(null);
        // Capture failures auto-decline the request server-side, so refresh
        // the list to reflect whatever the new status is.
        this.load();
      },
    });
  }

  protected openReject(booking: BookingRequest): void {
    // If the details modal is open (declining from there), close it first so
    // only the reject dialog is shown.
    this.detailsTarget.set(null);
    this.rejectTarget.set(booking);
    this.rejectError.set(null);
  }

  protected closeReject(): void {
    if (this.rejectSaving()) {
      return;
    }
    this.rejectTarget.set(null);
  }

  protected submitReject(reason: string | undefined): void {
    const target = this.rejectTarget();
    if (!target) {
      return;
    }

    this.rejectSaving.set(true);
    this.rejectError.set(null);

    this.bookingService.reject(target.id, reason).subscribe({
      next: () => {
        this.rejectSaving.set(false);
        this.rejectTarget.set(null);
        this.load();
      },
      error: (err: AppError) => {
        this.rejectError.set(err);
        this.rejectSaving.set(false);
      },
    });
  }

  /** Mirrors the client's "Report a problem" — server allows it on Accepted/Completed only. */
  protected canDispute(booking: BookingRequest): boolean {
    return (
      (booking.status === BookingStatus.Accepted || booking.status === BookingStatus.Completed) &&
      booking.disputeStatus !== DisputeStatus.Open
    );
  }

  protected openDispute(booking: BookingRequest): void {
    // Close the details modal first so only the report dialog is shown.
    this.detailsTarget.set(null);
    this.disputeTarget.set(booking);
    this.disputeError.set(null);
  }

  protected closeDispute(): void {
    if (this.disputeSaving()) {
      return;
    }
    this.disputeTarget.set(null);
  }

  protected submitDispute(reason: string): void {
    const target = this.disputeTarget();
    if (!target) {
      return;
    }

    this.disputeSaving.set(true);
    this.disputeError.set(null);

    this.bookingService.disputeBooking(target.id, reason).subscribe({
      next: (updated) => {
        this.requests.update((list) => list.map((b) => (b.id === updated.id ? updated : b)));
        this.disputeSaving.set(false);
        this.disputeTarget.set(null);
        notifySuccess('Your report has been sent to the Planura team.');
      },
      error: (err: AppError) => {
        this.disputeError.set(err);
        this.disputeSaving.set(false);
        notifyError('Could not submit report', err.message);
      },
    });
  }
}
