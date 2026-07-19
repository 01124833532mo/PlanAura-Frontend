import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminDashboardService } from '../../../../core/services/admin-dashboard.service';
import { AdminReportService } from '../../../../core/services/admin-report.service';
import { DashboardStatistics } from '../../../../core/interfaces/admin-dashboard.model';
import {
  MonthlyAmount,
  MonthlyCount,
  MonthlyRegistrations,
  TopCategory,
  TopVendor,
  VendorVerificationFunnel,
} from '../../../../core/interfaces/admin-report.model';
import { ADMIN_CHART_PALETTE, AdminChartCard, AdminChartConfig } from '../../shared/admin-chart-card/admin-chart-card';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(year: number, month: number): string {
  return `${MONTH_LABELS[month - 1] ?? month} '${String(year).slice(2)}`;
}

/** Analytics dashboard — charts covering revenue, bookings, vendor verification, and growth. */
@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [AdminChartCard],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css',
})
export class Analytics implements OnInit {
  private readonly reportService = inject(AdminReportService);
  private readonly dashboardService = inject(AdminDashboardService);

  protected readonly loadingRevenue = signal(true);
  protected readonly loadingBookings = signal(true);
  protected readonly loadingStatus = signal(true);
  protected readonly loadingFunnel = signal(true);
  protected readonly loadingGrowth = signal(true);
  protected readonly loadingTopVendors = signal(true);
  protected readonly loadingTopCategories = signal(true);

  protected revenueChart: AdminChartConfig = { chart: { type: 'area', toolbar: { show: false } }, series: [] };
  protected bookingsChart: AdminChartConfig = { chart: { type: 'bar', toolbar: { show: false } }, series: [] };
  protected statusChart: AdminChartConfig = { chart: { type: 'donut' }, series: [] };
  protected funnelChart: AdminChartConfig = { chart: { type: 'bar', toolbar: { show: false } }, series: [] };
  protected growthChart: AdminChartConfig = { chart: { type: 'area', stacked: true, toolbar: { show: false } }, series: [] };
  protected topVendorsChart: AdminChartConfig = { chart: { type: 'bar', toolbar: { show: false } }, series: [] };
  protected topCategoriesChart: AdminChartConfig = { chart: { type: 'bar', toolbar: { show: false } }, series: [] };

  ngOnInit(): void {
    this.reportService.getRevenueMonthly(12).subscribe({
      next: (data) => {
        this.revenueChart = this.buildAreaConfig(data);
        this.loadingRevenue.set(false);
      },
      error: () => this.loadingRevenue.set(false),
    });

    this.reportService.getBookingsMonthly(12).subscribe({
      next: (data) => {
        this.bookingsChart = this.buildBookingsBarConfig(data);
        this.loadingBookings.set(false);
      },
      error: () => this.loadingBookings.set(false),
    });

    this.dashboardService.getStatistics().subscribe({
      next: (stats) => {
        this.statusChart = this.buildStatusDonutConfig(stats);
        this.loadingStatus.set(false);
      },
      error: () => this.loadingStatus.set(false),
    });

    this.reportService.getVendorFunnel().subscribe({
      next: (funnel) => {
        this.funnelChart = this.buildFunnelConfig(funnel);
        this.loadingFunnel.set(false);
      },
      error: () => this.loadingFunnel.set(false),
    });

    this.reportService.getUserRegistrations(12).subscribe({
      next: (data) => {
        this.growthChart = this.buildGrowthConfig(data);
        this.loadingGrowth.set(false);
      },
      error: () => this.loadingGrowth.set(false),
    });

    this.reportService.getTopVendors('revenue', 8).subscribe({
      next: (data) => {
        this.topVendorsChart = this.buildTopVendorsConfig(data);
        this.loadingTopVendors.set(false);
      },
      error: () => this.loadingTopVendors.set(false),
    });

    this.reportService.getTopCategories('vendors', 8).subscribe({
      next: (data) => {
        this.topCategoriesChart = this.buildTopCategoriesConfig(data);
        this.loadingTopCategories.set(false);
      },
      error: () => this.loadingTopCategories.set(false),
    });
  }

  private buildAreaConfig(data: MonthlyAmount[]): AdminChartConfig {
    return {
      chart: { type: 'area', toolbar: { show: false }, animations: { enabled: true } },
      series: [{ name: 'Revenue (EGP)', data: data.map((d) => d.amount) }],
      xaxis: { categories: data.map((d) => monthLabel(d.year, d.month)) },
      colors: [ADMIN_CHART_PALETTE[0]],
      stroke: { curve: 'smooth', width: 2.5 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v: number) => `${v.toLocaleString()} EGP` } },
    };
  }

  private buildBookingsBarConfig(data: MonthlyCount[]): AdminChartConfig {
    return {
      chart: { type: 'bar', toolbar: { show: false } },
      series: [{ name: 'Bookings', data: data.map((d) => d.count) }],
      xaxis: { categories: data.map((d) => monthLabel(d.year, d.month)) },
      colors: [ADMIN_CHART_PALETTE[1]],
      plotOptions: { bar: { borderRadius: 5, columnWidth: '55%' } },
      dataLabels: { enabled: false },
    };
  }

  private buildStatusDonutConfig(stats: DashboardStatistics): AdminChartConfig {
    const entries = Object.entries(stats.bookingsByStatus ?? {});
    return {
      chart: { type: 'donut' },
      series: entries.map(([, count]) => count),
      labels: entries.map(([status]) => status),
      colors: ADMIN_CHART_PALETTE,
      legend: { position: 'bottom' },
    };
  }

  private buildFunnelConfig(funnel: VendorVerificationFunnel): AdminChartConfig {
    return {
      chart: { type: 'bar', toolbar: { show: false } },
      series: [{ name: 'Vendors', data: [funnel.submitted, funnel.pending, funnel.approved, funnel.rejected] }],
      xaxis: { categories: ['Submitted', 'Pending', 'Approved', 'Rejected'] },
      colors: [ADMIN_CHART_PALETTE[2]],
      plotOptions: { bar: { borderRadius: 5, horizontal: true } },
      dataLabels: { enabled: true },
    };
  }

  private buildGrowthConfig(data: MonthlyRegistrations[]): AdminChartConfig {
    return {
      chart: { type: 'area', stacked: true, toolbar: { show: false } },
      series: [
        { name: 'Clients', data: data.map((d) => d.clientCount) },
        { name: 'Vendors', data: data.map((d) => d.vendorCount) },
      ],
      xaxis: { categories: data.map((d) => monthLabel(d.year, d.month)) },
      colors: [ADMIN_CHART_PALETTE[0], ADMIN_CHART_PALETTE[2]],
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
      dataLabels: { enabled: false },
      legend: { position: 'top' },
    };
  }

  private buildTopVendorsConfig(data: TopVendor[]): AdminChartConfig {
    return {
      chart: { type: 'bar', toolbar: { show: false } },
      series: [{ name: 'Revenue (EGP)', data: data.map((d) => d.revenue) }],
      xaxis: { categories: data.map((d) => d.businessName) },
      colors: [ADMIN_CHART_PALETTE[3]],
      plotOptions: { bar: { borderRadius: 4, horizontal: true } },
      dataLabels: { enabled: false },
    };
  }

  private buildTopCategoriesConfig(data: TopCategory[]): AdminChartConfig {
    return {
      chart: { type: 'bar', toolbar: { show: false } },
      series: [{ name: 'Vendors', data: data.map((d) => d.vendorCount) }],
      xaxis: { categories: data.map((d) => d.categoryName) },
      colors: [ADMIN_CHART_PALETTE[4]],
      plotOptions: { bar: { borderRadius: 4 } },
      dataLabels: { enabled: false },
    };
  }
}
