import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ClientProfileStateService } from '../../../core/services/client-profile-state.service';
import { confirmLogout } from '../../utils/confirm-logout';
import { NotificationBell } from '../notification-bell/notification-bell';

/**
 * Top navigation for the public/marketing side of the site (Home, Explore
 * Services, Explore Vendors, Vendor Details, How It Works) — the real-website
 * navbar the redesign is built around, as opposed to the account sidebar
 * (client-shell) which only wraps the authenticated "my stuff" pages.
 *
 * Works for both guests and signed-in clients: guests see Log In/Sign Up,
 * clients see the notification bell + an avatar menu into their account
 * area. Vendors/admins who land here (e.g. via the logo) get a simple link
 * back to their own dashboard instead of the client-only avatar menu.
 */
@Component({
  selector: 'app-public-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NotificationBell],
  templateUrl: './public-navbar.html',
  styleUrl: './public-navbar.css',
})
export class PublicNavbar {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly clientProfileState = inject(ClientProfileStateService);

  protected readonly isAuthenticated = this.authService.isAuthenticated;
  protected readonly isClient = this.authService.isClient;
  protected readonly isVendor = this.authService.isVendor;
  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly currentUser = this.authService.currentUser;

  protected readonly mobileMenuOpen = signal(false);
  protected readonly accountMenuOpen = signal(false);
  protected readonly avatarBroken = signal(false);

  constructor() {
    // Only clients have a profile (avatar) worth fetching here — calling this
    // for a guest would just be a wasted 401 round-trip, and vendors/admins
    // don't use ClientProfile at all.
    if (this.isClient() && !this.clientProfileState.profile()) {
      this.clientProfileState.load();
    }
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  protected toggleAccountMenu(): void {
    this.accountMenuOpen.update((open) => !open);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.accountMenuOpen()) {
      return;
    }
    const target = event.target as HTMLElement;
    if (!target.closest('.public-nav__account')) {
      this.accountMenuOpen.set(false);
    }
  }

  protected dashboardLink(): string {
    if (this.isAdmin()) {
      return '/admin/dashboard';
    }
    if (this.isVendor()) {
      return '/vendor/dashboard';
    }
    return '/client/dashboard';
  }

  protected async logout(): Promise<void> {
    const confirmed = await confirmLogout();
    if (!confirmed) {
      return;
    }
    this.accountMenuOpen.set(false);
    this.mobileMenuOpen.set(false);
    this.authService.logout();
    this.router.navigateByUrl('/');
  }
}
