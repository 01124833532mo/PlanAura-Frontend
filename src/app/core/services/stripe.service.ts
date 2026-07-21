import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Stripe, loadStripe } from '@stripe/stripe-js';

/**
 * Thin wrapper around @stripe/stripe-js. Guarded behind isPlatformBrowser
 * because this app uses Angular SSR (src/main.server.ts) — Stripe.js touches
 * window/document and must never be invoked while rendering on the server,
 * matching how TokenStorageService guards localStorage.
 */
@Injectable({ providedIn: 'root' })
export class StripeService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private stripePromise: Promise<Stripe | null> | null = null;
  private loadedKey: string | null = null;

  getStripe(publishableKey: string): Promise<Stripe | null> {
    if (!this.isBrowser) {
      return Promise.resolve(null);
    }

    if (!this.stripePromise || this.loadedKey !== publishableKey) {
      this.loadedKey = publishableKey;
      // Not user-facing — just a real number to look at instead of
      // guessing whether a report of "slow payment form" is network
      // latency to Stripe's CDN or something else. Timed from the actual
      // loadStripe() call, not from whichever caller happened to trigger
      // it first (that could be the eager app-startup call, or, for a
      // second/repeat call with the same key, is skipped entirely since
      // the cached promise below is reused).
      const startedAt = performance.now();
      this.stripePromise = loadStripe(publishableKey).then((stripe) => {
        const elapsedMs = Math.round(performance.now() - startedAt);
        console.info(`[StripeService] Stripe.js loaded in ${elapsedMs}ms`);
        return stripe;
      });
    }

    return this.stripePromise;
  }
}
