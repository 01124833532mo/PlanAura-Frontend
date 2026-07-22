import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminBookingService } from '../../../../../core/services/admin-booking.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import { AdminBookingFilter, AdminBookingListItem } from '../../../../../core/interfaces/admin-booking.model';
import { BookingStatus, DisputeStatus } from '../../../../../core/interfaces/booking-request.model';
import { AdminBadge } from '../../../shared/admin-badge/admin-badge';
import { AdminEmptyState } from '../../../shared/admin-empty-state/admin-empty-state';
import { AdminErrorState } from '../../../shared/admin-error-state/admin-error-state';
import { AdminPagination } from '../../../shared/admin-pagination/admin-pagination';
import { AdminSearchBar } from '../../../shared/admin-search-bar/admin-search-bar';
import { AdminSkeletonRows } from '../../../shared/admin-skeleton/admin-skeleton';
import { mapBookingPaymentStatus, mapBookingStatus, mapDisputeStatus } from '../../../shared/status-maps';

const STATUS_OPTIONS: { label: string; value: BookingStatus | undefined }[] = [
  { label: 'All statuses', value: undefined },
  { label: 'Pending', value: BookingStatus.Pending },
  { label: 'Accepted', value: BookingStatus.Accepted },
  { label: 'Completed', value: BookingStatus.Completed },
  { label: 'Rejected', value: BookingStatus.Rejected },
  { label: 'Cancelled', value: BookingStatus.Cancelled },
  { label: 'Expired', value: BookingStatus.Expired },
];

/** Platform-wide booking list (AdminDashboardPlan.md 2.6/2.7). Row click opens a read-only
 * detail panel — there's no dedicated GET .../bookings/{id} endpoint, so the panel simply
 * presents the already-fetched list row's fields plus a link into the dispute page when relevant. */
@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, AdminBadge, AdminEmptyState, AdminErrorState, AdminPagination, AdminSearchBar, AdminSkeletonRows],
  templateUrl: './booking-list.html',
  styleUrl: './booking-list.css',
})
export class BookingList implements OnInit {
  private readonly adminBookingService = inject(AdminBookingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /**
   * Booking id from a ?bookingId=N deep link (the dashboard's Recent Bookings rows), consumed
   * once the first page has loaded. There is no GET bookings/{id} endpoint and the detail panel
   * renders an already-fetched list row, so the row has to come from the list itself — meaning
   * this only opens if the booking is on the first page. That's the case it's used for (recent
   * bookings are the newest), and when it isn't, the admin still lands on the list.
   */
  private deepLinkBookingId: number | null = null;

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly DisputeStatus = DisputeStatus;
  protected readonly mapBookingStatus = mapBookingStatus;
  protected readonly mapBookingPaymentStatus = mapBookingPaymentStatus;
  protected readonly mapDisputeStatus = mapDisputeStatus;

  protected readonly bookings = signal<AdminBookingListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  protected readonly filter = signal<AdminBookingFilter>({ page: 1, pageSize: 20 });
  protected readonly selectedBooking = signal<AdminBookingListItem | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.queryParamMap.get('bookingId'));
    this.deepLinkBookingId = id > 0 ? id : null;
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminBookingService.list(this.filter()).subscribe({
      next: (result) => {
        this.bookings.set(result.items);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);

        if (this.deepLinkBookingId !== null) {
          const match = result.items.find((b) => b.id === this.deepLinkBookingId);
          this.deepLinkBookingId = null;
          if (match) {
            this.openDetail(match);
          }
        }
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  protected onSearch(term: string): void {
    this.filter.update((f) => ({ ...f, search: term || undefined, page: 1 }));
    this.load();
  }

  protected onStatusChange(value: string): void {
    const status = value === '' ? undefined : (Number(value) as BookingStatus);
    this.filter.update((f) => ({ ...f, status, page: 1 }));
    this.load();
  }

  protected onPageChange(page: number): void {
    this.filter.update((f) => ({ ...f, page }));
    this.load();
  }

  protected openDetail(booking: AdminBookingListItem): void {
    this.selectedBooking.set(booking);
  }

  protected closeDetail(): void {
    this.selectedBooking.set(null);

    // Drop the deep-link param so a refresh (or Back) doesn't reopen what was just closed.
    if (this.route.snapshot.queryParamMap.has('bookingId')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { bookingId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }
}
