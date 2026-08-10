import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminVendorPayoutService } from '../../../../../core/services/admin-vendor-payout.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import {
  VendorFinancialFilter,
  VendorFinancialSummary,
  VendorPayout,
} from '../../../../../core/interfaces/admin-vendor-payout.model';
import { AdminEmptyState } from '../../../shared/admin-empty-state/admin-empty-state';
import { AdminErrorState } from '../../../shared/admin-error-state/admin-error-state';
import { adminNotifyError, adminNotifySuccess } from '../../../shared/admin-notify';
import { AdminPagination } from '../../../shared/admin-pagination/admin-pagination';
import { AdminSkeletonRows } from '../../../shared/admin-skeleton/admin-skeleton';
import { AdminStatCard } from '../../../shared/admin-stat-card/admin-stat-card';

/** Vendor Payables: how much each vendor is owed based on actual collected payments, and manual payout recording. */
@Component({
  selector: 'app-vendor-payables-list',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    AdminEmptyState,
    AdminErrorState,
    AdminPagination,
    AdminSkeletonRows,
    AdminStatCard,
  ],
  templateUrl: './vendor-payables-list.html',
  styleUrl: './vendor-payables-list.css',
})
export class VendorPayablesList implements OnInit {
  private readonly adminVendorPayoutService = inject(AdminVendorPayoutService);

  protected readonly vendors = signal<VendorFinancialSummary[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  protected readonly filter = signal<VendorFinancialFilter>({ page: 1, pageSize: 20 });
  protected search = '';

  // Platform-wide totals across the whole result set, not just the current page.
  protected readonly totalPayable = signal(0);
  protected readonly totalCollected = signal(0);
  protected readonly totalRefunded = signal(0);

  // Record-payout modal state.
  protected readonly payoutTarget = signal<VendorFinancialSummary | null>(null);
  protected readonly recording = signal(false);
  protected readonly recordError = signal<AppError | null>(null);
  protected payoutAmount: number | null = null;
  protected payoutDate = new Date().toISOString().slice(0, 10);
  protected payoutReference = '';
  protected payoutNotes = '';

  // Payout history modal state.
  protected readonly historyTarget = signal<VendorFinancialSummary | null>(null);
  protected readonly historyLoading = signal(false);
  protected readonly historyError = signal<AppError | null>(null);
  protected readonly history = signal<VendorPayout[]>([]);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminVendorPayoutService.list(this.filter()).subscribe({
      next: (result) => {
        this.vendors.set(result.items);
        this.totalCount.set(result.totalCount);
        this.totalPayable.set(result.items.reduce((sum, v) => sum + v.amountPayable, 0));
        this.totalCollected.set(result.items.reduce((sum, v) => sum + v.totalCollected, 0));
        this.totalRefunded.set(result.items.reduce((sum, v) => sum + v.totalRefunded, 0));
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  protected onSearchSubmit(): void {
    this.filter.update((f) => ({ ...f, search: this.search.trim() || undefined, page: 1 }));
    this.load();
  }

  protected onPageChange(page: number): void {
    this.filter.update((f) => ({ ...f, page }));
    this.load();
  }

  protected openPayout(vendor: VendorFinancialSummary): void {
    this.payoutAmount = null;
    this.payoutDate = new Date().toISOString().slice(0, 10);
    this.payoutReference = '';
    this.payoutNotes = '';
    this.recordError.set(null);
    this.payoutTarget.set(vendor);
  }

  protected cancelPayout(): void {
    if (this.recording()) return;
    this.payoutTarget.set(null);
  }

  protected get canSubmitPayout(): boolean {
    return (
      !this.recording() &&
      this.payoutAmount !== null &&
      this.payoutAmount > 0 &&
      this.payoutDate.trim().length > 0
    );
  }

  protected submitPayout(): void {
    const target = this.payoutTarget();
    if (!target || !this.canSubmitPayout || this.payoutAmount === null) return;

    this.recording.set(true);
    this.recordError.set(null);

    this.adminVendorPayoutService
      .recordPayout(target.vendorId, {
        amount: this.payoutAmount,
        payoutDate: new Date(this.payoutDate).toISOString(),
        reference: this.payoutReference.trim() || undefined,
        notes: this.payoutNotes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.recording.set(false);
          this.payoutTarget.set(null);
          adminNotifySuccess('Payout recorded.');
          this.load();
        },
        error: (err: AppError) => {
          this.recordError.set(err);
          this.recording.set(false);
          adminNotifyError('Could not record payout', err.message);
        },
      });
  }

  protected openHistory(vendor: VendorFinancialSummary): void {
    this.historyTarget.set(vendor);
    this.historyError.set(null);
    this.history.set([]);
    this.historyLoading.set(true);

    this.adminVendorPayoutService.getHistory(vendor.vendorId).subscribe({
      next: (history) => {
        this.history.set(history);
        this.historyLoading.set(false);
      },
      error: (err: AppError) => {
        this.historyError.set(err);
        this.historyLoading.set(false);
      },
    });
  }

  protected closeHistory(): void {
    this.historyTarget.set(null);
  }
}
