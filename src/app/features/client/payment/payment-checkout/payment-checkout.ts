import { DatePipe, DecimalPipe, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { AppError } from '../../../../core/interfaces/api-response.model';
import { BookingPaymentStatus, BookingRequest } from '../../../../core/interfaces/booking-request.model';
import { PaymentOptions } from '../../../../core/interfaces/payment.model';
import { VendorPackage } from '../../../../core/interfaces/vendor-package.model';
import { VendorProfile } from '../../../../core/interfaces/vendor-profile.model';
import { BookingRequestService } from '../../../../core/services/booking-request.service';
import { PaymentService } from '../../../../core/services/payment.service';
import { StripeService } from '../../../../core/services/stripe.service';
import { VendorPackageService } from '../../../../core/services/vendor-package.service';
import { VendorService } from '../../../../core/services/vendor.service';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 5;

@Component({
  selector: 'app-payment-checkout',
  standalone: true,
  imports: [AlertBanner, Button, DatePipe, DecimalPipe],
  templateUrl: './payment-checkout.html',
  styleUrl: './payment-checkout.css',
})
export class PaymentCheckout implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly bookingService = inject(BookingRequestService);
  private readonly paymentService = inject(PaymentService);
  private readonly stripeService = inject(StripeService);
  private readonly vendorService = inject(VendorService);
  private readonly packageService = inject(VendorPackageService);

  @ViewChild('paymentElementContainer')
  private paymentElementContainer?: ElementRef<HTMLDivElement>;

  protected readonly booking = signal<BookingRequest | null>(null);
  protected readonly vendor = signal<VendorProfile | null>(null);
  protected readonly pkg = signal<VendorPackage | null>(null);
  protected readonly paymentOptions = signal<PaymentOptions | null>(null);

  protected readonly loadingBooking = signal(true);
  protected readonly mountingPayment = signal(true);
  protected readonly notPayableReason = signal<string | null>(null);
  protected readonly error = signal<AppError | null>(null);
  protected readonly submitting = signal(false);
  protected readonly confirming = signal(false);
  protected readonly succeeded = signal(false);

  private bookingId = 0;
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;

  ngOnInit(): void {
    this.bookingId = Number(this.route.snapshot.paramMap.get('id'));

    // Stripe sends redirect-based payment methods back here with these query
    // params — resolve status via polling instead of starting a fresh checkout.
    const returnedFromRedirect =
      isPlatformBrowser(this.platformId) &&
      !!this.route.snapshot.queryParamMap.get('redirect_status');

    if (returnedFromRedirect) {
      this.loadBooking(() => this.beginConfirmationPolling());
      return;
    }

    this.loadBooking(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.setupPayment();
      } else {
        // SSR: render the booking summary only, never touch Stripe.
        this.mountingPayment.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.paymentElement?.unmount();
  }

  private loadBooking(onLoaded: () => void): void {
    this.loadingBooking.set(true);
    this.error.set(null);

    this.bookingService.getBooking(this.bookingId).subscribe({
      next: (booking) => {
        this.booking.set(booking);
        this.vendorService.getById(booking.vendorId).subscribe({ next: (v) => this.vendor.set(v) });
        if (booking.vendorPackageId) {
          this.packageService
            .getById(booking.vendorPackageId)
            .subscribe({ next: (p) => this.pkg.set(p) });
        }
        this.loadingBooking.set(false);
        onLoaded();
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loadingBooking.set(false);
      },
    });
  }

  private setupPayment(): void {
    this.mountingPayment.set(true);

    this.paymentService.getPaymentOptions(this.bookingId).subscribe({
      next: (options) => {
        this.paymentOptions.set(options);

        if (!options.isPayable) {
          this.notPayableReason.set(
            "This booking can't be paid right now — it may already be paid, or the vendor hasn't accepted it yet.",
          );
          this.mountingPayment.set(false);
          return;
        }

        this.initiateAndMount();
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.mountingPayment.set(false);
      },
    });
  }

  private initiateAndMount(): void {
    this.paymentService.initiatePayment(this.bookingId).subscribe({
      next: async (result) => {
        this.stripe = await this.stripeService.getStripe(result.publishableKey);

        if (!this.stripe || !this.paymentElementContainer) {
          this.error.set({
            status: 0,
            message: 'Unable to load the payment form. Please refresh and try again.',
            fieldErrors: [],
          });
          this.mountingPayment.set(false);
          return;
        }

        this.elements = this.stripe.elements({ clientSecret: result.clientSecret });
        this.paymentElement = this.elements.create('payment');
        this.paymentElement.mount(this.paymentElementContainer.nativeElement);

        this.mountingPayment.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.mountingPayment.set(false);
      },
    });
  }

  protected async submitPayment(): Promise<void> {
    if (!this.stripe || !this.elements) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: { return_url: this.currentUrlWithoutQuery() },
      redirect: 'if_required',
    });

    if (error) {
      this.error.set({
        status: 0,
        message: error.message ?? 'Payment failed. Please try again.',
        fieldErrors: [],
      });
      this.submitting.set(false);
      return;
    }

    // No redirect needed (e.g. card payment) — Stripe confirmed client-side.
    this.submitting.set(false);
    this.beginConfirmationPolling();
  }

  private currentUrlWithoutQuery(): string {
    return isPlatformBrowser(this.platformId) ? window.location.href.split('?')[0] : '';
  }

  /** paymentStatus only ever flips to Paid via the Stripe webhook (confirmed in Phase 0) — never synchronously. */
  private beginConfirmationPolling(attempt = 0): void {
    this.confirming.set(true);

    this.bookingService.getBooking(this.bookingId).subscribe({
      next: (booking) => {
        this.booking.set(booking);

        if (booking.paymentStatus === BookingPaymentStatus.Paid) {
          this.confirming.set(false);
          this.succeeded.set(true);
          return;
        }

        if (attempt >= MAX_POLL_ATTEMPTS) {
          this.confirming.set(false);
          return;
        }

        setTimeout(() => this.beginConfirmationPolling(attempt + 1), POLL_INTERVAL_MS);
      },
      error: () => this.confirming.set(false),
    });
  }

  protected goToPlan(): void {
    const eventPlanId = this.booking()?.eventPlanId;
    this.router.navigate(
      eventPlanId ? ['/client/event-plans', eventPlanId] : ['/client/event-plans'],
    );
  }
}
