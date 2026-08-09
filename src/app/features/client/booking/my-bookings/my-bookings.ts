import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { DocumentDownload } from '../../../../shared/ui/document-download/document-download';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  BookingPaymentStatus,
  BookingRequest,
} from '../../../../core/interfaces/booking-request.model';
import { EventPlan } from '../../../../core/interfaces/event-plan.model';
import { VendorPackage } from '../../../../core/interfaces/vendor-package.model';
import { VendorProfile } from '../../../../core/interfaces/vendor-profile.model';
import { BookingRequestService } from '../../../../core/services/booking-request.service';
import { EventPlanService } from '../../../../core/services/event-plan.service';
import { VendorPackageService } from '../../../../core/services/vendor-package.service';
import { VendorService } from '../../../../core/services/vendor.service';

/**
 * Read-only, navigational list of every booking the client has across all
 * their event plans. Actions (cancel/dispute) intentionally stay on
 * event-plan-detail, which already has that logic — this page just links
 * into it for full context, avoiding duplicating the action code here.
 */
@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [AlertBanner, Button, DocumentDownload, StatusBadge, DatePipe, DecimalPipe],
  templateUrl: './my-bookings.html',
  styleUrl: './my-bookings.css',
})
export class MyBookings implements OnInit {
  // Exposed so the template can reference enum members directly.
  protected readonly BookingPaymentStatus = BookingPaymentStatus;

  private readonly router = inject(Router);
  private readonly bookingService = inject(BookingRequestService);
  private readonly eventPlanService = inject(EventPlanService);
  private readonly vendorService = inject(VendorService);
  private readonly packageService = inject(VendorPackageService);

  protected readonly bookings = signal<BookingRequest[]>([]);
  protected readonly eventPlansById = signal<Map<number, EventPlan>>(new Map());
  protected readonly vendorsById = signal<Map<number, VendorProfile>>(new Map());
  protected readonly packagesById = signal<Map<number, VendorPackage>>(new Map());

  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      bookings: this.bookingService.listMyBookings({ pageSize: 100 }),
      plans: this.eventPlanService.getMyEventPlans(),
    }).subscribe({
      next: ({ bookings, plans }) => {
        // Most recent first — createdAt is an ISO string, safe to sort lexically.
        const sorted = [...bookings.items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        this.bookings.set(sorted);
        this.eventPlansById.set(new Map(plans.map((p) => [p.id, p])));
        this.loadBookingDetails(sorted);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  /** Same batched-lookup-by-unique-id pattern as event-plan-detail, for the same reason (no embedded names on BookingRequestDto). */
  private loadBookingDetails(bookings: BookingRequest[]): void {
    const vendorIds = [...new Set(bookings.map((b) => b.vendorId))];
    const packageIds = [
      ...new Set(bookings.map((b) => b.vendorPackageId).filter((id): id is number => id != null)),
    ];

    const vendorCalls = vendorIds.length
      ? forkJoin(
          vendorIds.map((id) => this.vendorService.getById(id).pipe(catchError(() => of(null)))),
        )
      : of([]);
    const packageCalls = packageIds.length
      ? forkJoin(
          packageIds.map((id) => this.packageService.getById(id).pipe(catchError(() => of(null)))),
        )
      : of([]);

    forkJoin([vendorCalls, packageCalls]).subscribe(([vendors, packages]) => {
      this.vendorsById.set(new Map(vendors.filter((v) => v).map((v) => [v!.id, v!])));
      this.packagesById.set(new Map(packages.filter((p) => p).map((p) => [p!.id, p!])));
      this.loading.set(false);
    });
  }

  protected vendorName(booking: BookingRequest): string {
    return this.vendorsById().get(booking.vendorId)?.businessName ?? `Vendor #${booking.vendorId}`;
  }

  protected packageTitle(booking: BookingRequest): string | null {
    return booking.vendorPackageId
      ? (this.packagesById().get(booking.vendorPackageId)?.title ?? null)
      : null;
  }

  protected planTitle(booking: BookingRequest): string {
    return this.eventPlansById().get(booking.eventPlanId)?.title ?? `Plan #${booking.eventPlanId}`;
  }

  /** agreedPrice has no currency field of its own — sourced from the fetched package, EGP fallback otherwise. */
  protected priceCurrency(booking: BookingRequest): string {
    const pkg = booking.vendorPackageId ? this.packagesById().get(booking.vendorPackageId) : null;
    return pkg?.currency ?? 'EGP';
  }

  /** The outstanding remainder on a deposit booking (total − deposit), server-recorded on the DTO. */
  protected remainderAmount(booking: BookingRequest): number {
    return (booking.totalAmount ?? 0) - (booking.depositAmount ?? 0);
  }

  protected openPlan(booking: BookingRequest): void {
    this.router.navigate(['/client/event-plans', booking.eventPlanId]);
  }

  protected goToVendors(): void {
    this.router.navigateByUrl('/client/vendors');
  }
}
