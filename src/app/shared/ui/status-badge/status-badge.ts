import { Component, Input } from '@angular/core';
import {
  BookingPaymentStatus,
  BookingStatus,
} from '../../../core/interfaces/booking-request.model';

type BadgeTone = 'pending' | 'gold' | 'success' | 'error' | 'muted';

/**
 * Under the authorize-then-capture payment model, a booking's card is
 * authorized at submit time — Accepted always implies Paid (capture happens
 * atomically on vendor accept) and Rejected/Cancelled/Expired always imply no
 * charge was made. There is no longer an "Accepted but unpaid" state, so the
 * booking status alone is enough for every case except a refund, which is
 * tracked separately on paymentStatus and can apply on top of any booking
 * status (e.g. a Completed or Cancelled booking can later be refunded).
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
        return { label: 'Confirmed & Paid', tone: 'success' };
      case BookingStatus.Rejected:
        return { label: 'Declined — no charge made', tone: 'error' };
      case BookingStatus.Cancelled:
        return { label: 'Cancelled — no charge made', tone: 'muted' };
      case BookingStatus.Expired:
        return { label: 'Expired — no charge made', tone: 'muted' };
      case BookingStatus.Completed:
        return { label: 'Completed', tone: 'gold' };
      default:
        return { label: 'Unknown', tone: 'muted' };
    }
  }
}
