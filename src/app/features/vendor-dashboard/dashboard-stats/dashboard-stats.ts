import { DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VendorDashboardStats } from '../../../core/interfaces/vendor-dashboard-stats.model';

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

/**
 * The four primary, always-visible KPI cards at the top of the Overview page — the numbers a
 * vendor should be able to read in one glance: how many bookings total, how many are waiting on
 * them, how many are confirmed, and how much they've earned. Purely presentational: Overview owns
 * the single `getMyDashboardStats()` fetch (shared with the booking-status chart and the business
 * summary section below) and passes the result in, so this card never makes its own API call.
 */
@Component({
  selector: 'app-dashboard-stats',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-stats.html',
  styleUrl: './dashboard-stats.css',
})
export class DashboardStats {
  private readonly decimal = new DecimalPipe('en-US');

  @Input() stats: VendorDashboardStats | null = null;
  @Input() loading = false;

  protected tiles(s: VendorDashboardStats): StatTile[] {
    return [
      {
        icon: 'calendar_month',
        label: 'Total bookings',
        value: this.decimal.transform(s.totalBookingRequests, '1.0-0') ?? '0',
        hint: 'All-time requests',
        tone: 'neutral',
        link: REQUESTS,
        queryParams: { status: 'all' },
      },
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
        icon: 'event_available',
        label: 'Confirmed bookings',
        value: this.decimal.transform(s.acceptedRequests, '1.0-0') ?? '0',
        hint: 'Accepted & on the calendar',
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
        hint: 'Captured payments, all-time',
        tone: 'success',
        link: REQUESTS,
        queryParams: { status: 'all' },
      },
    ];
  }
}
