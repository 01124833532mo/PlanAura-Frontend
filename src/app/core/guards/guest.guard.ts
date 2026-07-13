import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Keeps an already-authenticated user off the sign-in/register page.
 * Scope note: there is no dashboard route yet (out of scope for this
 * ticket), so it redirects back to the onboarding wizard entry point,
 * which is the only other route this build defines.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/vendor/register');
};
