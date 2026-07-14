import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Keeps an already-authenticated user off the sign-in/register page.
 * Vendors land on their dashboard; any other authenticated role falls back
 * to the onboarding wizard entry point (the only other route this build
 * defines for non-vendor accounts).
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  return router.parseUrl(authService.isVendor() ? '/vendor/dashboard' : '/vendor/register');
};
