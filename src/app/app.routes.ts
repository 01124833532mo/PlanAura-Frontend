import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { clientGuard } from './core/guards/client.guard';
import { guestGuard } from './core/guards/guest.guard';
import { vendorGuard } from './core/guards/vendor.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [authGuard, clientGuard],
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
  {
    path: 'client',
    canActivate: [authGuard, clientGuard],
    loadComponent: () =>
      import('./features/client/client-shell/client-shell').then((m) => m.ClientShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/client/client-dashboard/client-dashboard').then(
            (m) => m.ClientDashboard,
          ),
      },
      {
        path: 'vendors',
        loadComponent: () =>
          import('./features/client/vendor-browse/vendor-browse').then((m) => m.VendorBrowse),
      },
      {
        path: 'vendors/:id',
        loadComponent: () =>
          import('./features/client/vendor-details/vendor-details').then((m) => m.VendorDetails),
      },
      {
        path: 'booking/new',
        loadComponent: () =>
          import('./features/client/booking/booking-create/booking-create').then(
            (m) => m.BookingCreate,
          ),
      },
      {
        path: 'event-plans',
        loadComponent: () =>
          import('./features/client/event-plan/event-plan-list/event-plan-list').then(
            (m) => m.EventPlanList,
          ),
      },
      {
        path: 'event-plans/new',
        loadComponent: () =>
          import('./features/client/event-plan/event-plan-form/event-plan-form').then(
            (m) => m.EventPlanForm,
          ),
      },
      {
        // Must come after 'event-plans/new' — otherwise ':id' would match
        // the literal 'new' segment first.
        path: 'event-plans/:id',
        loadComponent: () =>
          import('./features/client/event-plan/event-plan-detail/event-plan-detail').then(
            (m) => m.EventPlanDetail,
          ),
      },
      {
        path: 'bookings/:id/pay',
        loadComponent: () =>
          import('./features/client/payment/payment-checkout/payment-checkout').then(
            (m) => m.PaymentCheckout,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'auth' },
];
