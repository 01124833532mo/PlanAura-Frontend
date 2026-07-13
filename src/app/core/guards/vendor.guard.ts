import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Blocks non-vendor accounts from the vendor dashboard. isVendor() only
 * reflects roles already loaded into memory (from a login() this session, or
 * a prior fetchCurrentUser() call) — on a cold page load/refresh those
 * signals are empty even for a valid vendor with a token in storage, so this
 * guard falls back to GET /api/auth/me to resolve roles before deciding.
 */
export const vendorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.parseUrl('/auth');
  }

  if (authService.isVendor()) {
    return of(true);
  }

  return authService.fetchCurrentUser().pipe(
    map(() => (authService.isVendor() ? true : router.parseUrl('/auth'))),
    catchError(() => of(router.parseUrl('/auth'))),
  );
};
