import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Keeps an already-authenticated user off the sign-in/register page.
 * Admins land on the admin dashboard, vendors land on their dashboard, and
 * clients land on the home page.
 *
 * isAdmin()/isVendor() only reflect roles already loaded into memory (from a
 * login() this session, or a prior fetchCurrentUser() call) — on a cold page
 * load/refresh those signals are empty even for a valid token in storage, so
 * this falls back to GET /api/auth/me to resolve roles before deciding,
 * matching adminGuard/vendorGuard.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  if (authService.isAdmin()) {
    return of(router.parseUrl('/admin/dashboard'));
  }

  if (authService.isVendor()) {
    return of(router.parseUrl('/vendor/dashboard'));
  }

  return authService.fetchCurrentUser().pipe(
    map(() =>
      router.parseUrl(
        authService.isAdmin()
          ? '/admin/dashboard'
          : authService.isVendor()
            ? '/vendor/dashboard'
            : '/',
      ),
    ),
    // An expired/invalid token shouldn't trap the user off the sign-in page.
    catchError(() => of(true)),
  );
};
