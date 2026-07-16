import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { createActiveRouteTitle } from '../../../shared/utils/active-route-title';
import { confirmLogout } from '../../../shared/utils/confirm-logout';

@Component({
  selector: 'app-client-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './client-shell.html',
  styleUrl: './client-shell.css',
})
export class ClientShell implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.authService.currentUser;
  protected readonly pageTitle = createActiveRouteTitle('Overview');

  ngOnInit(): void {
    // clientGuard only fetches /me on a cold load when role signals are
    // empty; a same-session login already has isClient() true without ever
    // populating currentUser(), so the topbar profile needs its own fetch.
    if (!this.currentUser()) {
      this.authService.fetchCurrentUser().subscribe();
    }
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
