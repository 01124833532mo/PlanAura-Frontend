import { DecimalPipe } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
import { BookingPaymentQuote, BookingPaymentSummary } from '../../../core/interfaces/booking-request.model';
import { PaymentStatus } from '../../../core/interfaces/payment.model';

/** One line of the payment schedule, in the order the money is actually taken. */
interface ScheduleStage {
  label: string;
  amount: number;
  state: 'paid' | 'held' | 'due' | 'upcoming' | 'unscheduled' | 'refunded' | 'cancelled';
  note: string;
}

/**
 * The financial heart of checkout: total, what is being taken right now, and what is left.
 *
 * Two modes, because a booking's money means different things before and after submission:
 *  - `quote` — what *will* be charged for a booking not yet submitted.
 *  - `summary` — what has *actually* happened to an existing booking's payment.
 *
 * The distinction this component exists to protect: Planura authorizes the card at booking and
 * captures only when the vendor accepts. So an authorized amount is NOT a paid amount, and is never
 * labelled as one. Every figure comes from the backend; nothing is derived here beyond choosing
 * which of the supplied values to show.
 */
@Component({
  selector: 'app-payment-breakdown',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './payment-breakdown.html',
  styleUrl: './payment-breakdown.css',
})
export class PaymentBreakdown {
  /** Pre-submission pricing. Ignored when {@link summary} is supplied. */
  @Input() set quote(value: BookingPaymentQuote | null) {
    this.quoteSignal.set(value);
  }

  /** Post-submission reality. Takes precedence over {@link quote}. */
  @Input() set summary(value: BookingPaymentSummary | null) {
    this.summarySignal.set(value);
  }

  /** Hides the schedule list, e.g. in the compact my-bookings context. */
  @Input() compact = false;

  /** Shows the vendor-facing deposit/remainder collected breakdown below the headline figures. */
  @Input() detailed = false;

  protected readonly quoteSignal = signal<BookingPaymentQuote | null>(null);
  protected readonly summarySignal = signal<BookingPaymentSummary | null>(null);

  protected readonly currency = computed(
    () => this.summarySignal()?.currency ?? this.quoteSignal()?.currency ?? '',
  );

  protected readonly total = computed(
    () => this.summarySignal()?.totalAmount ?? this.quoteSignal()?.totalAmount ?? 0,
  );

  /**
   * The headline number. Before submission it is what is about to be authorized; after submission it
   * is what has been captured, which is zero while the vendor has not yet accepted.
   */
  protected readonly primaryAmount = computed(() => {
    const summary = this.summarySignal();
    if (summary) {
      if (summary.status === PaymentStatus.Refunded || summary.status === PaymentStatus.PartiallyRefunded) {
        return summary.refundedAmount;
      }
      return summary.amountPaid > 0 ? summary.amountPaid : summary.amountAuthorized;
    }

    return this.quoteSignal()?.amountDueNow ?? 0;
  });

  protected readonly primaryLabel = computed(() => {
    const summary = this.summarySignal();
    if (!summary) {
      return 'Due now';
    }

    if (summary.status === PaymentStatus.Refunded) {
      return 'Refunded';
    }
    if (summary.status === PaymentStatus.PartiallyRefunded) {
      return 'Partially refunded';
    }

    if (summary.amountPaid > 0) {
      return 'Paid';
    }

    return summary.amountAuthorized > 0 ? 'Held on your card' : 'Charged';
  });

  /** Deposit path only: how much of the collected total came from the deposit vs. the remainder. Fully
   * derived from fields the backend already returns — no separate API data needed for the vendor's
   * "deposit paid / remainder paid" breakdown. */
  protected readonly depositPaidAmount = computed(() => {
    const summary = this.summarySignal();
    if (!summary?.isDeposit) {
      return 0;
    }
    return Math.min(summary.amountPaid, summary.depositAmount ?? 0);
  });

  protected readonly remainderPaidAmount = computed(() => {
    const summary = this.summarySignal();
    if (!summary?.isDeposit) {
      return 0;
    }
    return Math.max(summary.amountPaid - (summary.depositAmount ?? 0), 0);
  });

  /** Total ever collected, unaffected by primaryAmount's refunded-figure override above — what the
   * vendor's "Total collected" figure should always show. */
  protected readonly totalCollected = computed(() => this.summarySignal()?.amountPaid ?? 0);

  protected readonly remaining = computed(
    () => this.summarySignal()?.remainingAmount ?? this.quoteSignal()?.remainingAmount ?? 0,
  );

  protected readonly hasRemaining = computed(() => this.remaining() > 0);

  protected readonly isDeposit = computed(
    () => this.summarySignal()?.isDeposit ?? this.quoteSignal()?.isDeposit ?? false,
  );

  /** True when the backend has confirmed no automatic collection exists for the balance. */
  protected readonly remainderUnscheduled = computed(() => {
    const source = this.summarySignal() ?? this.quoteSignal();
    return this.hasRemaining() && source?.remainderCollectionScheduled === false;
  });

  protected readonly statusLabel = computed(() => {
    const summary = this.summarySignal();
    if (!summary) {
      return null;
    }

    return PAYMENT_STATUS_LABELS[summary.status] ?? 'Unknown';
  });

  protected readonly statusTone = computed(() => {
    const summary = this.summarySignal();
    return summary ? PAYMENT_STATUS_TONES[summary.status] ?? 'neutral' : 'neutral';
  });

  protected readonly statusIcon = computed(() => {
    const summary = this.summarySignal();
    return summary ? PAYMENT_STATUS_ICONS[summary.status] ?? 'help' : 'help';
  });

  /**
   * The stages of this booking's payment, built only from amounts the backend actually reports.
   * Nothing is projected: a balance with no collection mechanism is shown as "not yet scheduled"
   * rather than as a dated future instalment the platform has no way to take.
   */
  protected readonly schedule = computed<ScheduleStage[]>(() => {
    const summary = this.summarySignal();
    const quote = this.quoteSignal();
    const stages: ScheduleStage[] = [];

    if (summary) {
      if (summary.status === PaymentStatus.Refunded || summary.status === PaymentStatus.PartiallyRefunded) {
        const isPartial = summary.status === PaymentStatus.PartiallyRefunded;
        stages.push({
          label: summary.isDeposit ? 'Deposit' : 'Full payment',
          amount: summary.refundedAmount,
          state: 'refunded',
          note: isPartial
            ? `Partially refunded (${summary.refundedAmount} of ${summary.totalAmount})`
            : 'Refunded',
        });
        return stages;
      }

      if (summary.status === PaymentStatus.Cancelled || summary.status === PaymentStatus.Failed) {
        stages.push({
          label: summary.isDeposit ? 'Deposit' : 'Full payment',
          amount: summary.amountAuthorized || summary.totalAmount,
          state: 'cancelled',
          note: summary.status === PaymentStatus.Failed ? 'Payment failed' : 'Hold released',
        });
        return stages;
      }

      const firstAmount = summary.amountPaid > 0 ? summary.amountPaid : summary.amountAuthorized;
      stages.push({
        label: summary.isDeposit ? 'Deposit' : 'Full payment',
        amount: firstAmount,
        state: summary.amountPaid > 0 ? 'paid' : 'held',
        note:
          summary.amountPaid > 0
            ? 'Charged'
            : 'Authorized — charged when the vendor accepts',
      });

      if (summary.remainingAmount > 0) {
        stages.push({
          label: 'Remaining balance',
          amount: summary.remainingAmount,
          state: summary.remainderCollectionScheduled ? 'upcoming' : 'unscheduled',
          note: summary.remainderCollectionScheduled
            ? 'Scheduled before the event'
            : 'Not yet scheduled — arranged with the vendor before the event',
        });
      }

      return stages;
    }

    if (!quote) {
      return stages;
    }

    stages.push({
      label: quote.isDeposit ? 'Deposit' : 'Full payment',
      amount: quote.amountDueNow,
      state: 'due',
      note: 'Authorized now, charged when the vendor accepts',
    });

    if (quote.remainingAmount > 0) {
      stages.push({
        label: 'Remaining balance',
        amount: quote.remainingAmount,
        state: quote.remainderCollectionScheduled ? 'upcoming' : 'unscheduled',
        note: quote.remainderCollectionScheduled
          ? 'Scheduled before the event'
          : 'Not yet scheduled — arranged with the vendor before the event',
      });
    }

    return stages;
  });

  /** Explains why this booking is on the deposit path, using the server's own threshold. */
  protected readonly depositExplanation = computed(() => {
    const quote = this.quoteSignal();
    if (!quote?.isDeposit || quote.depositPercentage === null) {
      return null;
    }

    return `Your event is ${quote.daysUntilEvent} days away, so only a ${quote.depositPercentage}% deposit is taken now. Bookings within ${quote.fullPaymentThresholdDays} days of the event are paid in full up front.`;
  });

  protected stageIcon(state: ScheduleStage['state']): string {
    return STAGE_ICONS[state];
  }
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.Pending]: 'Pending',
  [PaymentStatus.Completed]: 'Paid in full',
  [PaymentStatus.Failed]: 'Failed',
  [PaymentStatus.Refunded]: 'Refunded',
  [PaymentStatus.Authorized]: 'Authorized — not yet charged',
  [PaymentStatus.Cancelled]: 'Hold released',
  [PaymentStatus.DepositPaid_RemainderDue]: 'Deposit paid — balance due',
  [PaymentStatus.DepositAuthorized]: 'Deposit authorized — not yet charged',
  [PaymentStatus.FullyPaid]: 'Paid in full',
  [PaymentStatus.RemainderFailed]: 'Remainder payment failed',
  [PaymentStatus.RemainderCharging]: 'Charging remainder…',
  [PaymentStatus.PartiallyRefunded]: 'Partially refunded',
};

const PAYMENT_STATUS_TONES: Record<PaymentStatus, string> = {
  [PaymentStatus.Pending]: 'neutral',
  [PaymentStatus.Completed]: 'success',
  [PaymentStatus.Failed]: 'danger',
  [PaymentStatus.Refunded]: 'neutral',
  [PaymentStatus.Authorized]: 'info',
  [PaymentStatus.Cancelled]: 'neutral',
  [PaymentStatus.DepositPaid_RemainderDue]: 'partial',
  [PaymentStatus.DepositAuthorized]: 'info',
  [PaymentStatus.FullyPaid]: 'success',
  [PaymentStatus.RemainderFailed]: 'danger',
  [PaymentStatus.RemainderCharging]: 'info',
  [PaymentStatus.PartiallyRefunded]: 'neutral',
};

const PAYMENT_STATUS_ICONS: Record<PaymentStatus, string> = {
  [PaymentStatus.Pending]: 'schedule',
  [PaymentStatus.Completed]: 'check_circle',
  [PaymentStatus.Failed]: 'error',
  [PaymentStatus.Refunded]: 'undo',
  [PaymentStatus.Authorized]: 'lock_clock',
  [PaymentStatus.Cancelled]: 'cancel',
  [PaymentStatus.DepositPaid_RemainderDue]: 'contrast',
  [PaymentStatus.DepositAuthorized]: 'lock_clock',
  [PaymentStatus.FullyPaid]: 'check_circle',
  [PaymentStatus.RemainderFailed]: 'error',
  [PaymentStatus.RemainderCharging]: 'sync',
  [PaymentStatus.PartiallyRefunded]: 'undo',
};

const STAGE_ICONS: Record<ScheduleStage['state'], string> = {
  paid: 'check_circle',
  held: 'lock_clock',
  due: 'radio_button_checked',
  upcoming: 'radio_button_unchecked',
  unscheduled: 'more_horiz',
  refunded: 'undo',
  cancelled: 'cancel',
};
