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
      this.stripePromise = loadStripe(publishableKey);
    }

    return this.stripePromise;
  }
}
