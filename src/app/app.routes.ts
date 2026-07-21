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
    path: 'auth/forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
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
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin-dashboard/admin-shell/admin-shell').then((m) => m.AdminShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        data: { title: 'Overview' },
        loadComponent: () =>
          import('./features/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'analytics',
        data: { title: 'Analytics' },
        loadComponent: () =>
          import('./features/admin-dashboard/pages/analytics/analytics').then(
            (m) => m.Analytics,
          ),
      },
      {
        path: 'vendors',
        data: { title: 'Vendors' },
        loadComponent: () =>
          import('./features/admin-dashboard/pages/vendors/vendor-list/vendor-list').then(
            (m) => m.VendorList,
          ),
      },
      {
        path: 'vendors/:id',
        data: { title: 'Vendor Details' },
        loadComponent: () =>
          import('./features/admin-dashboard/pages/vendors/vendor-detail/vendor-detail').then(
            (m) => m.VendorDetail,
          ),
      },
      {
        path: 'vendor-verifications',
        data: { title: 'Vendor Verifications' },
        loadComponent: () =>
          import(
            './features/admin-dashboard/vendor-verifications/vendor-verification-list/vendor-verification-list'
          ).then((m) => m.VendorVerificationList),
      },
      {
        path: 'clients',
        data: { title: 'Clients' },
        loadComponent: () =>
          import('./features/admin-dashboard/pages/clients/client-list/client-list').then(
            (m) => m.ClientList,
          ),
      },
      {
        path: 'clients/:id',
        data: { title: 'Client Details' },
        loadComponent: () =>
          import('./features/admin-dashboard/pages/clients/client-detail/client-detail').then(
            (m) => m.ClientDetail,
          ),
      },
      {
        path: 'bookings',
        data: { title: 'Bookings' },
        loadComponent: () =>
          import('./features/admin-dashboard/pages/bookings/booking-list/booking-list').then(
            (m) => m.BookingList,
          ),
      },
      {
        path: 'disputes',
        data: { title: 'Disputes' },
        loadComponent: () =>
          import('./features/admin-dashboard/pages/disputes/dispute-list/dispute-list').then(
            (m) => m.DisputeList,
          ),
      },
      {
        path: 'disputes/:id',
        data: { title: 'Dispute Details' },
        loadComponent: () =>
          import('./features/admin-dashboard/pages/disputes/dispute-detail/dispute-detail').then(
            (m) => m.DisputeDetail,
          ),
      },
      {
        path: 'payments',
        data: { title: 'Payments' },
        loadComponent: () =>
          import('./features/admin-dashboard/pages/payments/payment-list/payment-list').then(
            (m) => m.PaymentList,
          ),
      },
      {
        path: 'reports',
        data: { title: 'Reports' },
        loadComponent: () =>
          import('./features/admin-dashboard/pages/reports/reports').then((m) => m.Reports),
      },
      {
        path: 'categories',
        data: { title: 'Categories' },
        loadComponent: () =>
          import(
            './features/admin-dashboard/pages/categories/category-list/category-list'
          ).then((m) => m.CategoryList),
      },
      {
        path: 'notifications',
        data: { title: 'Notifications' },
        loadComponent: () =>
          import(
            './features/admin-dashboard/pages/notifications/notification-broadcast/notification-broadcast'
          ).then((m) => m.NotificationBroadcast),
      },
      {
        path: 'accounts',
        data: { title: 'Admin Accounts' },
        loadComponent: () =>
          import('./features/admin-dashboard/pages/accounts/admin-accounts/admin-accounts').then(
            (m) => m.AdminAccounts,
          ),
      },
      {
        path: 'profile',
        data: { title: 'My Profile' },
        loadComponent: () =>
          import('./features/admin-dashboard/pages/profile/admin-profile/admin-profile').then(
            (m) => m.AdminProfile,
          ),
      },
    ],
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
      {
        path: 'packages',
        data: { title: 'My Packages' },
        loadComponent: () =>
          import('./features/vendor-dashboard/packages/package-list/package-list').then(
            (m) => m.PackageList,
          ),
      },
      {
        path: 'availability',
        data: { title: 'Availability' },
        loadComponent: () =>
          import(
            './features/vendor-dashboard/availability/availability-list/availability-list'
          ).then((m) => m.AvailabilityList),
      },
      {
        path: 'browse-packages',
        data: { title: 'Browse Packages' },
        loadComponent: () =>
          import('./features/vendor-dashboard/packages/package-browser/package-browser').then(
            (m) => m.PackageBrowser,
          ),
      },
      {
        path: 'reviews',
        data: { title: 'Reviews' },
        loadComponent: () =>
          import('./features/vendor-dashboard/reviews/reviews-list/reviews-list').then(
            (m) => m.ReviewsList,
          ),
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
        loadComponent: () =>
          import('./features/client/client-dashboard/client-dashboard').then(
            (m) => m.ClientDashboard,
          ),
      },
      {
        path: 'vendors',
        data: { title: 'Browse Vendors' },
        loadComponent: () =>
          import('./features/client/vendor-browse/vendor-browse').then((m) => m.VendorBrowse),
      },
      {
        path: 'vendors/:id',
        data: { title: 'Vendor Details' },
        loadComponent: () =>
          import('./features/client/vendor-details/vendor-details').then((m) => m.VendorDetails),
      },
      {
        path: 'booking/new',
        data: { title: 'New Booking' },
        loadComponent: () =>
          import('./features/client/booking/booking-create/booking-create').then(
            (m) => m.BookingCreate,
          ),
      },
      {
        path: 'event-plans',
        data: { title: 'My Event Plans' },
        loadComponent: () =>
          import('./features/client/event-plan/event-plan-list/event-plan-list').then(
            (m) => m.EventPlanList,
          ),
      },
      {
        path: 'event-plans/new',
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
        loadComponent: () =>
          import('./features/client/event-plan/event-plan-detail/event-plan-detail').then(
            (m) => m.EventPlanDetail,
          ),
      },
      {
        // A distinct 3-segment path from 'event-plans/:id' (2 segments), so
        // there's no ambiguity with the detail route regardless of order —
        // reuses EventPlanForm, which checks for the :id param itself.
        path: 'event-plans/:id/edit',
        data: { title: 'Edit Event Plan' },
        loadComponent: () =>
          import('./features/client/event-plan/event-plan-form/event-plan-form').then(
            (m) => m.EventPlanForm,
          ),
      },
      {
        path: 'bookings',
        data: { title: 'My Bookings' },
        loadComponent: () =>
          import('./features/client/booking/my-bookings/my-bookings').then((m) => m.MyBookings),
      },
      {
        path: 'ai-visualizer',
        data: { title: 'AI Event Visualizer' },
        loadComponent: () =>
          import('./features/client/ai-visualizer/ai-visualizer').then(
            (m) => m.AiVisualizerComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'auth' },
];
