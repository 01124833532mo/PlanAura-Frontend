import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  }
}
