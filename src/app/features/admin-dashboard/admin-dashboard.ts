import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminBookingService } from '../../core/services/admin-booking.service';
import { AdminDashboardService } from '../../core/services/admin-dashboard.service';
import { AdminVendorService } from '../../core/services/admin-vendor.service';
import { AuthService } from '../../core/services/auth.service';
import { VendorVerificationService } from '../../core/services/vendor-verification.service';
import { DashboardStatistics, RecentActivityItem } from '../../core/interfaces/admin-dashboard.model';
import { AdminBookingListItem } from '../../core/interfaces/admin-booking.model';
import { AdminVendorListItem } from '../../core/interfaces/admin-vendor.model';
import { PendingVendorVerification } from '../../core/interfaces/vendor-verification.model';
import { AdminBadge } from './shared/admin-badge/admin-badge';
import { AdminEmptyState } from './shared/admin-empty-state/admin-empty-state';
import { AdminStatCard } from './shared/admin-stat-card/admin-stat-card';
import { AdminTimeline, AdminTimelineEntry } from './shared/admin-timeline/admin-timeline';
import { mapBookingPaymentStatus, mapBookingStatus, mapVendorStatus } from './shared/status-maps';

/**
 * Dashboard Home — the admin's landing page. Pulls dashboard statistics,
 * the merged recent-activity feed, pending vendor approvals, and the
 * newest bookings/vendors into one overview.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, AdminStatCard, AdminBadge, AdminTimeline, AdminEmptyState],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private readonly dashboardService = inject(AdminDashboardService);
  private readonly vendorVerificationService = inject(VendorVerificationService);
  private readonly adminVendorService = inject(AdminVendorService);
  private readonly adminBookingService = inject(AdminBookingService);
  protected readonly authService = inject(AuthService);

  protected readonly statistics = signal<DashboardStatistics | null>(null);
  protected readonly statsLoading = signal(true);

  protected readonly recentActivity = signal<RecentActivityItem[]>([]);
  protected readonly activityLoading = signal(true);

  protected readonly pendingVendors = signal<PendingVendorVerification[]>([]);
  protected readonly pendingLoading = signal(true);

  protected readonly recentVendors = signal<AdminVendorListItem[]>([]);
  protected readonly recentVendorsLoading = signal(true);

  protected readonly recentBookings = signal<AdminBookingListItem[]>([]);
  protected readonly recentBookingsLoading = signal(true);

  protected readonly mapVendorStatus = mapVendorStatus;
  protected readonly mapBookingStatus = mapBookingStatus;
  protected readonly mapBookingPaymentStatus = mapBookingPaymentStatus;

  ngOnInit(): void {
    this.dashboardService.getStatistics().subscribe({
      next: (stats) => {
        this.statistics.set(stats);
        this.statsLoading.set(false);
      },
      error: () => this.statsLoading.set(false),
    });

    this.dashboardService.getRecentActivity(12).subscribe({
      next: (items) => {
        this.recentActivity.set(items);
        this.activityLoading.set(false);
      },
      error: () => this.activityLoading.set(false),
    });

    this.vendorVerificationService.getPending().subscribe({
      next: (items) => {
        this.pendingVendors.set(items.slice(0, 5));
        this.pendingLoading.set(false);
      },
      error: () => this.pendingLoading.set(false),
    });

    this.adminVendorService.list({ page: 1, pageSize: 5 }).subscribe({
      next: (result) => {
        this.recentVendors.set(result.items);
        this.recentVendorsLoading.set(false);
      },
      error: () => this.recentVendorsLoading.set(false),
    });

    this.adminBookingService.list({ page: 1, pageSize: 5 }).subscribe({
      next: (result) => {
        this.recentBookings.set(result.items);
        this.recentBookingsLoading.set(false);
      },
      error: () => this.recentBookingsLoading.set(false),
    });
  }

  protected get activityTimeline(): AdminTimelineEntry[] {
    return this.recentActivity().map((item) => ({
      title: item.description,
      subtitle: item.actorName ? `by ${item.actorName}` : null,
      timestamp: item.occurredAt,
      icon: item.eventType === 'VendorVerification' ? 'storefront' : 'event_note',
      tone: item.eventType === 'VendorVerification' ? 'purple' : 'indigo',
    }));
  }

  protected get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }
}
