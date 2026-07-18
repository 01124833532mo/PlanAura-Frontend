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
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
