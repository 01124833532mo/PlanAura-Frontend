import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminNotificationService } from '../../../../../core/services/admin-notification.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import { BroadcastNotificationRequest } from '../../../../../core/interfaces/admin-account.model';
import { adminNotifyError, adminNotifySuccess } from '../../../shared/admin-notify';

/** Broadcast composer (AdminDashboardPlan.md 2.12) — send a notification to all clients, all vendors, or both. */
@Component({
  selector: 'app-notification-broadcast',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './notification-broadcast.html',
  styleUrl: './notification-broadcast.css',
})
export class NotificationBroadcast {
  private readonly notificationService = inject(AdminNotificationService);

  protected role: 'client' | 'vendor' | 'all' = 'all';
  protected type = 'announcement';
  protected title = '';
  protected body = '';

  protected readonly sending = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected get canSubmit(): boolean {
    return this.title.trim().length > 0 && this.type.trim().length > 0 && !this.sending();
  }

  protected submit(): void {
    if (!this.canSubmit) return;

    this.sending.set(true);
    this.error.set(null);

    const request: BroadcastNotificationRequest = {
      role: this.role,
      type: this.type.trim(),
      title: this.title.trim(),
      body: this.body.trim() || undefined,
    };

    this.notificationService.broadcast(request).subscribe({
      next: () => {
        this.sending.set(false);
        adminNotifySuccess('Broadcast sent.');
        this.title = '';
        this.body = '';
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.sending.set(false);
        adminNotifyError('Broadcast failed', err.message);
      },
    });
  }
}
