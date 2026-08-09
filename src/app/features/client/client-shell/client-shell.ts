import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ClientProfileStateService } from '../../../core/services/client-profile-state.service';
import { createActiveRouteTitle } from '../../../shared/utils/active-route-title';
import { confirmLogout } from '../../../shared/utils/confirm-logout';
import { NotificationBell } from '../../../shared/ui/notification-bell/notification-bell';

@Component({
  selector: 'app-client-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBell],
  templateUrl: './client-shell.html',
  styleUrl: './client-shell.css',
})
export class ClientShell implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly clientProfileState = inject(ClientProfileStateService);
  protected readonly pageTitle = createActiveRouteTitle('Overview');

  /** Flips true if the avatar image fails to load, forcing the initial-letter fallback. */
  protected readonly avatarBroken = signal(false);

  /**
   * Drives the off-canvas nav drawer below the 768px breakpoint. Above it the
   * rail is always visible and this flag is inert, so nothing needs to reset
   * it on resize — the CSS simply stops reading the `--open` class.
   */
  protected readonly mobileNavOpen = signal(false);

  ngOnInit(): void {
    // clientGuard only fetches /me on a cold load when role signals are
    // empty; a same-session login already has isClient() true without ever
    // populating currentUser(), so the topbar profile needs its own fetch.
    if (!this.currentUser()) {
      this.authService.fetchCurrentUser().subscribe();
    }
    this.clientProfileState.load();
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
