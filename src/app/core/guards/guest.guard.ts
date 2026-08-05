import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Keeps an already-authenticated user off the sign-in/register page.
 * Admins land on the admin dashboard, vendors land on their dashboard, and
 * clients land on the home page.
 *
 * Synchronous: AuthService.initializeSession() (see app.config.ts's
 * provideAppInitializer) has already resolved roles from any token in
 * storage before the Router's first navigation, so isAdmin()/isVendor() are
 * accurate here even on a cold page load/refresh — no lazy /me fetch needed.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  if (authService.isAdmin()) {
    return router.parseUrl('/admin/dashboard');
  }

  if (authService.isVendor()) {
    return router.parseUrl('/vendor/dashboard');
  }

  return router.parseUrl('/');
};
