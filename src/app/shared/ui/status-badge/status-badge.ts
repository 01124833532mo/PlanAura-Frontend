import { Component, Input } from '@angular/core';
import { BookingPaymentStatus, BookingStatus } from '../../../core/interfaces/booking-request.model';

type BadgeTone = 'pending' | 'gold' | 'success' | 'error' | 'muted';

@Component({
  selector: 'ui-status-badge',
  standalone: true,
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css',
})
export class StatusBadge {
  @Input({ required: true }) status!: BookingStatus;
  @Input() paymentStatus: BookingPaymentStatus | null = null;

  protected get label(): string {
    return this.resolve().label;
  }

  protected get tone(): BadgeTone {
    return this.resolve().tone;
  }

  private resolve(): { label: string; tone: BadgeTone } {
    switch (this.status) {
      case BookingStatus.Pending:
        return { label: 'Awaiting vendor response', tone: 'pending' };
      case BookingStatus.Accepted:
        return this.paymentStatus === BookingPaymentStatus.Paid
          ? { label: 'Confirmed & Paid', tone: 'success' }
          : { label: 'Accepted — Payment due', tone: 'gold' };
      case BookingStatus.Rejected:
        return { label: 'Declined', tone: 'error' };
      case BookingStatus.Cancelled:
        return { label: 'Cancelled', tone: 'muted' };
      case BookingStatus.Expired:
        return { label: 'Expired', tone: 'muted' };
      case BookingStatus.Completed:
        return { label: 'Completed', tone: 'gold' };
      default:
        return { label: 'Unknown', tone: 'muted' };
    }
  }
}
