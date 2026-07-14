import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { vendorGuard } from './core/guards/vendor.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/auth-page/auth-page').then((m) => m.AuthPage),
  },
  {
    path: 'admin/dashboard',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'vendor/register',
    loadComponent: () =>
      import('./features/vendor-onboarding/vendor-onboarding').then(
        (m) => m.VendorOnboarding,
      ),
  },
  {
    path: 'vendor/dashboard',
    canActivate: [authGuard, vendorGuard],
    loadComponent: () =>
      import('./features/vendor-dashboard/vendor-shell/vendor-shell').then(
        (m) => m.VendorShell,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'packages' },
      {
        path: 'packages',
        loadComponent: () =>
          import('./features/vendor-dashboard/packages/package-list/package-list').then(
            (m) => m.PackageList,
          ),
      },
      {
        path: 'availability',
        loadComponent: () =>
          import(
            './features/vendor-dashboard/availability/availability-list/availability-list'
          ).then((m) => m.AvailabilityList),
      },
      {
        path: 'browse-packages',
        loadComponent: () =>
          import('./features/vendor-dashboard/packages/package-browser/package-browser').then(
            (m) => m.PackageBrowser,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'auth' },
];
