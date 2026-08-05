import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Blocks non-client accounts from client-only routes.
 *
 * Synchronous: AuthService.initializeSession() (see app.config.ts's
 * provideAppInitializer) has already resolved roles from any token in
 * storage before the Router's first navigation, so isClient() is accurate
 * here even on a cold page load/refresh — no lazy /me fetch needed.
 */
export const clientGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.parseUrl('/auth');
  }

  return authService.isClient() ? true : router.parseUrl('/auth');
};
