import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { AppError } from '../../../core/interfaces/api-response.model';
import { BookingRequest, BookingStatus } from '../../../core/interfaces/booking-request.model';
import { VendorPackage } from '../../../core/interfaces/vendor-package.model';
import { VendorProfile } from '../../../core/interfaces/vendor-profile.model';
import { BookingRequestService } from '../../../core/services/booking-request.service';
import { VendorPackageService } from '../../../core/services/vendor-package.service';
import { VendorService } from '../../../core/services/vendor.service';

@Component({
  selector: 'app-vendor-details',
  standalone: true,
  imports: [AlertBanner, DecimalPipe],
  templateUrl: './vendor-details.html',
  styleUrl: './vendor-details.css',
})
export class VendorDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vendorService = inject(VendorService);
  private readonly packageService = inject(VendorPackageService);
  private readonly bookingService = inject(BookingRequestService);

  protected readonly vendor = signal<VendorProfile | null>(null);
  protected readonly packages = signal<VendorPackage[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  /**
   * Locked business rule: a Pending or Accepted booking for a package blocks
   * booking it again; Rejected/Cancelled/Expired/Completed don't (Completed
   * explicitly allows rebooking — repeat business is a legitimate case).
   * Keyed by vendorPackageId -> the blocking booking, so each package row can
   * show why it's blocked.
   */
  protected readonly blockingByPackageId = signal<Map<number, BookingRequest>>(new Map());

  private vendorId = 0;
  private eventPlanId: number | null = null;

  ngOnInit(): void {
    this.vendorId = Number(this.route.snapshot.paramMap.get('id'));
    const eventPlanIdParam = this.route.snapshot.queryParamMap.get('eventPlanId');
    this.eventPlanId = eventPlanIdParam ? Number(eventPlanIdParam) : null;

    this.loading.set(true);
    this.error.set(null);

    this.vendorService.getById(this.vendorId).subscribe({
      next: (vendor) => {
        this.vendor.set(vendor);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });

    this.packageService.getByVendor(this.vendorId, true).subscribe({
      next: (packages) => this.packages.set(packages),
      error: () => this.packages.set([]),
    });

    this.loadBlockingBookings();
  }

  private loadBlockingBookings(): void {
    // No vendorPackageId filter exists server-side — fetch the client's full
    // booking list (same pattern as event-plan-detail) and filter here.
    this.bookingService.listMyBookings({ pageSize: 100 }).subscribe({
      next: (result) => {
        const map = new Map<number, BookingRequest>();
        for (const booking of result.items) {
          if (
            booking.vendorPackageId != null &&
            (booking.status === BookingStatus.Pending || booking.status === BookingStatus.Accepted)
          ) {
            map.set(booking.vendorPackageId, booking);
          }
        }
        this.blockingByPackageId.set(map);
      },
      error: () => this.blockingByPackageId.set(new Map()),
    });
  }

  protected blockingBooking(pkg: VendorPackage): BookingRequest | null {
    return this.blockingByPackageId().get(pkg.id) ?? null;
  }

  protected blockingLabel(booking: BookingRequest): string {
    return booking.status === BookingStatus.Pending
      ? 'Pending — awaiting vendor'
      : 'Already booked';
  }

  protected blockingTone(booking: BookingRequest): 'pending' | 'success' {
    return booking.status === BookingStatus.Pending ? 'pending' : 'success';
  }

  /** VendorDto's status comes through raw/lowercase ("verified"/"trusted"), unlike VendorListItemDto's capitalized form. */
  protected formatStatus(status: string): string {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
  }

  protected bookPackage(pkg: VendorPackage): void {
    // Defense in depth lives in booking-create too — this just prevents the
    // click from firing when the UI already shows the package as blocked.
    if (this.blockingBooking(pkg)) {
      return;
    }

    this.router.navigate(['/client/booking/new'], {
      queryParams: {
        vendorId: this.vendorId,
        packageId: pkg.id,
        eventPlanId: this.eventPlanId ?? undefined,
      },
    });
  }
}
