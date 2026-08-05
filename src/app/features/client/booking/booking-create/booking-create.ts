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
import type { Stripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { AgreementReview } from '../../../../shared/ui/agreement-review/agreement-review';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { SelectField, SelectOption } from '../../../../shared/ui/select-field/select-field';
import { StepperHeader } from '../../../../shared/ui/stepper-header/stepper-header';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { STRIPE_PUBLISHABLE_KEY } from '../../../../core/config/app-config';
import { AppError } from '../../../../core/interfaces/api-response.model';
import { CreateBookingRequest } from '../../../../core/interfaces/booking-request.model';
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

/** Two visual steps over the same form/submission — the booking is still only ever created in step 2's confirmBooking(). */
type WizardStep = 'details' | 'payment';
const WIZARD_STEP_LABELS = ['Details', 'Payment'];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** One cell of the month grid — carries every slot (of any status) touching that day, so booked/held/blocked days can be shown as busy rather than hidden. */
interface CalendarDay {
  date: Date;
  key: string;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isSelected: boolean;
  slots: VendorAvailability[];
  hasAvailable: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function lastOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Local (not UTC) yyyy-MM-dd key so slots group under the day the client sees. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

@Component({
  selector: 'app-booking-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TextField,
    SelectField,
    Button,
    AlertBanner,
    StepperHeader,
    AgreementReview,
    DecimalPipe,
    DatePipe,
  ],
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

  protected readonly currentStep = signal<WizardStep>('details');
  protected readonly wizardStepLabels = WIZARD_STEP_LABELS;
  protected readonly stepIndex = computed(() => (this.currentStep() === 'details' ? 0 : 1));

  // Booking Agreement (generated when the client reaches the payment step; must be agreed before booking).
  protected readonly agreementLoading = signal(false);
  protected readonly agreementUrl = signal<string | null>(null);
  protected readonly agreementError = signal<string | null>(null);
  protected readonly agreed = signal(false);
  private agreementToken: string | null = null;

  /** True while Stripe.js/Elements is loading — the payment section stays present but visually hidden. */
  protected readonly mountingPayment = signal(true);
  /** True if Stripe.js failed to load or didn't respond within STRIPE_LOAD_TIMEOUT_MS — shows a retry affordance instead of hanging silently. */
  protected readonly paymentSetupFailed = signal(false);
  /**
   * Set when Stripe's Payment Element itself emits 'loaderror' after mounting —
   * distinct from paymentSetupFailed (Stripe.js not loading). The common cause
   * is a Stripe account/currency configuration problem (e.g. no payment methods
   * activated for the package's currency, or the amount below that currency's
   * minimum), which otherwise leaves a silent, collapsed, empty card box.
   */
  protected readonly paymentLoadError = signal<string | null>(null);

  private vendorId = 0;
  private packageId = 0;
  private eventPlanIdFromQuery: number | null = null;

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;
  /** True once the Payment Element has actually been mounted into the (visible) container. */
  private paymentMounted = false;

  protected readonly availableSlots = computed(() =>
    this.slots().filter((slot) => slot.status === AvailabilityStatus.Available),
  );

  /** The full slot object for the payment-step's read-only recap — availableSlots only carries the id via selectedSlotId. */
  protected readonly selectedSlot = computed(
    () => this.slots().find((slot) => slot.id === this.selectedSlotId()) ?? null,
  );

  protected readonly AvailabilityStatus = AvailabilityStatus;
  protected readonly weekdayLabels = WEEKDAY_LABELS;

  protected readonly viewMonth = signal(startOfMonth(new Date()));
  /** Day (yyyy-MM-dd key) whose time-slot list is expanded beneath the grid — null when none is. */
  protected readonly expandedDayKey = signal<string | null>(null);

  protected readonly monthLabel = computed(() =>
    this.viewMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  );

  /** Every fetched slot (any status), spread across each calendar day its start→end range covers. */
  private readonly slotsByDay = computed<Map<string, VendorAvailability[]>>(() => {
    const byDay = new Map<string, VendorAvailability[]>();

    for (const slot of this.slots()) {
      const start = new Date(slot.startAt);
      const end = new Date(slot.endAt);
      const startDay = startOfDay(start);

      // A slot ending exactly at midnight belongs to the previous day, not the next.
      let endDay = startOfDay(end);
      if (end.getHours() === 0 && end.getMinutes() === 0 && endDay > startDay) {
        endDay = new Date(endDay);
        endDay.setDate(endDay.getDate() - 1);
      }
      if (endDay < startDay) {
        endDay = startDay;
      }

      const cursor = new Date(startDay);
      while (cursor <= endDay) {
        const key = dayKey(cursor);
        const list = byDay.get(key);
        if (list) {
          list.push(slot);
        } else {
          byDay.set(key, [slot]);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    for (const list of byDay.values()) {
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return byDay;
  });

  protected readonly weeks = computed<CalendarDay[][]>(() => {
    const month = this.viewMonth();
    const monthIndex = month.getMonth();
    const slotsByDay = this.slotsByDay();

    const today = new Date();
    const todayKey = dayKey(today);
    const todayMidnight = startOfDay(today);
    const selectedSlot = this.selectedSlot();
    const selectedKey = selectedSlot ? dayKey(new Date(selectedSlot.startAt)) : null;

    // Grid starts on the Sunday on/before the 1st, ends on the Saturday on/after the last day.
    const gridStart = new Date(month);
    gridStart.setDate(1 - month.getDay());

    const weeks: CalendarDay[][] = [];
    const cursor = new Date(gridStart);
    for (let w = 0; w < 6; w++) {
      const week: CalendarDay[] = [];
      for (let d = 0; d < 7; d++) {
        const key = dayKey(cursor);
        const daySlots = slotsByDay.get(key) ?? [];
        week.push({
          date: new Date(cursor),
          key,
          dayNum: cursor.getDate(),
          inMonth: cursor.getMonth() === monthIndex,
          isToday: key === todayKey,
          isPast: startOfDay(cursor) < todayMidnight,
          isSelected: key === selectedKey,
          slots: daySlots,
          hasAvailable: daySlots.some((s) => s.status === AvailabilityStatus.Available),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
      // Stop after the week that contains the last day of the month.
      if (cursor.getMonth() !== monthIndex && week[6].date >= lastOfMonth(month)) {
        break;
      }
    }
    return weeks;
  });

  /** The expanded day's slots (any status) for the time-slot list beneath the grid. */
  protected readonly expandedDaySlots = computed<VendorAvailability[]>(() => {
    const key = this.expandedDayKey();
    return key ? (this.slotsByDay().get(key) ?? []) : [];
  });

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

    this.loadData();
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
    this.paymentLoadError.set(null);

    // Retry path: discard any previously-created (possibly collapsed) element
    // before re-preparing from scratch.
    if (this.paymentElement) {
      this.paymentElement.unmount();
      this.paymentElement = null;
    }
    this.paymentMounted = false;

    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), STRIPE_LOAD_TIMEOUT_MS),
    );
    this.stripe = await Promise.race([
      this.stripeService.getStripe(STRIPE_PUBLISHABLE_KEY),
      timeout,
    ]);

    if (!this.stripe) {
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

    // Surface a Payment Element load failure instead of leaving a silent, empty,
    // collapsed card box. Fires e.g. when the account has no payment methods
    // activated for this package's currency, or the amount is below that
    // currency's Stripe minimum — a configuration issue Retry can't fix, so this
    // shows an explanatory message rather than the retry affordance.
    this.paymentElement.on('loaderror', (event) => {
      console.error('[booking-create] Stripe Payment Element loaderror:', event.error);
      this.paymentLoadError.set(
        event.error?.message ??
          'The payment form could not be loaded. Please try again later or contact support.',
      );
    });

    // Do NOT mount yet if we're still on step 1: Stripe's Payment Element
    // renders a collapsed, 0-height iframe (and never recovers) if it's mounted
    // while its container is display:none — which the payment step is during
    // step 1, where this runs. Mount now only if we're already on the payment
    // step (Stripe finished after the user advanced, or Retry was pressed
    // there); otherwise goToPayment() triggers the mount when it reveals it.
    if (this.currentStep() === 'payment') {
      await this.mountPaymentElement();
    } else {
      this.mountingPayment.set(false);
    }
  }

  /**
   * Mounts the prepared Payment Element into #paymentElementContainer once that
   * container is actually visible on screen. No-op if already mounted or not yet
   * prepared. Split out from setupPayment() so goToPayment() can trigger the
   * mount the moment the payment step becomes visible.
   */
  private async mountPaymentElement(): Promise<void> {
    if (this.paymentMounted || !this.paymentElement) {
      return;
    }
    this.mountingPayment.set(true);

    const container = await this.waitForVisiblePaymentContainer();
    if (!container) {
      this.paymentSetupFailed.set(true);
      this.mountingPayment.set(false);
      return;
    }

    this.paymentElement.mount(container.nativeElement);
    this.paymentMounted = true;
    this.mountingPayment.set(false);
  }

  /**
   * Resolves once #paymentElementContainer is both present in the DOM *and*
   * visible (no display:none ancestor), or null if that hasn't happened within
   * the bounded wait. Two render-timing gaps make this necessary: the @ViewChild
   * only updates after a change-detection pass, and the container's payment-step
   * ancestor only stops being display:none a render after currentStep flips to
   * 'payment'. Uses setTimeout (not requestAnimationFrame) so it keeps polling
   * even if the tab is backgrounded mid-setup.
   */
  private waitForVisiblePaymentContainer(): Promise<ElementRef<HTMLDivElement> | null> {
    return new Promise((resolve) => {
      const deadline = Date.now() + 3000;
      const check = () => {
        const el = this.paymentElementContainer;
        // offsetParent is null whenever the element or any ancestor is display:none.
        if (el && el.nativeElement.offsetParent !== null) {
          resolve(el);
        } else if (Date.now() >= deadline) {
          resolve(null);
        } else {
          setTimeout(check, 16);
        }
      };
      check();
    });
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

  /** Expands/collapses a day's time-slot list — no-op for past, outside-month, or fully-busy days. */
  protected selectDay(day: CalendarDay): void {
    if (day.isPast || !day.inMonth || !day.hasAvailable) {
      return;
    }
    this.expandedDayKey.update((key) => (key === day.key ? null : day.key));
  }

  protected selectSlot(slot: VendorAvailability): void {
    if (slot.status !== AvailabilityStatus.Available) {
      return;
    }
    this.selectedSlotId.set(slot.id);
    this.slotError.set(null);
  }

  protected slotStatusLabel(status: AvailabilityStatus): string {
    switch (status) {
      case AvailabilityStatus.Available:
        return 'Available';
      case AvailabilityStatus.Booked:
        return 'Booked';
      case AvailabilityStatus.Held:
        return 'Held';
      case AvailabilityStatus.Blocked:
        return 'Blocked';
    }
  }

  protected prevMonth(): void {
    this.viewMonth.update((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    this.expandedDayKey.set(null);
  }

  protected nextMonth(): void {
    this.viewMonth.update((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    this.expandedDayKey.set(null);
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

  /** Shared by both the Step 1 -> Step 2 advance and confirmBooking()'s own defensive re-check — same checks either way, just triggered from two places. */
  private validateBookingDetails(): boolean {
    const slotId = this.selectedSlotId();
    if (!slotId) {
      this.slotError.set('Please choose an available date first.');
      return false;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return false;
    }

    const raw = this.form.getRawValue();
    const guestCount = raw.guestCount.trim() === '' ? undefined : Number(raw.guestCount);
    const maxGuests = this.pkg()?.maxGuests;

    if (maxGuests != null && guestCount !== undefined && guestCount > maxGuests) {
      this.form.controls.guestCount.setErrors({ exceedsMax: true });
      this.form.controls.guestCount.markAsTouched();
      return false;
    }

    return true;
  }

  protected goToPayment(): void {
    if (!this.validateBookingDetails()) {
      return;
    }
    this.currentStep.set('payment');
    // The payment step (and its #paymentElementContainer) becomes visible on the
    // next render — mount the already-prepared element into it now. No-op if
    // Stripe.js is still loading; setupPayment() mounts once it finishes, since
    // currentStep is now 'payment'.
    void this.mountPaymentElement();
    // Generate the Booking Agreement for the (now-fixed) details so the client can
    // review and agree before confirming. Regenerated on every entry to this step,
    // so a details change picks up a fresh agreement (no persistent draft is kept).
    this.loadAgreement();
  }

  /**
   * Requests the server-generated Booking Agreement for the current booking details and shows it in
   * the embedded viewer. The returned token binds this exact agreement to the booking on confirm.
   */
  private loadAgreement(): void {
    const slotId = this.selectedSlotId();
    const raw = this.form.getRawValue();
    const eventPlanId = this.eventPlanIdFromQuery ?? raw.eventPlanId;
    if (!slotId || !eventPlanId) {
      return;
    }

    const guestCount = raw.guestCount.trim() === '' ? undefined : Number(raw.guestCount);

    this.agreementLoading.set(true);
    this.agreementError.set(null);
    this.agreed.set(false);
    this.agreementUrl.set(null);
    this.agreementToken = null;

    this.bookingService
      .previewAgreement({
        eventPlanId,
        availabilityId: slotId,
        vendorPackageId: this.packageId,
        guestCount,
        clientMessage: raw.clientMessage.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.agreementToken = res.token;
          this.agreementUrl.set(res.documentUrl);
          this.agreementLoading.set(false);
        },
        error: (err: AppError) => {
          this.agreementError.set(
            err.message || 'The Booking Agreement could not be prepared. Please try again.',
          );
          this.agreementLoading.set(false);
        },
      });
  }

  protected backToDetails(): void {
    this.currentStep.set('details');
  }

  protected async confirmBooking(): Promise<void> {
    // Defensive re-check — the UI shouldn't let anyone reach step 2 without
    // passing this already, but don't rely on step-gating alone.
    if (!this.validateBookingDetails()) {
      this.currentStep.set('details');
      return;
    }

    const slotId = this.selectedSlotId()!;

    if (this.paymentLoadError()) {
      this.error.set({
        status: 0,
        message:
          'The payment form could not be loaded, so this booking cannot be submitted. Please contact support.',
        fieldErrors: [],
      });
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

    // Defensive re-check of the agreement gate — the button is disabled until it's met, but never
    // rely on step-gating alone.
    if (!this.agreementToken || !this.agreed()) {
      this.error.set({
        status: 0,
        message: 'Please review and agree to the Booking Agreement before confirming.',
        fieldErrors: [],
      });
      return;
    }

    const raw = this.form.getRawValue();
    const guestCount = raw.guestCount.trim() === '' ? undefined : Number(raw.guestCount);

    const eventPlanId = this.eventPlanIdFromQuery ?? raw.eventPlanId;
    if (!eventPlanId) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.slotError.set(null);

    // Deferred Stripe flow: elements.submit() validates/collects the card
    // fields, createPaymentMethod() tokenizes them into a pm_... id —
    // neither step confirms a PaymentIntent, since none exists yet on our side.
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
      agreementToken: this.agreementToken,
      agreementAccepted: true,
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
          this.slotError.set(
            err.message || "This slot was just booked by someone else — please pick another.",
          );
          this.selectedSlotId.set(null);
          this.refreshSlots();
          this.currentStep.set('details');
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

        if (err.status === 400 && /agreement/i.test(err.message ?? '')) {
          // The reviewed agreement expired between review and submit — regenerate it and ask the
          // client to read and agree again before retrying.
          this.loadAgreement();
          this.error.set({ ...err });
          notifyError('Please review the agreement again', err.message);
          return;
        }

        this.error.set(err);
        notifyError('Could not submit booking request', err.message);
      },
    });
  }
}
