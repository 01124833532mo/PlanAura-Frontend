import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/**
 * Temporary placeholder for the admin area. No admin functionality is
 * implemented yet — this exists so /admin/dashboard has somewhere to route
 * authenticated admins after login.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/auth');
  }

  protected goToVendorVerifications(): void {
    this.router.navigateByUrl('/admin/vendor-verifications');
  }
}
