import { Component, Input } from '@angular/core';
import {
  BookingPaymentStatus,
  BookingStatus,
} from '../../../core/interfaces/booking-request.model';

type BadgeTone = 'pending' | 'gold' | 'success' | 'error' | 'muted';

/**
 * For a full-payment booking the card is authorized at submit and captured on vendor accept, so Accepted
 * implies Paid and the booking status alone drives the badge. Deposit bookings break that: an Accepted
 * booking can be DepositPaid (deposit captured, remainder still due), RemainderFailed (the auto remainder
 * charge failed), or Paid (remainder collected → fully paid) — so the Accepted case reads paymentStatus.
 * Refunded still overrides everything (it can apply on top of any status).
 */
@Component({
  selector: 'ui-status-badge',
  standalone: true,
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css',
})
export class StatusBadge {
  @Input({ required: true }) status!: BookingStatus;
  @Input() paymentStatus?: BookingPaymentStatus;

  protected get label(): string {
    return this.resolve().label;
  }

  protected get tone(): BadgeTone {
    return this.resolve().tone;
  }

  private resolve(): { label: string; tone: BadgeTone } {
    if (this.paymentStatus === BookingPaymentStatus.Refunded) {
      return { label: 'Refunded', tone: 'muted' };
    }

    switch (this.status) {
      case BookingStatus.Pending:
        return { label: 'Awaiting vendor response — payment authorized', tone: 'pending' };
      case BookingStatus.Accepted:
        if (this.paymentStatus === BookingPaymentStatus.DepositPaid) {
          return { label: 'Deposit paid', tone: 'gold' };
        }
        if (this.paymentStatus === BookingPaymentStatus.RemainderFailed) {
          return { label: 'Payment failed', tone: 'error' };
        }
        return { label: 'Confirmed & Paid', tone: 'success' };
      case BookingStatus.Rejected:
        return { label: 'Declined — no charge made', tone: 'error' };
      case BookingStatus.Cancelled:
        // A deposit-only booking cancelled while the remainder was still owed keeps its DepositPaid/
        // RemainderFailed paymentStatus — the deposit was captured and is forfeited, so "no charge made"
        // is wrong here. Only a pre-accept (Unpaid/Authorized) cancel truly captured nothing.
        if (
          this.paymentStatus === BookingPaymentStatus.DepositPaid ||
          this.paymentStatus === BookingPaymentStatus.RemainderFailed
        ) {
          return { label: 'Cancelled — deposit non-refundable', tone: 'muted' };
        }
        return { label: 'Cancelled — no charge made', tone: 'muted' };
      case BookingStatus.Expired:
        return { label: 'Expired — no charge made', tone: 'muted' };
      case BookingStatus.Completed:
        return { label: 'Completed', tone: 'gold' };
      case BookingStatus.AwaitingConfirmation:
        return { label: 'Please confirm service delivery', tone: 'pending' };
      case BookingStatus.CancellationRequested:
        return { label: 'Cancellation requested — pending review', tone: 'pending' };
      default:
        return { label: 'Unknown', tone: 'muted' };
    }
  }
}
