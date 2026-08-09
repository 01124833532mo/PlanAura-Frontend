import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { VendorProfileStateService } from '../../../core/services/vendor-profile-state.service';
import { createActiveRouteTitle } from '../../../shared/utils/active-route-title';
import { confirmLogout } from '../../../shared/utils/confirm-logout';
import { NotificationBell } from '../../../shared/ui/notification-bell/notification-bell';

@Component({
  selector: 'app-vendor-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBell],
  templateUrl: './vendor-shell.html',
  styleUrl: './vendor-shell.css',
})
export class VendorShell implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly vendorProfileState = inject(VendorProfileStateService);
  protected readonly pageTitle = createActiveRouteTitle('Booking Requests');

  /**
   * Drives the off-canvas nav drawer below the 768px breakpoint. Above it the
   * rail is always visible and this flag is inert, so nothing needs to reset
   * it on resize — the CSS simply stops reading the `--open` class.
   */
  protected readonly mobileNavOpen = signal(false);

  ngOnInit(): void {
    this.vendorProfileState.load();
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen.update((open) => !open);
  }

  /** Called from every drawer link so tapping one navigates *and* dismisses. */
  protected closeMobileNav(): void {
    this.mobileNavOpen.set(false);
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
