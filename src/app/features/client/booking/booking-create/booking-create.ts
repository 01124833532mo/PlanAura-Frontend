import { DatePipe, DecimalPipe, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { SelectField, SelectOption } from '../../../../shared/ui/select-field/select-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { STRIPE_PUBLISHABLE_KEY } from '../../../../core/config/app-config';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  BookingRequest,
  BookingStatus,
  CreateBookingRequest,
} from '../../../../core/interfaces/booking-request.model';
import { VendorPackage } from '../../../../core/interfaces/vendor-package.model';
import { VendorProfile } from '../../../../core/interfaces/vendor-profile.model';
import {
  AvailabilityStatus,
  VendorAvailability,
} from '../../../../core/interfaces/vendor-availability.model';
import { BookingRequestService } from '../../../../core/services/booking-request.service';
import { EventPlanService } from '../../../../core/services/event-plan.service';
import { StripeService } from '../../../../core/services/stripe.service';
import { VendorAvailabilityService } from '../../../../core/services/vendor-availability.service';
import { VendorPackageService } from '../../../../core/services/vendor-package.service';
import { VendorService } from '../../../../core/services/vendor.service';
import { notifyError, notifySuccess } from '../../../../shared/utils/notify';

/**
 * This dev environment has shown a pattern of intermittent extreme outbound
 * network latency (observed elsewhere this session as an ~8min delay on a
 * Stripe capture call, and a live repro of the Payment Element never
 * mounting even 60s+ after navigating here). loadStripe() has no built-in
 * timeout, so without this, a slow/stuck network leaves the form stuck on
 * "Loading payment form..." forever with no feedback.
 */
const STRIPE_LOAD_TIMEOUT_MS = 15000;

@Component({
  selector: 'app-booking-create',
  standalone: true,
  imports: [ReactiveFormsModule, TextField, SelectField, Button, AlertBanner, DecimalPipe, DatePipe],
  templateUrl: './booking-create.html',
  styleUrl: './booking-create.css',
})
export class BookingCreate implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly vendorService = inject(VendorService);
  private readonly packageService = inject(VendorPackageService);
  private readonly availabilityService = inject(VendorAvailabilityService);
  private readonly eventPlanService = inject(EventPlanService);
  private readonly bookingService = inject(BookingRequestService);
  private readonly stripeService = inject(StripeService);

  @ViewChild('paymentElementContainer')
  private paymentElementContainer?: ElementRef<HTMLDivElement>;

  protected readonly vendor = signal<VendorProfile | null>(null);
  protected readonly pkg = signal<VendorPackage | null>(null);
  protected readonly slots = signal<VendorAvailability[]>([]);
  protected readonly eventPlanOptions = signal<SelectOption[]>([]);
  protected readonly needsEventPlanPicker = signal(false);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly slotError = signal<string | null>(null);
  protected readonly selectedSlotId = signal<number | null>(null);
  protected readonly setupError = signal<string | null>(null);

  /** True while Stripe.js/Elements is loading — the payment section stays present but visually hidden. */
  protected readonly mountingPayment = signal(true);
  /** True if Stripe.js failed to load or didn't respond within STRIPE_LOAD_TIMEOUT_MS — shows a retry affordance instead of hanging silently. */
  protected readonly paymentSetupFailed = signal(false);

  private vendorId = 0;
  private packageId = 0;
  private eventPlanIdFromQuery: number | null = null;

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;

  protected readonly availableSlots = computed(() =>
    this.slots().filter((slot) => slot.status === AvailabilityStatus.Available),
  );

  protected readonly form = this.fb.group({
    eventPlanId: this.fb.control<number | null>(null),
    guestCount: this.fb.nonNullable.control(''),
    clientMessage: this.fb.nonNullable.control(''),
  });

  ngOnInit(): void {
    const vendorIdParam = this.route.snapshot.queryParamMap.get('vendorId');
    const packageIdParam = this.route.snapshot.queryParamMap.get('packageId');
    const eventPlanIdParam = this.route.snapshot.queryParamMap.get('eventPlanId');

    if (!vendorIdParam || !packageIdParam) {
      this.setupError.set('Missing booking details — please start from a vendor package page.');
      this.loading.set(false);
      this.mountingPayment.set(false);
      return;
    }

    this.vendorId = Number(vendorIdParam);
    this.packageId = Number(packageIdParam);
    this.eventPlanIdFromQuery = eventPlanIdParam ? Number(eventPlanIdParam) : null;

    if (this.eventPlanIdFromQuery) {
      this.form.patchValue({ eventPlanId: this.eventPlanIdFromQuery });
    } else {
      this.needsEventPlanPicker.set(true);
      this.form.controls.eventPlanId.addValidators(Validators.required);
    }

    if (!isPlatformBrowser(this.platformId)) {
      // SSR: render the form shell only, never touch Stripe.
      this.mountingPayment.set(false);
    }

    // Defense in depth: vendor-details already hides/disables the "Book this
    // package" button for a blocked package, but this page is reachable
    // directly (URL, back-button) with state vendor-details never checked.
    this.checkForBlockingBooking().subscribe((blocking) => {
      if (blocking) {
        const message =
          blocking.status === BookingStatus.Pending
            ? "You've already requested this package — waiting for the vendor's response."
            : "You've already booked this package.";
        notifyError(message);
        this.router.navigate(['/client/vendors', this.vendorId]);
        return;
      }

      this.loadData();
    });
  }

  /** Pending or Accepted bookings for this exact package block a new request; Rejected/Cancelled/Expired/Completed don't. */
  private checkForBlockingBooking(): Observable<BookingRequest | null> {
    return this.bookingService.listMyBookings({ pageSize: 100 }).pipe(
      map(
        (result) =>
          result.items.find(
            (b) =>
              b.vendorPackageId === this.packageId &&
              (b.status === BookingStatus.Pending || b.status === BookingStatus.Accepted),
          ) ?? null,
      ),
    );
  }

  ngOnDestroy(): void {
    this.paymentElement?.unmount();
  }

  private loadData(): void {
    this.loading.set(true);

    this.vendorService.getById(this.vendorId).subscribe({ next: (v) => this.vendor.set(v) });

    // Always re-fetch the package fresh here rather than trusting anything
    // carried via query params — price/description come from the backend
    // only, matching the same rule the backend itself enforces for AgreedPrice.
    this.packageService.getById(this.packageId).subscribe({
      next: (p) => {
        this.pkg.set(p);
        this.loading.set(false);
        if (isPlatformBrowser(this.platformId)) {
          this.setupPayment(p);
        }
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
        this.mountingPayment.set(false);
      },
    });

    this.refreshSlots();

    if (this.needsEventPlanPicker()) {
      this.eventPlanService.getMyEventPlans().subscribe({
        next: (plans) => {
          if (plans.length === 0) {
            // Preserve vendorId/packageId so event-plan-form can send the
            // client straight back here (with the new plan's id) instead of
            // dropping them at the event-plan list to start over.
            this.router.navigate(['/client/event-plans/new'], {
              queryParams: {
                from: 'booking',
                vendorId: this.vendorId,
                packageId: this.packageId,
              },
            });
            return;
          }
          this.eventPlanOptions.set(
            plans.map((p) => ({ value: p.id, label: `${p.title} — ${p.city}` })),
          );
        },
      });
    }
  }

  /**
   * There's no PaymentIntent to attach Elements to yet — it's only created
   * server-side inside CreateBookingRequestAsync, once the payment method and
   * price are both known. So this uses Stripe's "deferred" Elements mode
   * (amount/currency passed directly instead of a clientSecret) purely to
   * render the card form; submit() below tokenizes it into a PaymentMethod
   * and the backend does the actual authorization.
   */
  private async setupPayment(pkg: VendorPackage): Promise<void> {
    this.mountingPayment.set(true);
    this.paymentSetupFailed.set(false);

    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), STRIPE_LOAD_TIMEOUT_MS),
    );
    this.stripe = await Promise.race([
      this.stripeService.getStripe(STRIPE_PUBLISHABLE_KEY),
      timeout,
    ]);

    if (!this.stripe || !this.paymentElementContainer) {
      this.paymentSetupFailed.set(true);
      this.mountingPayment.set(false);
      return;
    }

    this.elements = this.stripe.elements({
      mode: 'payment',
      // EGP (and this platform's other supported currencies) are 2-decimal —
      // matches the backend's own smallest-unit conversion. This amount is
      // only used to initialize the widget; the backend re-derives and
      // authorizes against its own copy of the package price.
      amount: Math.round(pkg.basePrice * 100),
      currency: pkg.currency.toLowerCase(),
      // Required to call stripe.createPaymentMethod() directly against a
      // deferred (no clientSecret) Elements instance — without this, Stripe.js
      // assumes you'll call confirmPayment()/confirmSetup() instead, which
      // need a PaymentIntent/SetupIntent that doesn't exist on our side yet.
      paymentMethodCreation: 'manual',
    });
    this.paymentElement = this.elements.create('payment');
    this.paymentElement.mount(this.paymentElementContainer.nativeElement);

    this.mountingPayment.set(false);
  }

  protected retryPaymentSetup(): void {
    const p = this.pkg();
    if (p) {
      this.setupPayment(p);
    }
  }

  private refreshSlots(): void {
    this.availabilityService.getByVendor(this.vendorId).subscribe({
      next: (slots) => this.slots.set(slots),
    });
  }

  protected selectSlot(slotId: number): void {
    this.selectedSlotId.set(slotId);
    this.slotError.set(null);
  }

  protected guestCountErrorMessage(): string | null {
    const control = this.form.controls.guestCount;
    if (control.touched && control.hasError('exceedsMax')) {
      return `Guest count exceeds this package's maximum of ${this.pkg()?.maxGuests} guests.`;
    }
    return null;
  }

  protected goToVendors(): void {
    this.router.navigateByUrl('/client/vendors');
  }

  protected async submit(): Promise<void> {
    const slotId = this.selectedSlotId();
    if (!slotId) {
      this.slotError.set('Please choose an available date first.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.stripe || !this.elements) {
      this.error.set({
        status: 0,
        message: this.paymentSetupFailed()
          ? 'The payment form failed to load — use the Retry button above before submitting.'
          : 'The payment form is still loading — please wait a moment and try again.',
        fieldErrors: [],
      });
      return;
    }

    const raw = this.form.getRawValue();
    const guestCount = raw.guestCount.trim() === '' ? undefined : Number(raw.guestCount);
    const maxGuests = this.pkg()?.maxGuests;

    if (maxGuests != null && guestCount !== undefined && guestCount > maxGuests) {
      this.form.controls.guestCount.setErrors({ exceedsMax: true });
      this.form.controls.guestCount.markAsTouched();
      return;
    }

    const eventPlanId = this.eventPlanIdFromQuery ?? raw.eventPlanId;
    if (!eventPlanId) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.slotError.set(null);

    // Re-check right before charging the card — the ngOnInit check already
    // caught stale direct-navigation state, this catches a booking created
    // in another tab during the time this form was open.
    const blocking = await new Promise<BookingRequest | null>((resolve) =>
      this.checkForBlockingBooking().subscribe(resolve),
    );
    if (blocking) {
      this.submitting.set(false);
      const message =
        blocking.status === BookingStatus.Pending
          ? "You've already requested this package — waiting for the vendor's response."
          : "You've already booked this package.";
      notifyError(message);
      this.router.navigate(['/client/vendors', this.vendorId]);
      return;
    }

    // Deferred Stripe flow: submit() validates/collects the card fields,
    // createPaymentMethod() tokenizes them into a pm_... id — neither step
    // confirms a PaymentIntent, since none exists yet on our side.
    const { error: submitError } = await this.elements.submit();
    if (submitError) {
      this.error.set({
        status: 0,
        message: submitError.message ?? 'Please check your card details and try again.',
        fieldErrors: [],
      });
      this.submitting.set(false);
      return;
    }

    const { error: pmError, paymentMethod } = await this.stripe.createPaymentMethod({
      elements: this.elements,
    });
    if (pmError || !paymentMethod) {
      this.error.set({
        status: 0,
        message: pmError?.message ?? 'Could not process your card. Please try again.',
        fieldErrors: [],
      });
      this.submitting.set(false);
      return;
    }

    const dto: CreateBookingRequest = {
      eventPlanId,
      availabilityId: slotId,
      vendorPackageId: this.packageId,
      guestCount,
      clientMessage: raw.clientMessage.trim() || undefined,
      paymentMethodId: paymentMethod.id,
      requestId: crypto.randomUUID(),
    };

    this.bookingService.createBooking(dto).subscribe({
      next: () => {
        this.submitting.set(false);
        notifySuccess('Your booking request has been sent!');
        this.router.navigateByUrl('/client/event-plans?bookingSuccess=1');
      },
      error: (err: AppError) => {
        this.submitting.set(false);

        if (err.status === 409) {
          this.slotError.set("This slot was just booked by someone else — please pick another.");
          this.selectedSlotId.set(null);
          this.refreshSlots();
          return;
        }

        if (err.status === 402) {
          // Card declined server-side — no booking or hold was ever created,
          // so the slot/guest-count/message the client already entered are
          // still valid. Only the card needs to change; don't reset the form.
          this.error.set({
            ...err,
            message: `Your card was declined: ${err.message} Please try a different card.`,
          });
          notifyError('Payment declined', err.message);
          return;
        }

        this.error.set(err);
        notifyError('Could not submit booking request', err.message);
      },
    });
  }
}
