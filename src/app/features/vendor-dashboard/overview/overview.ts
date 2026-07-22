import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VendorProfileStateService } from '../../../core/services/vendor-profile-state.service';
import { BookingRequestList } from '../booking-requests/booking-request-list/booking-request-list';
import { DashboardStats } from '../dashboard-stats/dashboard-stats';

/**
 * Vendor landing page: the stat tiles (each a drill-down link into its own page)
 * plus the pending queue, which is the only thing that needs the vendor's action.
 * The pending list is BookingRequestList embedded with its tab locked, so accept
 * and decline behave identically here and on the full My Booking Requests page.
 */
@Component({
  selector: 'app-vendor-overview',
  standalone: true,
  imports: [RouterLink, DashboardStats, BookingRequestList],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview {
  protected readonly vendorProfileState = inject(VendorProfileStateService);
}
