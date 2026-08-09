import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Blocks anonymous users from protected routes, sending them to sign in.
 *
 * Carries the attempted URL through as `returnUrl` so a guest who clicks
 * "Book Now" on a public vendor page (or any other protected deep link)
 * lands back where they started once they've signed in — see
 * AuthPage.navigateAfterAuth().
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth'], { queryParams: { returnUrl: state.url } });
};
