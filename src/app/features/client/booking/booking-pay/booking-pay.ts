import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Button } from '../../../../shared/ui/button/button';

/**
 * Placeholder for the post-acceptance payment step (booking accepted but
 * still Unpaid). The real checkout flow — charging the already-authorized
 * PaymentMethod or collecting a new one — isn't built yet; this just gives
 * the "Pay now" link in event-plan-detail somewhere valid to land.
 */
@Component({
  selector: 'app-booking-pay',
  standalone: true,
  imports: [Button],
  templateUrl: './booking-pay.html',
  styleUrl: './booking-pay.css',
})
export class BookingPay {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly bookingId = Number(this.route.snapshot.paramMap.get('id'));

  protected goToBookings(): void {
    this.router.navigateByUrl('/client/bookings');
  }
}
