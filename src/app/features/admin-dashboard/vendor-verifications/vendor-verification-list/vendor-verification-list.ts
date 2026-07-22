import { DatePipe } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  PendingVendorVerification,
  VendorVerificationDetails,
} from '../../../../core/interfaces/vendor-verification.model';
import { VendorType } from '../../../../core/interfaces/vendor.model';
import { VendorVerificationService } from '../../../../core/services/vendor-verification.service';
import { AdminBadge } from '../../shared/admin-badge/admin-badge';
import { AdminConfirmDialog } from '../../shared/admin-confirm-dialog/admin-confirm-dialog';
import { AdminEmptyState } from '../../shared/admin-empty-state/admin-empty-state';
import { mapVendorStatus } from '../../shared/status-maps';
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
    AdminBadge,
    AdminConfirmDialog,
    AdminEmptyState,
    DatePipe,
    RejectVendorDialog,
    VendorVerificationDetailsView,
  ],
  templateUrl: './vendor-verification-list.html',
  styleUrl: './vendor-verification-list.css',
})
export class VendorVerificationList implements OnDestroy {
  private readonly verificationService = inject(VendorVerificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private successTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly VendorType = VendorType;
  protected readonly mapVendorStatus = mapVendorStatus;

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

    // The dashboard's "Review" shortcut deep-links here as ?vendorId=N. There is no
    // routable detail page — the details view is a modal this page owns — so the id
    // arrives as a query param and opens the modal directly. Opening by id rather than
    // waiting for fetchPending() keeps the two requests independent, and surfaces a
    // real error in the modal if that vendor is no longer pending.
    const vendorId = Number(this.route.snapshot.queryParamMap.get('vendorId'));
    if (vendorId > 0) {
      this.loadDetails(vendorId);
    }
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
    this.loadDetails(request.vendorId);
  }

  private loadDetails(vendorId: number): void {
    this.selectedVendorId.set(vendorId);
    this.detailsData.set(null);
    this.detailsError.set(null);
    this.detailsLoading.set(true);

    this.verificationService.getDetails(vendorId).subscribe({
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

    // Drop the deep-link param so a refresh (or Back) doesn't reopen what was just closed.
    if (this.route.snapshot.queryParamMap.has('vendorId')) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { vendorId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
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
