import { DatePipe } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  AppNotification,
  NotificationType,
  PartnershipAgreementReviewData,
  parseNotificationData,
} from '../../../core/interfaces/notification.model';
import { NotificationService } from '../../../core/services/notification.service';
import { DocumentDownload } from '../../../shared/ui/document-download/document-download';
import { createActiveRouteTitle } from '../../../shared/utils/active-route-title';
import { confirmLogout } from '../../../shared/utils/confirm-logout';

interface AdminNavItem {
  label: string;
  path: string;
  icon: string;
}

interface AdminNavSection {
  label: string;
  items: AdminNavItem[];
}

/**
 * Root layout for every /admin/* route: a dark slate sidebar with grouped
 * navigation, a topbar reflecting the active route's title, and a
 * <router-outlet> for the page content. Distinct visual identity from
 * VendorShell/ClientShell by design — see admin-theme.css.
 */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, DatePipe, DocumentDownload],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.css',
})
export class AdminShell implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly pageTitle = createActiveRouteTitle('Overview');
  protected readonly sidebarCollapsed = signal(false);
  protected readonly mobileNavOpen = signal(false);

  protected readonly searchQuery = signal('');
  protected readonly searchOpen = signal(false);
  protected readonly notifOpen = signal(false);

  protected readonly NotificationType = NotificationType;
  protected readonly notifications = this.notificationService.notifications;
  protected readonly unreadNotifCount = this.notificationService.unreadCount;

  ngOnInit(): void {
    this.notificationService.loadOnce();
  }

  protected readonly navSections: AdminNavSection[] = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
        { label: 'Analytics', path: '/admin/analytics', icon: 'monitoring' },
      ],
    },
    {
      label: 'Management',
      items: [
        { label: 'Vendors', path: '/admin/vendors', icon: 'storefront' },
        { label: 'Verifications', path: '/admin/vendor-verifications', icon: 'verified' },
        { label: 'Clients', path: '/admin/clients', icon: 'group' },
        { label: 'Bookings', path: '/admin/bookings', icon: 'event_note' },
        { label: 'Cancellation Requests', path: '/admin/bookings/cancellation-requests', icon: 'event_busy' },
        { label: 'Disputes', path: '/admin/disputes', icon: 'gavel' },
        { label: 'Payments', path: '/admin/payments', icon: 'payments' },
        { label: 'Vendor Payables', path: '/admin/vendor-payables', icon: 'account_balance_wallet' },
      ],
    },
    {
      label: 'Platform',
      items: [
        { label: 'Reports', path: '/admin/reports', icon: 'bar_chart' },
        { label: 'Categories', path: '/admin/categories', icon: 'category' },
        { label: 'Notifications', path: '/admin/notifications', icon: 'campaign' },
        { label: 'Admin Accounts', path: '/admin/accounts', icon: 'admin_panel_settings' },
      ],
    },
  ];

/** Flattened once for the quick-nav search below, rather than recomputed on every keystroke. */
  private readonly allNavItems = this.navSections.flatMap((section) => section.items);

  protected readonly searchResults = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return [];
    return this.allNavItems.filter((item) => item.label.toLowerCase().includes(query)).slice(0, 6);
  });

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  protected closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  protected onSearchFocus(): void {
    this.searchOpen.set(true);
    this.notifOpen.set(false);
  }

  protected goToSearchResult(path: string): void {
    this.searchQuery.set('');
    this.searchOpen.set(false);
    this.router.navigateByUrl(path);
  }

  protected toggleNotifications(): void {
    this.notifOpen.update((v) => !v);
    this.searchOpen.set(false);
    if (this.notifOpen()) {
      this.notificationService.refresh();
    }
  }

  protected onNotificationClick(notification: AppNotification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }
  }

  protected markAllNotificationsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  /** Extracts the review payload for a partnership-agreement-pending-review admin notification. */
  protected partnershipReviewData(notification: AppNotification): PartnershipAgreementReviewData | null {
    if (notification.type !== NotificationType.PartnershipAgreementPendingReview) {
      return null;
    }
    return parseNotificationData<PartnershipAgreementReviewData>(notification);
  }

  protected openVendorProfile(vendorId: number): void {
    this.notifOpen.set(false);
    this.router.navigate(['/admin/vendors', vendorId]);
  }

  @HostListener('document:keydown.escape')
  protected closeOverlays(): void {
    this.searchOpen.set(false);
    this.notifOpen.set(false);
  }

  protected async logout(): Promise<void> {
    const confirmed = await confirmLogout();
    if (!confirmed) {
      return;
    }
    this.authService.logout();
    this.router.navigateByUrl('/auth');
  }
}
