import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminAccountService } from '../../../../../core/services/admin-account.service';
import { AdminClientService } from '../../../../../core/services/admin-client.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import { AdminClientDetails } from '../../../../../core/interfaces/admin-client.model';
import { AdminConfirmDialog } from '../../../shared/admin-confirm-dialog/admin-confirm-dialog';
import { AdminErrorState } from '../../../shared/admin-error-state/admin-error-state';
import { adminNotifyError, adminNotifySuccess } from '../../../shared/admin-notify';
import { mapAccountActive } from '../../../shared/status-maps';

type ConfirmAction = 'suspend' | 'reactivate' | null;

/** Client detail page — profile, event plans, booking history, and lifetime spend. */
@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe, AdminConfirmDialog, AdminErrorState],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.css',
})
export class ClientDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminClientService = inject(AdminClientService);
  private readonly accountService = inject(AdminAccountService);

  protected readonly mapAccountActive = mapAccountActive;
  protected readonly clientId = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly details = signal<AdminClientDetails | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  protected readonly confirmAction = signal<ConfirmAction>(null);
  protected readonly actionLoading = signal(false);
  protected readonly actionError = signal<AppError | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.adminClientService.getDetails(this.clientId).subscribe({
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
    return this.confirmAction() === 'suspend'
      ? { icon: 'block', title: 'Suspend this account?', message: 'The client will be unable to log in until reactivated.', confirmLabel: 'Suspend', variant: 'danger' }
      : { icon: 'check_circle', title: 'Reactivate this account?', message: 'The client will regain access immediately.', confirmLabel: 'Reactivate', variant: 'primary' };
  }

  protected confirmActionSubmit(): void {
    const action = this.confirmAction();
    const userId = this.details()?.userId;
    if (!action || !userId) return;

    this.actionLoading.set(true);
    this.actionError.set(null);

    const call = action === 'suspend' ? this.accountService.suspend(userId) : this.accountService.reactivate(userId);
    call.subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.confirmAction.set(null);
        adminNotifySuccess(action === 'suspend' ? 'Account suspended.' : 'Account reactivated.');
        this.load();
      },
      error: (err: AppError) => {
        this.actionError.set(err);
        this.actionLoading.set(false);
        adminNotifyError('Action failed', err.message);
      },
    });
  }

  protected goBack(): void {
    this.router.navigateByUrl('/admin/clients');
  }
}
