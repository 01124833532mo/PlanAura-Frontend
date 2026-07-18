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
    // Public legal pages — no auth guard, linked from both the signed-out
    // auth page footer and the signed-in home page footer.
    path: 'terms',
    loadComponent: () =>
      import('./features/legal/terms-of-service/terms-of-service').then(
        (m) => m.TermsOfService,
      ),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/legal/privacy-policy/privacy-policy').then(
        (m) => m.PrivacyPolicy,
      ),
  },
  {
    // Public legal pages — no auth guard, linked from both the signed-out
    // auth page footer and the signed-in home page footer.
    path: 'terms',
    loadComponent: () =>
      import('./features/legal/terms-of-service/terms-of-service').then(
        (m) => m.TermsOfService,
      ),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/legal/privacy-policy/privacy-policy').then(
        (m) => m.PrivacyPolicy,
      ),
  },
  {
    path: 'admin/dashboard',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
  },
  {
    path: 'admin/vendor-verifications',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import(
        './features/admin-dashboard/vendor-verifications/vendor-verification-list/vendor-verification-list'
      ).then((m) => m.VendorVerificationList),
  },
  {
    path: 'admin/vendor-verifications',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import(
        './features/admin-dashboard/vendor-verifications/vendor-verification-list/vendor-verification-list'
      ).then((m) => m.VendorVerificationList),
  },
  {
    path: 'vendor/register',
    loadComponent: () =>
      import('./features/vendor-onboarding/vendor-onboarding').then(
        (m) => m.VendorOnboarding,
      ),
  },
  {
    path: 'vendor/verification-pending',
    canActivate: [authGuard, vendorGuard],
    loadComponent: () =>
      import(
        './features/vendor-verification/verification-pending/verification-pending'
      ).then((m) => m.VerificationPending),
  },
  {
    path: 'vendor/verification-rejected',
    canActivate: [authGuard, vendorGuard],
    loadComponent: () =>
      import(
        './features/vendor-verification/verification-rejected/verification-rejected'
      ).then((m) => m.VerificationRejected),
  },
  {
    path: 'vendor/verification-pending',
    canActivate: [authGuard, vendorGuard],
    loadComponent: () =>
      import(
        './features/vendor-verification/verification-pending/verification-pending'
      ).then((m) => m.VerificationPending),
  },
  {
    path: 'vendor/verification-rejected',
    canActivate: [authGuard, vendorGuard],
    loadComponent: () =>
      import(
        './features/vendor-verification/verification-rejected/verification-rejected'
      ).then((m) => m.VerificationRejected),
  },
  {
    path: 'vendor/dashboard',
    canActivate: [authGuard, vendorGuard],
    loadComponent: () =>
      import('./features/vendor-dashboard/vendor-shell/vendor-shell').then(
        (m) => m.VendorShell,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'requests' },
      {
        path: 'requests',
        data: { title: 'Booking Requests' },
        loadComponent: () =>
          import(
            './features/vendor-dashboard/booking-requests/booking-request-list/booking-request-list'
          ).then((m) => m.BookingRequestList),
      },
      { path: '', pathMatch: 'full', redirectTo: 'requests' },
      {
        path: 'requests',
        data: { title: 'Booking Requests' },
        loadComponent: () =>
          import(
            './features/vendor-dashboard/booking-requests/booking-request-list/booking-request-list'
          ).then((m) => m.BookingRequestList),
      },
      {
        path: 'packages',
        data: { title: 'My Packages' },
        data: { title: 'My Packages' },
        loadComponent: () =>
          import('./features/vendor-dashboard/packages/package-list/package-list').then(
            (m) => m.PackageList,
          ),
      },
      {
        path: 'availability',
        data: { title: 'Availability' },
        data: { title: 'Availability' },
        loadComponent: () =>
          import(
            './features/vendor-dashboard/availability/availability-list/availability-list'
          ).then((m) => m.AvailabilityList),
      },
      {
        path: 'browse-packages',
        data: { title: 'Browse Packages' },
        data: { title: 'Browse Packages' },
        loadComponent: () =>
          import('./features/vendor-dashboard/packages/package-browser/package-browser').then(
            (m) => m.PackageBrowser,
          ),
      },
      {
        path: 'profile',
        data: { title: 'My Profile' },
        loadComponent: () =>
          import('./features/vendor-dashboard/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'profile',
        data: { title: 'My Profile' },
        loadComponent: () =>
          import('./features/vendor-dashboard/profile/profile').then((m) => m.Profile),
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
        data: { title: 'Overview' },
        data: { title: 'Overview' },
        loadComponent: () =>
          import('./features/client/client-dashboard/client-dashboard').then(
            (m) => m.ClientDashboard,
          ),
      },
      {
        path: 'vendors',
        data: { title: 'Browse Vendors' },
        data: { title: 'Browse Vendors' },
        loadComponent: () =>
          import('./features/client/vendor-browse/vendor-browse').then((m) => m.VendorBrowse),
      },
      {
        path: 'vendors/:id',
        data: { title: 'Vendor Details' },
        data: { title: 'Vendor Details' },
        loadComponent: () =>
          import('./features/client/vendor-details/vendor-details').then((m) => m.VendorDetails),
      },
      {
        path: 'booking/new',
        data: { title: 'New Booking' },
        data: { title: 'New Booking' },
        loadComponent: () =>
          import('./features/client/booking/booking-create/booking-create').then(
            (m) => m.BookingCreate,
          ),
      },
      {
        path: 'event-plans',
        data: { title: 'My Event Plans' },
        data: { title: 'My Event Plans' },
        loadComponent: () =>
          import('./features/client/event-plan/event-plan-list/event-plan-list').then(
            (m) => m.EventPlanList,
          ),
      },
      {
        path: 'event-plans/new',
        data: { title: 'New Event Plan' },
        data: { title: 'New Event Plan' },
        loadComponent: () =>
          import('./features/client/event-plan/event-plan-form/event-plan-form').then(
            (m) => m.EventPlanForm,
          ),
      },
      {
        // Must come after 'event-plans/new' — otherwise ':id' would match
        // the literal 'new' segment first.
        path: 'event-plans/:id',
        data: { title: 'Event Plan Details' },
        data: { title: 'Event Plan Details' },
        loadComponent: () =>
          import('./features/client/event-plan/event-plan-detail/event-plan-detail').then(
            (m) => m.EventPlanDetail,
          ),
      },
      {
        path: 'bookings/:id/pay',
        data: { title: 'Checkout' },
        path: 'bookings',
        data: { title: 'My Bookings' },
        loadComponent: () =>
          import('./features/client/booking/my-bookings/my-bookings').then((m) => m.MyBookings),
      },
      {
        path: 'profile',
        data: { title: 'My Profile' },
        loadComponent: () =>
          import('./features/client/client-profile/client-profile').then(
            (m) => m.ClientProfileComponent,
          ),
      },
      {
        path: 'profile',
        data: { title: 'My Profile' },
        loadComponent: () =>
          import('./features/client/client-profile/client-profile').then(
            (m) => m.ClientProfileComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'auth' },
];
