import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAccountService } from '../../../../../core/services/admin-account.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import { AdminAccount, CreateAdminRequest } from '../../../../../core/interfaces/admin-account.model';
import { AdminBadge } from '../../../shared/admin-badge/admin-badge';
import { AdminConfirmDialog } from '../../../shared/admin-confirm-dialog/admin-confirm-dialog';
import { AdminEmptyState } from '../../../shared/admin-empty-state/admin-empty-state';
import { AdminErrorState } from '../../../shared/admin-error-state/admin-error-state';
import { adminNotifyError, adminNotifySuccess } from '../../../shared/admin-notify';
import { AdminSkeletonRows } from '../../../shared/admin-skeleton/admin-skeleton';
import { mapAccountActive } from '../../../shared/status-maps';

const EMPTY_FORM: CreateAdminRequest = { fullName: '', email: '', phoneNumber: '', password: '', confirmPassword: '' };

type ConfirmAction = { type: 'suspend' | 'reactivate'; account: AdminAccount } | null;

/** Admin Accounts management (AdminDashboardPlan.md 2.13) — list/create additional admins. */
@Component({
  selector: 'app-admin-accounts',
  standalone: true,
  imports: [FormsModule, DatePipe, AdminBadge, AdminConfirmDialog, AdminEmptyState, AdminErrorState, AdminSkeletonRows],
  templateUrl: './admin-accounts.html',
  styleUrl: './admin-accounts.css',
})
export class AdminAccounts implements OnInit {
  private readonly accountService = inject(AdminAccountService);

  protected readonly mapAccountActive = mapAccountActive;

  protected readonly accounts = signal<AdminAccount[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  protected readonly formOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<AppError | null>(null);
  protected form: CreateAdminRequest = { ...EMPTY_FORM };

  protected readonly confirmAction = signal<ConfirmAction>(null);
  protected readonly actionLoading = signal(false);
  protected readonly actionError = signal<AppError | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.accountService.listAdmins().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.form = { ...EMPTY_FORM };
    this.saveError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    if (this.saving()) return;
    this.formOpen.set(false);
  }

  protected get canSubmit(): boolean {
    return (
      this.form.fullName.trim().length > 1 &&
      this.form.email.trim().length > 3 &&
      this.form.password.length >= 8 &&
      this.form.password === this.form.confirmPassword &&
      !this.saving()
    );
  }

  protected submitForm(): void {
    if (!this.canSubmit) return;

    this.saving.set(true);
    this.saveError.set(null);

    this.accountService.createAdmin(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        adminNotifySuccess('Admin account created.');
        this.load();
      },
      error: (err: AppError) => {
        this.saveError.set(err);
        this.saving.set(false);
      },
    });
  }

  protected openSuspend(account: AdminAccount): void {
    this.actionError.set(null);
    this.confirmAction.set({ type: 'suspend', account });
  }

  protected openReactivate(account: AdminAccount): void {
    this.actionError.set(null);
    this.confirmAction.set({ type: 'reactivate', account });
  }

  protected cancelAction(): void {
    if (this.actionLoading()) return;
    this.confirmAction.set(null);
  }

  protected confirmActionSubmit(): void {
    const action = this.confirmAction();
    if (!action) return;

    this.actionLoading.set(true);
    this.actionError.set(null);

    const call = action.type === 'suspend' ? this.accountService.suspend(action.account.userId) : this.accountService.reactivate(action.account.userId);
    call.subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.confirmAction.set(null);
        adminNotifySuccess(action.type === 'suspend' ? 'Admin suspended.' : 'Admin reactivated.');
        this.load();
      },
      error: (err: AppError) => {
        this.actionError.set(err);
        this.actionLoading.set(false);
        adminNotifyError('Action failed', err.message);
      },
    });
  }
}
