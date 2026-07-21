import { DatePipe } from '@angular/common';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DocumentDownload } from '../document-download/document-download';
import {
  AppNotification,
  ContractGeneratedClientData,
  ContractGeneratedVendorData,
  NotificationType,
  PartnershipAgreementGeneratedData,
  parseNotificationData,
} from '../../../core/interfaces/notification.model';
import { NotificationService } from '../../../core/services/notification.service';

/**
 * Reusable notification bell + dropdown panel, shared by the client and
 * vendor topbars (both use the same warm-coral theme/CSS variables — see
 * client-shell.css / vendor-shell.css). The admin shell keeps its own
 * bespoke markup in admin-shell.html/ts since it already had a scaffolded
 * panel wired into its distinct admin-theme styling.
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [DocumentDownload, DatePipe],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly notifications = this.notificationService.notifications;
  protected readonly unreadCount = this.notificationService.unreadCount;
  protected readonly loading = this.notificationService.loading;
  protected readonly open = signal(false);

  protected readonly NotificationType = NotificationType;

  ngOnInit(): void {
    this.notificationService.loadOnce();
  }

  protected toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) {
      this.notificationService.refresh();
    }
  }

  protected close(): void {
    this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }

  protected onNotificationClick(notification: AppNotification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }
  }

  protected markAllRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  /** Resolves the downloadable document URL (if any) carried in a notification's dataJson payload. */
  protected documentUrl(notification: AppNotification): string | null {
    switch (notification.type) {
      case NotificationType.ContractGenerated: {
        const clientData = parseNotificationData<ContractGeneratedClientData>(notification);
        if (clientData?.contractUrl) {
          return clientData.contractUrl;
        }
        const vendorData = parseNotificationData<ContractGeneratedVendorData>(notification);
        return vendorData?.contractUrl ?? null;
      }
      case NotificationType.PartnershipAgreementGenerated: {
        const data = parseNotificationData<PartnershipAgreementGeneratedData>(notification);
        return data?.agreementUrl ?? null;
      }
      default:
        return null;
    }
  }

  protected goToBookings(): void {
    this.close();
    this.router.navigateByUrl(this.router.url.startsWith('/vendor') ? '/vendor/dashboard/requests' : '/client/bookings');
  }
}
