import { BookingPaymentStatus, BookingStatus, DisputeStatus, RefundStatus } from '../../../core/interfaces/booking-request.model';
import { PaymentStatus } from '../../../core/interfaces/payment.model';

export type AdminBadgeTone =
  | 'indigo'
  | 'purple'
  | 'cyan'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export interface AdminStatusPresentation {
  label: string;
  tone: AdminBadgeTone;
}

/** Maps Vendor.VerificationStatus (lowercase strings) to a badge presentation. */
export function mapVendorStatus(status: string): AdminStatusPresentation {
  switch (status?.toLowerCase()) {
    case 'trusted':
      return { label: 'Trusted', tone: 'purple' };
    case 'verified':
      return { label: 'Verified', tone: 'success' };
    case 'pending':
      return { label: 'Pending Review', tone: 'warning' };
    case 'rejected':
      return { label: 'Rejected', tone: 'danger' };
    default:
      return { label: 'Unverified', tone: 'neutral' };
  }
}

export function mapBookingStatus(status: BookingStatus): AdminStatusPresentation {
  switch (status) {
    case BookingStatus.Pending:
      return { label: 'Pending', tone: 'warning' };
    case BookingStatus.Accepted:
      return { label: 'Accepted', tone: 'indigo' };
    case BookingStatus.Rejected:
      return { label: 'Rejected', tone: 'danger' };
    case BookingStatus.Cancelled:
      return { label: 'Cancelled', tone: 'neutral' };
    case BookingStatus.Completed:
      return { label: 'Completed', tone: 'success' };
    case BookingStatus.Expired:
      return { label: 'Expired', tone: 'neutral' };
    case BookingStatus.AwaitingConfirmation:
      return { label: 'Awaiting Confirmation', tone: 'warning' };
    case BookingStatus.CancellationRequested:
      return { label: 'Cancellation Requested', tone: 'warning' };
    default:
      return { label: 'Unknown', tone: 'neutral' };
  }
}

export function mapRefundStatus(status: RefundStatus): AdminStatusPresentation {
  switch (status) {
    case RefundStatus.PendingReview:
      return { label: 'Pending Review', tone: 'warning' };
    case RefundStatus.Processed:
      return { label: 'Processed', tone: 'cyan' };
    case RefundStatus.Rejected:
      return { label: 'Rejected', tone: 'danger' };
    default:
      return { label: 'None', tone: 'neutral' };
  }
}

export function mapBookingPaymentStatus(status: BookingPaymentStatus): AdminStatusPresentation {
  switch (status) {
    case BookingPaymentStatus.Paid:
      return { label: 'Paid', tone: 'success' };
    case BookingPaymentStatus.Refunded:
      return { label: 'Refunded', tone: 'cyan' };
    case BookingPaymentStatus.DepositPaid:
      return { label: 'Deposit Paid', tone: 'indigo' };
    case BookingPaymentStatus.RemainderFailed:
      return { label: 'Remainder Failed', tone: 'danger' };
    case BookingPaymentStatus.Unpaid:
      return { label: 'Unpaid', tone: 'warning' };
    default:
      return { label: 'Unpaid', tone: 'warning' };
  }
}

export function mapDisputeStatus(status: DisputeStatus | null): AdminStatusPresentation {
  if (status === DisputeStatus.Open) {
    return { label: 'Open', tone: 'danger' };
  }
  if (status === DisputeStatus.Resolved) {
    return { label: 'Resolved', tone: 'success' };
  }
  return { label: 'None', tone: 'neutral' };
}

export function mapPaymentStatus(status: PaymentStatus): AdminStatusPresentation {
  switch (status) {
    case PaymentStatus.Completed:
      return { label: 'Completed', tone: 'success' };
    case PaymentStatus.Pending:
      return { label: 'Pending', tone: 'warning' };
    case PaymentStatus.Authorized:
      return { label: 'Authorized', tone: 'indigo' };
    case PaymentStatus.Failed:
      return { label: 'Failed', tone: 'danger' };
    case PaymentStatus.Refunded:
      return { label: 'Refunded', tone: 'cyan' };
    case PaymentStatus.Cancelled:
      return { label: 'Cancelled', tone: 'neutral' };
    case PaymentStatus.DepositAuthorized:
      return { label: 'Deposit Authorized', tone: 'indigo' };
    case PaymentStatus.DepositPaid_RemainderDue:
      return { label: 'Deposit Paid', tone: 'purple' };
    case PaymentStatus.RemainderCharging:
      return { label: 'Charging Remainder', tone: 'warning' };
    case PaymentStatus.FullyPaid:
      return { label: 'Fully Paid', tone: 'success' };
    case PaymentStatus.RemainderFailed:
      return { label: 'Remainder Failed', tone: 'danger' };
    default:
      return { label: 'Unknown', tone: 'neutral' };
  }
}

export function mapAccountActive(isActive: boolean): AdminStatusPresentation {
  return isActive
    ? { label: 'Active', tone: 'success' }
    : { label: 'Suspended', tone: 'danger' };
}
