import { BookingPaymentSummary } from '../../core/interfaces/booking-request.model';
import { PaymentStatus } from '../../core/interfaces/payment.model';

/**
 * Collapses the full 12-value PaymentStatus into the 5 labels a vendor needs at request/booking-list
 * altitude, where the deposit/remainder/held-on-card mechanics are unnecessary detail. The full
 * breakdown (app-payment-breakdown) is still the source of truth once the vendor drills into an
 * accepted booking's details.
 */
export function simplePaymentStatusLabel(summary: BookingPaymentSummary | null): string {
  if (!summary) {
    return 'No payment yet';
  }

  switch (summary.status) {
    case PaymentStatus.DepositAuthorized:
      return 'Deposit authorized';
    case PaymentStatus.DepositPaid_RemainderDue:
    case PaymentStatus.RemainderCharging:
    case PaymentStatus.RemainderFailed:
      return 'Deposit paid';
    case PaymentStatus.Completed:
    case PaymentStatus.FullyPaid:
      return 'Fully paid';
    case PaymentStatus.Refunded:
    case PaymentStatus.PartiallyRefunded:
      return 'Refunded';
    case PaymentStatus.Pending:
    case PaymentStatus.Authorized:
    case PaymentStatus.Failed:
    case PaymentStatus.Cancelled:
    default:
      return 'No payment yet';
  }
}
