import { Routes } from '@angular/router';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'auth' },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/auth-page/auth-page').then((m) => m.AuthPage),
  },
  {
    path: 'vendor/register',
    loadComponent: () =>
      import('./features/vendor-onboarding/vendor-onboarding').then(
        (m) => m.VendorOnboarding,
      ),
  },
  { path: '**', redirectTo: 'auth' },
];
