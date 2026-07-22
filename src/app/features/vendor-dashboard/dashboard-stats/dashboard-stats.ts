import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppError } from '../../../core/interfaces/api-response.model';
import { VendorDashboardStats } from '../../../core/interfaces/vendor-dashboard-stats.model';
import { VendorService } from '../../../core/services/vendor.service';

interface StatTile {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  tone: 'primary' | 'gold' | 'success' | 'neutral';
  /** Drill-down target. `queryParams` keys map to the My Requests tab keys. */
  link: string;
  queryParams?: Record<string, string>;
}

const REQUESTS = '/vendor/dashboard/requests';

@Component({
  selector: 'app-dashboard-stats',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-stats.html',
  styleUrl: './dashboard-stats.css',
})
export class DashboardStats implements OnInit {
  private readonly vendorService = inject(VendorService);
  private readonly decimal = new DecimalPipe('en-US');

  protected readonly stats = signal<VendorDashboardStats | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  ngOnInit(): void {
    this.loading.set(true);
    this.vendorService.getMyDashboardStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  protected tiles(s: VendorDashboardStats): StatTile[] {
    return [
      {
        icon: 'pending_actions',
        label: 'Pending requests',
        value: this.decimal.transform(s.pendingRequests, '1.0-0') ?? '0',
        hint: 'Awaiting your response',
        tone: 'primary',
        link: REQUESTS,
        queryParams: { status: 'pending' },
      },
      {
        icon: 'event_upcoming',
        label: 'Upcoming bookings',
        value: this.decimal.transform(s.upcomingBookings, '1.0-0') ?? '0',
        hint: 'Confirmed & in the future',
        tone: 'gold',
        link: REQUESTS,
        queryParams: { status: 'accepted' },
      },
      {
        // No vendor-facing payments page exists, so revenue drills into the full
        // booking history rather than a transaction ledger.
        icon: 'payments',
        label: 'Total revenue',
        value: `${this.decimal.transform(s.totalRevenue, '1.0-0') ?? '0'} EGP`,
        hint: 'Captured payments',
        tone: 'success',
        link: REQUESTS,
        queryParams: { status: 'all' },
      },
      {
        icon: 'star',
        label: 'Average rating',
        value: s.totalReviews > 0 ? (this.decimal.transform(s.avgRating, '1.1-1') ?? '0.0') : '—',
        hint: `${this.decimal.transform(s.totalReviews, '1.0-0') ?? '0'} reviews`,
        tone: 'gold',
        link: '/vendor/dashboard/reviews',
      },
      {
        icon: 'task_alt',
        label: 'Completed',
        value: this.decimal.transform(s.totalCompletedBookings, '1.0-0') ?? '0',
        hint: 'Finished events',
        tone: 'neutral',
        link: REQUESTS,
        queryParams: { status: 'completed' },
      },
      {
        icon: 'inventory_2',
        label: 'Active packages',
        value: this.decimal.transform(s.activePackages, '1.0-0') ?? '0',
        hint: 'Live in your catalog',
        tone: 'neutral',
        link: '/vendor/dashboard/packages',
      },
    ];
  }
}
