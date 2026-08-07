import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminBookingService } from '../../../../../core/services/admin-booking.service';
import { AdminPaymentService } from '../../../../../core/services/admin-payment.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import { AdminBookingPaymentDetail } from '../../../../../core/interfaces/admin-booking.model';
import { AdminPaymentFilter, AdminPaymentListItem, AdminPaymentSummary } from '../../../../../core/interfaces/admin-payment.model';
import { PaymentStatus } from '../../../../../core/interfaces/payment.model';
import { AdminBadge } from '../../../shared/admin-badge/admin-badge';
import { AdminEmptyState } from '../../../shared/admin-empty-state/admin-empty-state';
import { AdminErrorState } from '../../../shared/admin-error-state/admin-error-state';
import { adminNotifyError, adminNotifySuccess } from '../../../shared/admin-notify';
import { AdminPagination } from '../../../shared/admin-pagination/admin-pagination';
import { AdminSkeletonRows } from '../../../shared/admin-skeleton/admin-skeleton';
import { AdminStatCard } from '../../../shared/admin-stat-card/admin-stat-card';
import { mapBookingPaymentStatus, mapPaymentStatus, mapRefundStatus } from '../../../shared/status-maps';

const STATUS_OPTIONS: { label: string; value: PaymentStatus | undefined }[] = [
  { label: 'All statuses', value: undefined },
  { label: 'Pending', value: PaymentStatus.Pending },
  { label: 'Authorized', value: PaymentStatus.Authorized },
  { label: 'Completed', value: PaymentStatus.Completed },
  { label: 'Failed', value: PaymentStatus.Failed },
  { label: 'Refunded', value: PaymentStatus.Refunded },
  { label: 'Cancelled', value: PaymentStatus.Cancelled },
];

/** Payments & Transactions (AdminDashboardPlan.md 2.9). */
@Component({
  selector: 'app-payment-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, AdminBadge, AdminEmptyState, AdminErrorState, AdminPagination, AdminSkeletonRows, AdminStatCard],
  templateUrl: './payment-list.html',
  styleUrl: './payment-list.css',
})
export class PaymentList implements OnInit {
  private readonly adminPaymentService = inject(AdminPaymentService);
  private readonly adminBookingService = inject(AdminBookingService);

  protected readonly paymentDetail = signal<AdminBookingPaymentDetail | null>(null);
  protected readonly paymentDetailLoading = signal(false);
  protected readonly paymentDetailError = signal<AppError | null>(null);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly PaymentStatus = PaymentStatus;
  protected readonly mapPaymentStatus = mapPaymentStatus;
  protected readonly mapBookingPaymentStatus = mapBookingPaymentStatus;
  protected readonly mapRefundStatus = mapRefundStatus;

  protected readonly payments = signal<AdminPaymentListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  protected readonly summary = signal<AdminPaymentSummary | null>(null);

  protected readonly filter = signal<AdminPaymentFilter>({ page: 1, pageSize: 20 });

  protected readonly refundTarget = signal<AdminPaymentListItem | null>(null);
  protected readonly refunding = signal(false);
  protected readonly refundError = signal<AppError | null>(null);
  protected refundReason = '';
  protected refundAmount: number | null = null;

  ngOnInit(): void {
    this.load();
    this.adminPaymentService.getSummary().subscribe({ next: (s) => this.summary.set(s) });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminPaymentService.list(this.filter()).subscribe({
      next: (result) => {
        this.payments.set(result.items);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  protected onStatusChange(value: string): void {
    const status = value === '' ? undefined : (Number(value) as PaymentStatus);
    this.filter.update((f) => ({ ...f, status, page: 1 }));
    this.load();
  }

  protected onPageChange(page: number): void {
    this.filter.update((f) => ({ ...f, page }));
    this.load();
  }

  protected openPaymentDetail(payment: AdminPaymentListItem): void {
    this.paymentDetail.set(null);
    this.paymentDetailError.set(null);
    this.paymentDetailLoading.set(true);

    this.adminBookingService.getPaymentDetail(payment.bookingRequestId).subscribe({
      next: (detail) => {
        this.paymentDetail.set(detail);
        this.paymentDetailLoading.set(false);
      },
      error: (err: AppError) => {
        this.paymentDetailError.set(err);
        this.paymentDetailLoading.set(false);
      },
    });
  }

  protected closePaymentDetail(): void {
    this.paymentDetail.set(null);
    this.paymentDetailError.set(null);
  }

  protected openRefund(payment: AdminPaymentListItem): void {
    this.refundReason = '';
    this.refundAmount = null;
    this.refundError.set(null);
    this.refundTarget.set(payment);
  }

  protected cancelRefund(): void {
    if (this.refunding()) return;
    this.refundTarget.set(null);
  }

  protected get canSubmitRefund(): boolean {
    return this.refundReason.trim().length > 0 && !this.refunding();
  }

  protected submitRefund(): void {
    const target = this.refundTarget();
    if (!target || !this.canSubmitRefund) return;

    this.refunding.set(true);
    this.refundError.set(null);

    this.adminPaymentService
      .refund(target.paymentId, { reason: this.refundReason.trim(), amount: this.refundAmount ?? undefined })
      .subscribe({
        next: () => {
          this.refunding.set(false);
          this.refundTarget.set(null);
          adminNotifySuccess('Payment refunded.');
          this.load();
          this.adminPaymentService.getSummary().subscribe({ next: (s) => this.summary.set(s) });
        },
        error: (err: AppError) => {
          this.refundError.set(err);
          this.refunding.set(false);
          adminNotifyError('Refund failed', err.message);
        },
      });
  }
}
