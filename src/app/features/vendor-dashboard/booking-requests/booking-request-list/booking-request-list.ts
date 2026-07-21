import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { DocumentDownload } from '../../../../shared/ui/document-download/document-download';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  BookingRequest,
  BookingStatus,
} from '../../../../core/interfaces/booking-request.model';
import { VendorPackage } from '../../../../core/interfaces/vendor-package.model';
import { VendorBookingRequestService } from '../../../../core/services/vendor-booking-request.service';
import { VendorPackageService } from '../../../../core/services/vendor-package.service';
import { VendorProfileStateService } from '../../../../core/services/vendor-profile-state.service';
import { notifySuccess } from '../../../../shared/utils/notify';
import { DashboardStats } from '../../dashboard-stats/dashboard-stats';
import { BookingRequestDetails } from '../booking-request-details/booking-request-details';
import { RejectBookingDialog } from '../reject-booking-dialog/reject-booking-dialog';

interface StatusFilter {
  label: string;
  value: BookingStatus | 'all';
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
    BookingRequestDetails,
    DashboardStats,
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

  // Exposed so the template can reference enum members directly.
  protected readonly BookingStatus = BookingStatus;

  protected readonly filters: readonly StatusFilter[] = [
    { label: 'Pending', value: BookingStatus.Pending },
    { label: 'Accepted', value: BookingStatus.Accepted },
    { label: 'Declined', value: BookingStatus.Rejected },
    { label: 'All', value: 'all' },
  ];

  protected readonly activeFilter = signal<BookingStatus | 'all'>(BookingStatus.Pending);

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

  private readonly pageSize = 20;
  protected readonly page = signal(1);
  protected readonly totalCount = signal(0);

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / this.pageSize)),
  );

  ngOnInit(): void {
    this.load();
  }

  protected selectFilter(value: BookingStatus | 'all'): void {
    if (this.activeFilter() === value) {
      return;
    }
    this.activeFilter.set(value);
    this.page.set(1);
    this.load();
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

    const filter = this.activeFilter();
    this.bookingService
      .listIncoming({
        status: filter === 'all' ? undefined : filter,
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

  protected accept(booking: BookingRequest): void {
    if (!confirm('Accept this booking request? The client will be charged now.')) {
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
}
