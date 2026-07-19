import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminBookingService } from '../../../../../core/services/admin-booking.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import { AdminDisputeListItem } from '../../../../../core/interfaces/admin-booking.model';
import { AdminBadge } from '../../../shared/admin-badge/admin-badge';
import { AdminEmptyState } from '../../../shared/admin-empty-state/admin-empty-state';
import { AdminErrorState } from '../../../shared/admin-error-state/admin-error-state';
import { AdminSkeletonRows } from '../../../shared/admin-skeleton/admin-skeleton';
import { mapBookingStatus, mapDisputeStatus } from '../../../shared/status-maps';

/** Open disputes queue (AdminDashboardPlan.md 2.8). */
@Component({
  selector: 'app-dispute-list',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, AdminBadge, AdminEmptyState, AdminErrorState, AdminSkeletonRows],
  templateUrl: './dispute-list.html',
  styleUrl: './dispute-list.css',
})
export class DisputeList implements OnInit {
  private readonly adminBookingService = inject(AdminBookingService);

  protected readonly mapDisputeStatus = mapDisputeStatus;
  protected readonly mapBookingStatus = mapBookingStatus;

  protected readonly disputes = signal<AdminDisputeListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminBookingService.getOpenDisputes().subscribe({
      next: (disputes) => {
        this.disputes.set(disputes);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }
}
