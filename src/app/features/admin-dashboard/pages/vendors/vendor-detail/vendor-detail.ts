import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminAccountService } from '../../../../../core/services/admin-account.service';
import { VendorVerificationService } from '../../../../../core/services/vendor-verification.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import {
  VendorVerificationDetails,
  VendorVerificationDocument,
  VendorVerificationHistoryEntry,
  VendorVerificationPortfolioMedia,
  VERIFICATION_DOCUMENT_LABELS,
} from '../../../../../core/interfaces/vendor-verification.model';
import { VendorType } from '../../../../../core/interfaces/vendor.model';
import { AdminBadge } from '../../../shared/admin-badge/admin-badge';
import { AdminConfirmDialog } from '../../../shared/admin-confirm-dialog/admin-confirm-dialog';
import { AdminErrorState } from '../../../shared/admin-error-state/admin-error-state';
import { adminNotifyError, adminNotifySuccess } from '../../../shared/admin-notify';
import { AdminTimeline, AdminTimelineEntry } from '../../../shared/admin-timeline/admin-timeline';
import { mapAccountActive, mapVendorStatus } from '../../../shared/status-maps';
import { RejectVendorDialog } from '../../../vendor-verifications/reject-vendor-dialog/reject-vendor-dialog';

type ConfirmAction = 'approve' | 'suspend' | 'reactivate' | 'trust' | null;

/** Full vendor profile page — details, documents, portfolio, history, and moderation actions. */
@Component({
  selector: 'app-vendor-detail',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    AdminBadge,
    AdminConfirmDialog,
    AdminErrorState,
    AdminTimeline,
    RejectVendorDialog,
  ],
  templateUrl: './vendor-detail.html',
  styleUrl: './vendor-detail.css',
})
export class VendorDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly verificationService = inject(VendorVerificationService);
  private readonly accountService = inject(AdminAccountService);

  protected readonly VendorType = VendorType;
  protected readonly mapVendorStatus = mapVendorStatus;
  protected readonly mapAccountActive = mapAccountActive;

  protected readonly vendorId = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly details = signal<VendorVerificationDetails | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  protected readonly history = signal<VendorVerificationHistoryEntry[]>([]);
  protected readonly historyLoading = signal(true);

  protected readonly confirmAction = signal<ConfirmAction>(null);
  protected readonly actionLoading = signal(false);
  protected readonly actionError = signal<AppError | null>(null);

  protected readonly rejectDialogOpen = signal(false);
  protected readonly rejecting = signal(false);
  protected readonly rejectError = signal<AppError | null>(null);

  ngOnInit(): void {
    this.load();
    this.loadHistory();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.verificationService.getDetails(this.vendorId).subscribe({
      next: (details) => {
        this.details.set(details);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  protected loadHistory(): void {
    this.historyLoading.set(true);
    this.verificationService.getHistory(this.vendorId).subscribe({
      next: (entries) => {
        this.history.set(entries);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  protected get historyTimeline(): AdminTimelineEntry[] {
    return this.history().map((entry) => ({
      title: `${entry.previousStatus ?? 'New'} → ${entry.newStatus}`,
      subtitle: entry.notes ?? (entry.changedByAdminName ? `by ${entry.changedByAdminName}` : null),
      timestamp: entry.changedAt,
      icon: 'history',
      tone: entry.newStatus === 'rejected' ? 'danger' : entry.newStatus === 'trusted' ? 'purple' : 'indigo',
    }));
  }

  protected documentLabel(doc: VendorVerificationDocument): string {
    return VERIFICATION_DOCUMENT_LABELS[doc.documentType] ?? 'Document';
  }

  protected documentUrl(item: VendorVerificationDocument | VendorVerificationPortfolioMedia): string {
    return this.verificationService.resolveFileUrl(item.fileUrl);
  }

  // ---- Actions ----

  protected openApprove(): void {
    this.actionError.set(null);
    this.confirmAction.set('approve');
  }

  protected openTrust(): void {
    this.actionError.set(null);
    this.confirmAction.set('trust');
  }

  protected openSuspend(): void {
    this.actionError.set(null);
    this.confirmAction.set('suspend');
  }

  protected openReactivate(): void {
    this.actionError.set(null);
    this.confirmAction.set('reactivate');
  }

  protected cancelAction(): void {
    if (this.actionLoading()) return;
    this.confirmAction.set(null);
  }

  protected confirmDialogConfig(): { icon: string; title: string; message: string; confirmLabel: string; variant: 'primary' | 'danger' } {
    switch (this.confirmAction()) {
      case 'approve':
        return { icon: 'check_circle', title: 'Approve this vendor?', message: 'They will be verified and able to operate on PlanAura.', confirmLabel: 'Approve', variant: 'primary' };
      case 'trust':
        return { icon: 'workspace_premium', title: 'Promote to Trusted?', message: 'This vendor will be marked as an admin-curated Trusted vendor.', confirmLabel: 'Promote', variant: 'primary' };
      case 'suspend':
        return { icon: 'block', title: 'Suspend this account?', message: 'The vendor will be unable to log in until reactivated.', confirmLabel: 'Suspend', variant: 'danger' };
      case 'reactivate':
        return { icon: 'check_circle', title: 'Reactivate this account?', message: 'The vendor will regain access immediately.', confirmLabel: 'Reactivate', variant: 'primary' };
      default:
        return { icon: 'help', title: '', message: '', confirmLabel: 'Confirm', variant: 'primary' };
    }
  }

  protected confirmActionSubmit(): void {
    const action = this.confirmAction();
    if (!action) return;

    this.actionLoading.set(true);
    this.actionError.set(null);

    const onSuccess = (message: string) => {
      this.actionLoading.set(false);
      this.confirmAction.set(null);
      adminNotifySuccess(message);
      this.load();
      this.loadHistory();
    };
    const onError = (err: AppError) => {
      this.actionError.set(err);
      this.actionLoading.set(false);
      adminNotifyError('Action failed', err.message);
    };

    if (action === 'approve') {
      this.verificationService.approve(this.vendorId).subscribe({ next: () => onSuccess('Vendor approved.'), error: onError });
    } else if (action === 'trust') {
      this.verificationService.promoteToTrusted(this.vendorId).subscribe({ next: () => onSuccess('Vendor promoted to Trusted.'), error: onError });
    } else if (action === 'suspend') {
      const userId = this.details()?.userId;
      if (!userId) return;
      this.accountService.suspend(userId).subscribe({ next: () => onSuccess('Account suspended.'), error: onError });
    } else if (action === 'reactivate') {
      const userId = this.details()?.userId;
      if (!userId) return;
      this.accountService.reactivate(userId).subscribe({ next: () => onSuccess('Account reactivated.'), error: onError });
    }
  }

  protected openReject(): void {
    this.rejectError.set(null);
    this.rejectDialogOpen.set(true);
  }

  protected cancelReject(): void {
    if (this.rejecting()) return;
    this.rejectDialogOpen.set(false);
  }

  protected submitReject(reason: string): void {
    this.rejecting.set(true);
    this.rejectError.set(null);

    this.verificationService.reject({ vendorId: this.vendorId, rejectionReason: reason }).subscribe({
      next: () => {
        this.rejecting.set(false);
        this.rejectDialogOpen.set(false);
        adminNotifySuccess('Vendor rejected.');
        this.load();
        this.loadHistory();
      },
      error: (err: AppError) => {
        this.rejectError.set(err);
        this.rejecting.set(false);
      },
    });
  }

  protected goBack(): void {
    this.router.navigateByUrl('/admin/vendors');
  }
}
