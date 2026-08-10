import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, Injector, OnInit, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { filter, take } from 'rxjs';

import { AppError } from '../../../core/interfaces/api-response.model';
import { BookingRequest, BookingStatus } from '../../../core/interfaces/booking-request.model';
import { NotificationType } from '../../../core/interfaces/notification.model';
import {
  AvailabilityStatus,
  VendorAvailability,
} from '../../../core/interfaces/vendor-availability.model';
import { VendorDashboardStats } from '../../../core/interfaces/vendor-dashboard-stats.model';
import { VendorPackage } from '../../../core/interfaces/vendor-package.model';
import { NotificationService } from '../../../core/services/notification.service';
import { VendorAvailabilityService } from '../../../core/services/vendor-availability.service';
import { VendorBookingRequestService } from '../../../core/services/vendor-booking-request.service';
import { VendorPackageService } from '../../../core/services/vendor-package.service';
import { VendorProfileStateService } from '../../../core/services/vendor-profile-state.service';
import { VendorService } from '../../../core/services/vendor.service';
import { BookingRequestList } from '../booking-requests/booking-request-list/booking-request-list';
import { DashboardStats } from '../dashboard-stats/dashboard-stats';
import {
  VENDOR_CHART_PALETTE,
  VendorChartCard,
  VendorChartConfig,
} from '../shared/vendor-chart-card/vendor-chart-card';

type RevenueRange = '7d' | '30d' | '3m' | '12m';

interface RevenuePoint {
  label: string;
  total: number;
}

interface PackagePerformance {
  pkg: VendorPackage;
  bookingCount: number;
  revenue: number;
}

interface AvailabilitySummary {
  availableCount: number;
  bookedCount: number;
  blockedCount: number;
  nextAvailable: VendorAvailability[];
}

/** Bars in a fixed, meaningful order — colors picked to read at a glance (warm/waiting through to
 * negative outcomes), not just cycled from a generic palette. */
const BOOKING_STATUS_CATEGORIES = ['Pending', 'Accepted', 'Completed', 'Cancelled', 'Rejected', 'Expired'];
const BOOKING_STATUS_COLORS = ['#a8763f', '#d8461f', '#1f6e5c', '#8f8477', '#b8341e', '#2b3a55'];

/**
 * Single request that covers revenue trend, package performance, and the upcoming-bookings list —
 * capped rather than fully paginated (see BOOKINGS_FETCH_SIZE) to keep the dashboard to a handful
 * of parallel calls instead of paging through a vendor's entire history on every load. For vendors
 * whose lifetime booking count exceeds this cap, the revenue chart and Top Packages reflect their
 * most recent bookings rather than truly all-time figures — the KPI cards and booking-status chart
 * are unaffected since those come straight from the server-computed GetMyDashboardStats aggregate.
 */
const BOOKINGS_FETCH_SIZE = 300;

/**
 * Vendor business dashboard landing page. Composes:
 *  - KPI cards + booking-status chart from a single GET /api/vendors/me/dashboard-stats call
 *  - Revenue trend chart, Top Packages, and Upcoming Bookings derived client-side from one capped
 *    GET /api/booking-requests/incoming call (real PaidAt/AmountPaid + VendorPackageId fields —
 *    no invented figures; see the class doc above for the one honest limitation this implies)
 *  - Availability overview from GET /api/VendorAvailability/by-vendor/{id}
 *  - Recent Activity from the shared NotificationService cache (no extra call if the topbar bell
 *    already loaded it)
 *  - The existing pending-requests queue (BookingRequestList), reused as-is for Accept/Reject.
 */
@Component({
  selector: 'app-vendor-overview',
  standalone: true,
  imports: [RouterLink, DashboardStats, BookingRequestList, VendorChartCard, DecimalPipe, DatePipe],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview implements OnInit {
  private readonly vendorService = inject(VendorService);
  private readonly bookingService = inject(VendorBookingRequestService);
  private readonly packageService = inject(VendorPackageService);
  private readonly availabilityService = inject(VendorAvailabilityService);
  private readonly injector = inject(Injector);
  private readonly decimal = new DecimalPipe('en-US');

  protected readonly vendorProfileState = inject(VendorProfileStateService);
  protected readonly notificationService = inject(NotificationService);
  protected readonly NotificationType = NotificationType;

  // ---- Raw data, each with its own loading flag so sections render independently ----
  protected readonly stats = signal<VendorDashboardStats | null>(null);
  protected readonly statsLoading = signal(true);
  protected readonly statsError = signal<AppError | null>(null);

  protected readonly bookings = signal<BookingRequest[]>([]);
  protected readonly bookingsLoading = signal(true);
  protected readonly bookingsTotalCount = signal(0);

  protected readonly packages = signal<VendorPackage[]>([]);
  protected readonly packagesLoading = signal(true);

  protected readonly availability = signal<VendorAvailability[]>([]);
  protected readonly availabilityLoading = signal(true);

  protected readonly revenueRange = signal<RevenueRange>('30d');
  protected readonly revenueRangeOptions: { value: RevenueRange; label: string }[] = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '3m', label: '3M' },
    { value: '12m', label: '12M' },
  ];

  ngOnInit(): void {
    this.vendorProfileState.load();
    this.notificationService.loadOnce();
    this.loadStats();
    this.loadBookings();

    // Packages/availability need the vendor id, which the shell resolves
    // asynchronously via getMyProfile() — wait for it once rather than
    // polling, then fetch both in parallel.
    //
    // toObservable() calls inject(Injector) internally, which requires an
    // injection context — ngOnInit is not one, so this throws without the
    // explicit `injector` option (silently, past ngDevMode's dev-only assert,
    // since the inject() call itself is unconditional). Left implicit, that
    // exception aborts this method before .subscribe() ever runs, so
    // loadPackagesAndAvailability() is never called and packagesLoading /
    // availabilityLoading are stuck at their initial `true` forever — Top
    // Packages and Availability Overview spin indefinitely while every other
    // section (which doesn't wait on this observable) loads normally.
    toObservable(this.vendorProfileState.vendorId, { injector: this.injector })
      .pipe(
        filter((id): id is number => id !== null),
        take(1),
      )
      .subscribe((vendorId) => this.loadPackagesAndAvailability(vendorId));
  }

  private loadStats(): void {
    this.statsLoading.set(true);
    this.vendorService.getMyDashboardStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.statsLoading.set(false);
      },
      error: (err: AppError) => {
        this.statsError.set(err);
        this.statsLoading.set(false);
      },
    });
  }

  private loadBookings(): void {
    this.bookingsLoading.set(true);
    this.bookingService.listIncoming({ page: 1, pageSize: BOOKINGS_FETCH_SIZE }).subscribe({
      next: (result) => {
        this.bookings.set(result.items);
        this.bookingsTotalCount.set(result.totalCount);
        this.bookingsLoading.set(false);
      },
      error: () => this.bookingsLoading.set(false),
    });
  }

  private loadPackagesAndAvailability(vendorId: number): void {
    this.packageService.getByVendor(vendorId).subscribe({
      next: (packages) => {
        this.packages.set(packages);
        this.packagesLoading.set(false);
      },
      error: () => this.packagesLoading.set(false),
    });

    this.availabilityService.getByVendor(vendorId).subscribe({
      next: (slots) => {
        this.availability.set(slots);
        this.availabilityLoading.set(false);
      },
      error: () => this.availabilityLoading.set(false),
    });
  }

  protected setRevenueRange(range: RevenueRange): void {
    this.revenueRange.set(range);
  }

  // ==========================================================================
  // Empty-dashboard detection (Part 15) — a brand-new vendor with zero
  // bookings ever shouldn't see a wall of "0" KPI cards and empty charts.
  // ==========================================================================

  protected readonly isBrandNewVendor = computed(() => {
    const s = this.stats();
    return s !== null && s.totalBookingRequests === 0 && s.activePackages === 0;
  });

  // ==========================================================================
  // Revenue analytics — bucketed from real Payment.PaidAt/AmountPaid on each
  // fetched booking. No server-side time-series endpoint exists today (see
  // final report), so this is computed client-side from real data only.
  // ==========================================================================

  protected readonly hasAnyPaidBooking = computed(() =>
    this.bookings().some((b) => (b.payment?.amountPaid ?? 0) > 0),
  );

  protected readonly revenueSeries = computed<RevenuePoint[]>(() =>
    this.buildRevenueSeries(this.bookings(), this.revenueRange()),
  );

  protected readonly revenueChartConfig = computed<VendorChartConfig | null>(() => {
    if (!this.hasAnyPaidBooking()) {
      return null;
    }
    const points = this.revenueSeries();
    return {
      chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit', zoom: { enabled: false } },
      series: [{ name: 'Revenue', data: points.map((p) => Math.round(p.total)) }],
      xaxis: {
        categories: points.map((p) => p.label),
        labels: { style: { fontSize: '11px' }, rotate: 0 },
        tickAmount: points.length > 12 ? 6 : undefined,
      },
      yaxis: { labels: { formatter: (v: number) => this.decimal.transform(v, '1.0-0') ?? `${v}` } },
      colors: [VENDOR_CHART_PALETTE[0]],
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 100] },
      },
      dataLabels: { enabled: false },
      tooltip: {
        y: { formatter: (v: number) => `${this.decimal.transform(v, '1.0-0') ?? v} EGP` },
      },
      grid: { borderColor: 'rgba(36, 31, 28, 0.08)', strokeDashArray: 4 },
    };
  });

  private buildRevenueSeries(bookings: BookingRequest[], range: RevenueRange): RevenuePoint[] {
    const paid = bookings
      .filter((b) => b.payment?.paidAt && (b.payment?.amountPaid ?? 0) > 0)
      .map((b) => ({ date: new Date(b.payment!.paidAt as string), amount: b.payment!.amountPaid }));

    const now = new Date();

    if (range === '7d' || range === '30d') {
      const days = range === '7d' ? 7 : 30;
      const points: RevenuePoint[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const day = new Date(now);
        day.setHours(0, 0, 0, 0);
        day.setDate(day.getDate() - i);
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        const total = paid
          .filter((p) => p.date >= day && p.date < nextDay)
          .reduce((sum, p) => sum + p.amount, 0);
        points.push({
          label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          total,
        });
      }
      return points;
    }

    if (range === '3m') {
      const weeks = 12;
      const points: RevenuePoint[] = [];
      for (let i = weeks - 1; i >= 0; i--) {
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        end.setDate(end.getDate() - i * 7);
        const start = new Date(end);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 6);
        const total = paid
          .filter((p) => p.date >= start && p.date <= end)
          .reduce((sum, p) => sum + p.amount, 0);
        points.push({
          label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          total,
        });
      }
      return points;
    }

    // 12m: calendar-month buckets
    const months = 12;
    const points: RevenuePoint[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = paid
        .filter(
          (p) =>
            p.date.getFullYear() === monthStart.getFullYear() &&
            p.date.getMonth() === monthStart.getMonth(),
        )
        .reduce((sum, p) => sum + p.amount, 0);
      points.push({
        label: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        total,
      });
    }
    return points;
  }

  // ==========================================================================
  // Booking pipeline chart — straight from the server-computed stats DTO, so
  // it's exact (not capped by BOOKINGS_FETCH_SIZE) and costs no extra call.
  // ==========================================================================

  protected readonly bookingStatusChartConfig = computed<VendorChartConfig | null>(() => {
    const s = this.stats();
    if (!s || s.totalBookingRequests === 0) {
      return null;
    }
    const data = [
      s.pendingRequests,
      s.acceptedRequests,
      s.completedRequests,
      s.cancelledRequests,
      s.rejectedRequests,
      s.expiredRequests,
    ];
    return {
      chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
      series: [{ name: 'Bookings', data }],
      xaxis: { categories: BOOKING_STATUS_CATEGORIES, labels: { style: { fontSize: '11px' } } },
      yaxis: { labels: { formatter: (v: number) => `${Math.round(v)}` } },
      colors: BOOKING_STATUS_COLORS,
      plotOptions: { bar: { borderRadius: 6, columnWidth: '55%', distributed: true } },
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v: number) => `${v} booking${v === 1 ? '' : 's'}` } },
      grid: { borderColor: 'rgba(36, 31, 28, 0.08)', strokeDashArray: 4 },
    };
  });

  // ==========================================================================
  // Top Packages — cross-references fetched bookings with the vendor's own
  // packages via BookingRequest.vendorPackageId. No package-level stats
  // endpoint exists server-side (see final report), so this is a client-side
  // aggregation of real data, not an invented figure.
  // ==========================================================================

  protected readonly topPackages = computed<PackagePerformance[]>(() => {
    const pkgs = this.packages();
    if (pkgs.length === 0) {
      return [];
    }
    const byId = new Map<number, PackagePerformance>(
      pkgs.map((pkg) => [pkg.id, { pkg, bookingCount: 0, revenue: 0 }]),
    );
    for (const booking of this.bookings()) {
      if (booking.vendorPackageId === null) {
        continue;
      }
      const perf = byId.get(booking.vendorPackageId);
      if (!perf) {
        continue;
      }
      if (booking.status !== BookingStatus.Rejected && booking.status !== BookingStatus.Expired) {
        perf.bookingCount += 1;
      }
      perf.revenue += booking.payment?.amountPaid ?? 0;
    }
    return Array.from(byId.values())
      .filter((p) => p.bookingCount > 0)
      .sort((a, b) => b.revenue - a.revenue || b.bookingCount - a.bookingCount)
      .slice(0, 5);
  });

  protected readonly mostPopularPackage = computed<PackagePerformance | null>(() => {
    const top = this.topPackages();
    return top.length > 0 ? top[0] : null;
  });

  // ==========================================================================
  // Upcoming Bookings — Accepted requests with a future event date, mirroring
  // the same definition GetMyDashboardStats uses for "upcomingBookings".
  // ==========================================================================

  protected readonly upcomingBookings = computed<BookingRequest[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.bookings()
      .filter((b) => b.status === BookingStatus.Accepted && new Date(b.eventDate) >= today)
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
      .slice(0, 5);
  });

  protected packageTitleFor(booking: BookingRequest): string {
    if (booking.vendorPackageId === null) {
      return 'Custom booking';
    }
    return this.packages().find((p) => p.id === booking.vendorPackageId)?.title ?? 'Package';
  }

  // ==========================================================================
  // Availability overview
  // ==========================================================================

  protected readonly availabilitySummary = computed<AvailabilitySummary>(() => {
    const now = new Date();
    const upcoming = this.availability().filter((s) => new Date(s.startAt) >= now);
    return {
      availableCount: upcoming.filter((s) => s.status === AvailabilityStatus.Available).length,
      bookedCount: upcoming.filter((s) => s.status === AvailabilityStatus.Booked).length,
      blockedCount: upcoming.filter(
        (s) => s.status === AvailabilityStatus.Blocked || s.status === AvailabilityStatus.Held,
      ).length,
      nextAvailable: upcoming
        .filter((s) => s.status === AvailabilityStatus.Available)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .slice(0, 3),
    };
  });

  // ==========================================================================
  // Business summary — every figure derived from the already-fetched stats/
  // topPackages signals above; nothing here makes its own API call.
  // ==========================================================================

  protected readonly cancellationRate = computed<number | null>(() => {
    const s = this.stats();
    if (!s || s.totalBookingRequests === 0) {
      return null;
    }
    return (s.cancelledRequests / s.totalBookingRequests) * 100;
  });

  protected readonly averageBookingValue = computed<number | null>(() => {
    const s = this.stats();
    if (!s || s.totalCompletedBookings === 0) {
      return null;
    }
    return s.totalRevenue / s.totalCompletedBookings;
  });

  // ==========================================================================
  // Recent activity — reuses the shell's shared NotificationService cache
  // (the topbar bell already loads it); no dedicated activity endpoint is
  // invented here.
  // ==========================================================================

  protected readonly recentActivity = computed(() => this.notificationService.notifications().slice(0, 6));

  protected activityIcon(type: string | null): string {
    switch (type) {
      case NotificationType.BookingRequestReceived:
        return 'mail';
      case NotificationType.BookingAccepted:
        return 'task_alt';
      case NotificationType.BookingRejected:
        return 'cancel';
      case NotificationType.BookingCancelled:
        return 'event_busy';
      case NotificationType.PaymentReceived:
      case NotificationType.PaymentSuccessful:
        return 'payments';
      case NotificationType.BookingRequestExpired:
        return 'schedule';
      case NotificationType.ContractGenerated:
        return 'description';
      case NotificationType.VendorApproved:
        return 'verified';
      case NotificationType.VendorRejected:
        return 'error';
      default:
        return 'notifications';
    }
  }
}
