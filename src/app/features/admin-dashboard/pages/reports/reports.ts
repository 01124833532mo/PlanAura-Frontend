import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminReportService } from '../../../../core/services/admin-report.service';
import {
  MonthlyRegistrations,
  TopCategory,
  TopVendor,
  VendorVerificationFunnel,
} from '../../../../core/interfaces/admin-report.model';

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Tabular reports — top vendors/categories, registration trends, and the verification funnel. */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit {
  private readonly reportService = inject(AdminReportService);

  protected readonly topVendorsByRevenue = signal<TopVendor[]>([]);
  protected readonly topVendorsByBookings = signal<TopVendor[]>([]);
  protected readonly topCategories = signal<TopCategory[]>([]);
  protected readonly registrations = signal<MonthlyRegistrations[]>([]);
  protected readonly funnel = signal<VendorVerificationFunnel | null>(null);

  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.reportService.getTopVendors('revenue', 10).subscribe({ next: (data) => this.topVendorsByRevenue.set(data) });
    this.reportService.getTopVendors('bookings', 10).subscribe({ next: (data) => this.topVendorsByBookings.set(data) });
    this.reportService.getTopCategories('bookings', 10).subscribe({ next: (data) => this.topCategories.set(data) });
    this.reportService.getVendorFunnel().subscribe({ next: (funnel) => this.funnel.set(funnel) });
    this.reportService.getUserRegistrations(12).subscribe({
      next: (data) => {
        this.registrations.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected monthName(month: number): string {
    return MONTH_LABELS[month - 1] ?? String(month);
  }

  protected funnelDropoff(from: number, to: number): string {
    if (from === 0) return '—';
    return `${Math.round((to / from) * 100)}%`;
  }
}
