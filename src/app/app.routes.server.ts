import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Fully public, no auth guard, no browser-only state — safe to prerender.
  { path: 'terms', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  { path: 'vendor/register', renderMode: RenderMode.Prerender },

  // Every other route (home, /auth, and everything under client/, vendor/,
  // admin/) sits behind authGuard/guestGuard/clientGuard/vendorGuard/
  // adminGuard, all of which decide based on the JWT in localStorage.
  // localStorage doesn't exist during SSR/prerendering, so server-rendering
  // these bakes in an "unauthenticated" redirect (to /auth) at build time
  // regardless of who actually requests the page — hydration then replays
  // that resolved (wrong) route before the real client-side guards ever run
  // against actual browser state. Rendering them client-only avoids this
  // entirely: the server ships an empty shell and the Router/guards run
  // exactly once, against the real address-bar URL and real auth state.
  { path: '**', renderMode: RenderMode.Client },
];
