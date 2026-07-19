import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Vendor ids are dynamic/unbounded — can't be enumerated at build time
    // for prerendering, so this route is rendered per-request instead.
    path: 'client/vendors/:id',
    renderMode: RenderMode.Server,
  },
  {
    // Same reasoning — event plan ids are dynamic/unbounded.
    path: 'client/event-plans/:id',
    renderMode: RenderMode.Server,
  },
  {
    // Same reasoning — booking ids are dynamic/unbounded.
    path: 'client/bookings/:id/pay',
    renderMode: RenderMode.Server,
  },
  {
    // Same reasoning — admin-viewed vendor/client/dispute ids are dynamic/unbounded.
    path: 'admin/vendors/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'admin/clients/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'admin/disputes/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
