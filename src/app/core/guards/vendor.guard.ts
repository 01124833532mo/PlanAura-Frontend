import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
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
 * isVendor() is synchronous: AuthService.initializeSession() (see
 * app.config.ts's provideAppInitializer) has already resolved roles from any
 * token in storage before the Router's first navigation, so it's accurate
 * here even on a cold page load/refresh. The verification-status lookup
 * below stays async — it's per-route backend state, not identity, and has
 * to be fetched fresh regardless.
 */
export const vendorGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const vendorService = inject(VendorService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.parseUrl('/auth');
  }

  if (!authService.isVendor()) {
    return router.parseUrl('/auth');
  }

  return vendorService.getMyProfile().pipe(
    map((profile) => {
      const target = resolveVendorLandingPath(profile.verificationStatus);
      const onTarget =
        state.url === target ||
        (target === '/vendor/dashboard' && state.url.startsWith('/vendor/dashboard/'));
      return onTarget ? true : router.parseUrl(target);
    }),
    catchError(() => of(router.parseUrl('/auth'))),
  );
};
