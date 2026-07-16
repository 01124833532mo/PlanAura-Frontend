import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { resolveVendorLandingPath } from '../interfaces/vendor-verification.model';
import { AuthService } from '../services/auth.service';
import { VendorService } from '../services/vendor.service';

/**
 * Blocks non-vendor accounts from the vendor dashboard and the verification
 * status pages, and — once the role is confirmed — always resolves the
 * vendor's CURRENT verification status from the backend (source of truth,
 * never cached/duplicated here) to decide whether the requested URL is
 * actually where this vendor belongs right now.
 *
 * Reused as-is on all three routes (`/vendor/dashboard` and its children,
 * `/vendor/verification-pending`, `/vendor/verification-rejected`): the
 * comparison below works generically for all of them, redirecting to
 * whichever one the vendor's status actually calls for.
 *
 * isVendor() only reflects roles already loaded into memory (from a login()
 * this session, or a prior fetchCurrentUser() call) — on a cold page
 * load/refresh those signals are empty even for a valid vendor with a token
 * in storage, so this guard falls back to GET /api/auth/me to resolve roles
 * first when needed.
 */
export const vendorGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const vendorService = inject(VendorService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.parseUrl('/auth');
  }

  const checkVerificationStatus = () =>
    vendorService.getMyProfile().pipe(
      map((profile) => {
        const target = resolveVendorLandingPath(profile.verificationStatus);
        const onTarget =
          state.url === target ||
          (target === '/vendor/dashboard' && state.url.startsWith('/vendor/dashboard/'));
        return onTarget ? true : router.parseUrl(target);
      }),
      catchError(() => of(router.parseUrl('/auth'))),
    );

  if (authService.isVendor()) {
    return checkVerificationStatus();
  }

  return authService.fetchCurrentUser().pipe(
    switchMap(() => (authService.isVendor() ? checkVerificationStatus() : of(router.parseUrl('/auth')))),
    catchError(() => of(router.parseUrl('/auth'))),
  );
};
