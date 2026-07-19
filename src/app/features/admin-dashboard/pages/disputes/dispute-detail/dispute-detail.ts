import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminBookingService } from '../../../../../core/services/admin-booking.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import { AdminDisputeDetails } from '../../../../../core/interfaces/admin-booking.model';
import { DisputeStatus } from '../../../../../core/interfaces/booking-request.model';
import { AdminBadge } from '../../../shared/admin-badge/admin-badge';
import { AdminErrorState } from '../../../shared/admin-error-state/admin-error-state';
import { adminNotifyError, adminNotifySuccess } from '../../../shared/admin-notify';
import { mapBookingPaymentStatus, mapBookingStatus, mapDisputeStatus } from '../../../shared/status-maps';

/** Dispute detail + resolution flow (AdminDashboardPlan.md 2.8). */
@Component({
  selector: 'app-dispute-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule, AdminBadge, AdminErrorState],
  templateUrl: './dispute-detail.html',
  styleUrl: './dispute-detail.css',
})
export class DisputeDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminBookingService = inject(AdminBookingService);

  protected readonly DisputeStatus = DisputeStatus;
  protected readonly mapBookingStatus = mapBookingStatus;
  protected readonly mapBookingPaymentStatus = mapBookingPaymentStatus;
  protected readonly mapDisputeStatus = mapDisputeStatus;

  protected readonly bookingId = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly dispute = signal<AdminDisputeDetails | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  protected readonly resolveDialogOpen = signal(false);
  protected readonly resolving = signal(false);
  protected readonly resolveError = signal<AppError | null>(null);

  protected resolutionNotes = '';
  protected refundClient = false;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.adminBookingService.getDisputeDetails(this.bookingId).subscribe({
      next: (dispute) => {
        this.dispute.set(dispute);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  protected openResolve(): void {
    this.resolutionNotes = '';
    this.refundClient = false;
    this.resolveError.set(null);
    this.resolveDialogOpen.set(true);
  }

  protected cancelResolve(): void {
    if (this.resolving()) return;
    this.resolveDialogOpen.set(false);
  }

  protected get canSubmitResolve(): boolean {
    return this.resolutionNotes.trim().length > 0 && !this.resolving();
  }

  protected submitResolve(): void {
    if (!this.canSubmitResolve) return;

    this.resolving.set(true);
    this.resolveError.set(null);

    this.adminBookingService
      .resolveDispute(this.bookingId, { resolutionNotes: this.resolutionNotes.trim(), refundClient: this.refundClient })
      .subscribe({
        next: () => {
          this.resolving.set(false);
          this.resolveDialogOpen.set(false);
          adminNotifySuccess('Dispute resolved.');
          this.load();
        },
        error: (err: AppError) => {
          this.resolveError.set(err);
          this.resolving.set(false);
          adminNotifyError('Failed to resolve dispute', err.message);
        },
      });
  }

  protected goBack(): void {
    this.router.navigateByUrl('/admin/disputes');
  }
}
