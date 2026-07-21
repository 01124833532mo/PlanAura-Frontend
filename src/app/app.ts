import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { STRIPE_PUBLISHABLE_KEY } from './core/config/app-config';
import { AuthService } from './core/services/auth.service';
import { StripeService } from './core/services/stripe.service';
import { ChatbotWidget } from './shared/ui/chatbot-widget/chatbot-widget';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChatbotWidget],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly stripeService = inject(StripeService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly title = signal('Planura-Client');

  // Mounted here (app root) rather than inside client-shell so it also
  // covers the post-login home page at '/', which sits outside client-shell,
  // and survives every route change since app-root never unmounts.
  protected readonly showChatbot = computed(
    () => this.authService.isAuthenticated() && this.authService.isClient(),
  );

  ngOnInit(): void {
    // Fire-and-forget: starts loading Stripe.js the moment the app boots,
    // not when the user first reaches booking-create's payment step. On a
    // slow/high-latency connection (confirmed to be the real cause of
    // reported slowness — see StripeService's load-time log), this gives
    // it however long the user spends browsing beforehand as a head start,
    // rather than a cold few-second wait right when they need it.
    // getStripe() itself caches the resulting promise, so booking-create's
    // later call reuses this exact same in-flight/settled promise instead
    // of triggering a second load — and it's already SSR-guarded internally,
    // but checking here too keeps this call site consistent with every
    // other Stripe/localStorage-touching call in this app.
    if (isPlatformBrowser(this.platformId)) {
      void this.stripeService.getStripe(STRIPE_PUBLISHABLE_KEY);
    }
  }
}
