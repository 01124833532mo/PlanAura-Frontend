import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { VendorProfileStateService } from '../../../core/services/vendor-profile-state.service';
import { confirmLogout } from '../../../shared/utils/confirm-logout';

/**
 * Full-page state (no vendor sidebar) shown to a vendor whose verification
 * is still Pending. Routed here by vendorGuard (session restore / direct
 * navigation) and by auth-page.ts's navigateAfterAuth (right after login).
 */
@Component({
  selector: 'app-verification-pending',
  standalone: true,
  templateUrl: './verification-pending.html',
  styleUrl: './verification-pending.css',
})
export class VerificationPending implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly vendorProfileState = inject(VendorProfileStateService);

  ngOnInit(): void {
    this.vendorProfileState.load();
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
