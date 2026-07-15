import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  BookingPaymentStatus,
  BookingRequest,
  BookingStatus,
  DisputeStatus,
} from '../../../../core/interfaces/booking-request.model';
import { EventPlan } from '../../../../core/interfaces/event-plan.model';
import { VendorPackage } from '../../../../core/interfaces/vendor-package.model';
import { VendorProfile } from '../../../../core/interfaces/vendor-profile.model';
import { BookingRequestService } from '../../../../core/services/booking-request.service';
import { EventPlanService } from '../../../../core/services/event-plan.service';
import { VendorPackageService } from '../../../../core/services/vendor-package.service';
import { VendorService } from '../../../../core/services/vendor.service';

@Component({
  selector: 'app-event-plan-detail',
  standalone: true,
  imports: [
    AlertBanner,
    Button,
    TextField,
    ReactiveFormsModule,
    StatusBadge,
    DatePipe,
    DecimalPipe,
    RouterLink,
  ],
  templateUrl: './event-plan-detail.html',
  styleUrl: './event-plan-detail.css',
})
export class EventPlanDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly eventPlanService = inject(EventPlanService);
  private readonly bookingService = inject(BookingRequestService);
  private readonly vendorService = inject(VendorService);
  private readonly packageService = inject(VendorPackageService);

  // Exposed so the template can reference enum members directly.
  protected readonly BookingStatus = BookingStatus;
  protected readonly BookingPaymentStatus = BookingPaymentStatus;
  protected readonly DisputeStatus = DisputeStatus;

  protected readonly plan = signal<EventPlan | null>(null);
  protected readonly bookings = signal<BookingRequest[]>([]);
  protected readonly vendorsById = signal<Map<number, VendorProfile>>(new Map());
  protected readonly packagesById = signal<Map<number, VendorPackage>>(new Map());

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly actioningId = signal<number | null>(null);

  protected readonly disputeTargetId = signal<number | null>(null);
  protected readonly disputeForm = this.fb.nonNullable.group({
    reason: ['', Validators.required],
  });
  protected readonly disputeSubmitting = signal(false);
  protected readonly disputeError = signal<AppError | null>(null);

  private planId = 0;

  ngOnInit(): void {
    this.planId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadAll();
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    this.eventPlanService.getEventPlan(this.planId).subscribe({
      next: (plan) => this.plan.set(plan),
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });

    // No eventPlanId filter exists server-side (confirmed in Phase 0) — fetch
    // the client's bookings (up to the backend's max pageSize) and filter here.
    this.bookingService.listMyBookings({ pageSize: 100 }).subscribe({
      next: (result) => {
        const forThisPlan = result.items.filter((b) => b.eventPlanId === this.planId);
        this.bookings.set(forThisPlan);
        this.loadBookingDetails(forThisPlan);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Batches vendor/package lookups by unique id (not one call per booking)
   * since BookingRequestDto only carries vendorId/vendorPackageId, no
   * embedded display names. Each lookup falls back to null on failure so one
   * missing record doesn't block the whole page.
   */
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
      const vendorMap = new Map<number, VendorProfile>();
      for (const v of vendors) {
        if (v) {
          vendorMap.set(v.id, v);
        }
      }
      this.vendorsById.set(vendorMap);

      const packageMap = new Map<number, VendorPackage>();
      for (const p of packages) {
        if (p) {
          packageMap.set(p.id, p);
        }
      }
      this.packagesById.set(packageMap);

      this.loading.set(false);
    });
  }

  protected vendorName(booking: BookingRequest): string {
    return this.vendorsById().get(booking.vendorId)?.businessName ?? `Vendor #${booking.vendorId}`;
  }

  protected vendorLogo(booking: BookingRequest): string | null {
    return this.vendorsById().get(booking.vendorId)?.logoUrl ?? null;
  }

  protected packageTitle(booking: BookingRequest): string | null {
    return booking.vendorPackageId
      ? (this.packagesById().get(booking.vendorPackageId)?.title ?? null)
      : null;
  }

  /** agreedPrice has no currency field of its own — sourced from the fetched package, EGP fallback otherwise. */
  protected priceCurrency(booking: BookingRequest): string {
    const pkg = booking.vendorPackageId ? this.packagesById().get(booking.vendorPackageId) : null;
    return pkg?.currency ?? 'EGP';
  }

  protected cancelBooking(booking: BookingRequest): void {
    if (!confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    this.actioningId.set(booking.id);
    this.error.set(null);

    this.bookingService.cancelBooking(booking.id).subscribe({
      next: (updated) => {
        this.bookings.update((list) => list.map((b) => (b.id === updated.id ? updated : b)));
        this.actioningId.set(null);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.actioningId.set(null);
      },
    });
  }

  protected openDispute(booking: BookingRequest): void {
    this.disputeTargetId.set(booking.id);
    this.disputeForm.reset({ reason: '' });
    this.disputeError.set(null);
  }

  protected closeDispute(): void {
    this.disputeTargetId.set(null);
  }

  protected submitDispute(): void {
    if (this.disputeForm.invalid) {
      this.disputeForm.markAllAsTouched();
      return;
    }

    const id = this.disputeTargetId();
    if (!id) {
      return;
    }

    this.disputeSubmitting.set(true);
    this.disputeError.set(null);

    this.bookingService.disputeBooking(id, this.disputeForm.getRawValue().reason).subscribe({
      next: (updated) => {
        this.bookings.update((list) => list.map((b) => (b.id === updated.id ? updated : b)));
        this.disputeSubmitting.set(false);
        this.disputeTargetId.set(null);
      },
      error: (err: AppError) => {
        this.disputeError.set(err);
        this.disputeSubmitting.set(false);
      },
    });
  }

  protected goToVendors(): void {
    this.router.navigate(['/client/vendors'], { queryParams: { eventPlanId: this.planId } });
  }
}
