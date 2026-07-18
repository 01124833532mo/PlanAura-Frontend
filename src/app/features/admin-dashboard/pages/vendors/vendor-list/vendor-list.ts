import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminVendorService } from '../../../../../core/services/admin-vendor.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import {
  AdminVendorFilter,
  AdminVendorListItem,
  AdminVendorStatusCounts,
} from '../../../../../core/interfaces/admin-vendor.model';
import { VendorType } from '../../../../../core/interfaces/vendor.model';
import { AdminBadge } from '../../../shared/admin-badge/admin-badge';
import { AdminEmptyState } from '../../../shared/admin-empty-state/admin-empty-state';
import { AdminErrorState } from '../../../shared/admin-error-state/admin-error-state';
import { AdminPagination } from '../../../shared/admin-pagination/admin-pagination';
import { AdminSearchBar } from '../../../shared/admin-search-bar/admin-search-bar';
import { AdminSkeletonRows } from '../../../shared/admin-skeleton/admin-skeleton';
import { mapVendorStatus } from '../../../shared/status-maps';

const STATUS_TABS: { label: string; value: string | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Unverified', value: 'unverified' },
  { label: 'Pending', value: 'pending' },
  { label: 'Verified', value: 'verified' },
  { label: 'Trusted', value: 'trusted' },
  { label: 'Rejected', value: 'rejected' },
];

/** "All Vendors" roster (AdminDashboardPlan.md 2.4) — search/filter/sort/paginate every vendor. */
@Component({
  selector: 'app-vendor-list',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    AdminBadge,
    AdminEmptyState,
    AdminErrorState,
    AdminPagination,
    AdminSearchBar,
    AdminSkeletonRows,
  ],
  templateUrl: './vendor-list.html',
  styleUrl: './vendor-list.css',
})
export class VendorList implements OnInit {
  private readonly adminVendorService = inject(AdminVendorService);

  protected readonly VendorType = VendorType;
  protected readonly mapVendorStatus = mapVendorStatus;
  protected readonly statusTabs = STATUS_TABS;

  protected readonly vendors = signal<AdminVendorListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  protected readonly statusCounts = signal<AdminVendorStatusCounts | null>(null);

  protected readonly filter = signal<AdminVendorFilter>({ page: 1, pageSize: 20 });

  ngOnInit(): void {
    this.load();
    this.adminVendorService.getStatusCounts().subscribe({
      next: (counts) => this.statusCounts.set(counts),
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminVendorService.list(this.filter()).subscribe({
      next: (result) => {
        this.vendors.set(result.items);
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

  protected onStatusTab(status: string | undefined): void {
    this.filter.update((f) => ({ ...f, status, page: 1 }));
    this.load();
  }

  protected isActiveTab(status: string | undefined): boolean {
    return this.filter().status === status;
  }

  protected onPageChange(page: number): void {
    this.filter.update((f) => ({ ...f, page }));
    this.load();
  }
}
