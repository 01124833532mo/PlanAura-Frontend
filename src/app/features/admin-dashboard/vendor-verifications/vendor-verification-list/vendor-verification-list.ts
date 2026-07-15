import { DatePipe } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  PendingVendorVerification,
  VendorVerificationDetails,
} from '../../../../core/interfaces/vendor-verification.model';
import { VendorType } from '../../../../core/interfaces/vendor.model';
import { VendorVerificationService } from '../../../../core/services/vendor-verification.service';
import { RejectVendorDialog } from '../reject-vendor-dialog/reject-vendor-dialog';
import { VendorVerificationDetailsView } from '../vendor-verification-details/vendor-verification-details';

/**
 * Admin page listing all pending vendor verification requests, with actions
 * to review full details, approve, or reject each one. Talks to
 * AdminVendorVerificationController (GET pending/{id}, POST approve/reject)
 * via VendorVerificationService — no backend/API changes involved.
 */
@Component({
  selector: 'app-vendor-verification-list',
  standalone: true,
  imports: [
    AlertBanner,
    Button,
    ConfirmDialog,
    DatePipe,
    RejectVendorDialog,
    VendorVerificationDetailsView,
  ],
  templateUrl: './vendor-verification-list.html',
  styleUrl: './vendor-verification-list.css',
})
export class VendorVerificationList implements OnDestroy {
  private readonly verificationService = inject(VendorVerificationService);
  private successTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly VendorType = VendorType;

  protected readonly requests = signal<PendingVendorVerification[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // View Details modal
  protected readonly selectedVendorId = signal<number | null>(null);
  protected readonly detailsData = signal<VendorVerificationDetails | null>(null);
  protected readonly detailsLoading = signal(false);
  protected readonly detailsError = signal<AppError | null>(null);

  // Approve confirmation dialog
  protected readonly approveTarget = signal<PendingVendorVerification | null>(null);
  protected readonly approving = signal(false);
  protected readonly approveError = signal<AppError | null>(null);

  // Reject reason dialog
  protected readonly rejectTarget = signal<PendingVendorVerification | null>(null);
  protected readonly rejecting = signal(false);
  protected readonly rejectError = signal<AppError | null>(null);

  constructor() {
    this.fetchPending();
  }

  ngOnDestroy(): void {
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }
  }

  protected fetchPending(): void {
    this.loading.set(true);
    this.error.set(null);

    this.verificationService.getPending().subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  // ---- View Details ----

  protected openDetails(request: PendingVendorVerification): void {
    this.selectedVendorId.set(request.vendorId);
    this.detailsData.set(null);
    this.detailsError.set(null);
    this.detailsLoading.set(true);

    this.verificationService.getDetails(request.vendorId).subscribe({
      next: (details) => {
        this.detailsData.set(details);
        this.detailsLoading.set(false);
      },
      error: (err: AppError) => {
        this.detailsError.set(err);
        this.detailsLoading.set(false);
      },
    });
  }

  protected closeDetails(): void {
    this.selectedVendorId.set(null);
    this.detailsData.set(null);
    this.detailsError.set(null);
  }

  // ---- Approve ----

  protected openApprove(request: PendingVendorVerification): void {
    this.approveError.set(null);
    this.approveTarget.set(request);
  }

  protected cancelApprove(): void {
    if (this.approving()) {
      return;
    }
    this.approveTarget.set(null);
  }

  protected confirmApprove(): void {
    const request = this.approveTarget();
    if (!request) {
      return;
    }

    this.approving.set(true);
    this.approveError.set(null);

    this.verificationService.approve(request.vendorId).subscribe({
      next: () => {
        this.approving.set(false);
        this.approveTarget.set(null);
        this.showSuccess(`${request.vendorName} was approved successfully.`);
        this.fetchPending();
      },
      error: (err: AppError) => {
        this.approveError.set(err);
        this.approving.set(false);
      },
    });
  }

  // ---- Reject ----

  protected openReject(request: PendingVendorVerification): void {
    this.rejectError.set(null);
    this.rejectTarget.set(request);
  }

  protected cancelReject(): void {
    if (this.rejecting()) {
      return;
    }
    this.rejectTarget.set(null);
  }

  protected submitReject(reason: string): void {
    const request = this.rejectTarget();
    if (!request) {
      return;
    }

    this.rejecting.set(true);
    this.rejectError.set(null);

    this.verificationService
      .reject({ vendorId: request.vendorId, rejectionReason: reason })
      .subscribe({
        next: () => {
          this.rejecting.set(false);
          this.rejectTarget.set(null);
          this.showSuccess(`${request.vendorName}'s verification was rejected.`);
          this.fetchPending();
        },
        error: (err: AppError) => {
          this.rejectError.set(err);
          this.rejecting.set(false);
        },
      });
  }

  // ---- Shared ----

  private showSuccess(message: string): void {
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }
    this.successMessage.set(message);
    this.successTimeout = setTimeout(() => this.successMessage.set(null), 6000);
  }
}
