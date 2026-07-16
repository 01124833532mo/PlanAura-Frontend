import { Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

/**
 * Tracks the `data.title` of the deepest activated child route beneath the
 * component that calls this (i.e. a shell's own <router-outlet> content),
 * updating on every navigation. Lets a shell's topbar heading always reflect
 * the active page instead of a hardcoded string.
 *
 * Reads from `router.routerState.snapshot`, the fully-built immutable route
 * snapshot tree, rather than walking the live `ActivatedRoute` node chain.
 * The live nodes can be mid-update (e.g. during hydration replay or a
 * route-reuse swap), which is what caused
 * "Cannot read properties of undefined (reading 'data')" when this used
 * `ActivatedRoute.firstChild.snapshot`.
 *
 * Must be called from an injection context (a field initializer or the
 * constructor of the shell component), the same way `inject()` is used.
 */
export function createActiveRouteTitle(fallback: string): Signal<string> {
  const router = inject(Router);

  const resolveTitle = (): string => {
    let route: ActivatedRouteSnapshot | null = router.routerState.snapshot.root;
    let title: string | undefined;
    while (route) {
      title = (route.data['title'] as string | undefined) ?? title;
      route = route.firstChild;
    }
    return title ?? fallback;
  };

  return toSignal(
    router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => resolveTitle()),
      startWith(resolveTitle()),
    ),
    { initialValue: fallback },
  );
}
