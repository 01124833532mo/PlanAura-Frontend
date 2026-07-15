import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { SelectField, SelectOption } from '../../../../shared/ui/select-field/select-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { AppError } from '../../../../core/interfaces/api-response.model';
import { VendorPackage } from '../../../../core/interfaces/vendor-package.model';
import { VendorProfile } from '../../../../core/interfaces/vendor-profile.model';
import {
  AvailabilityStatus,
  VendorAvailability,
} from '../../../../core/interfaces/vendor-availability.model';
import { CreateBookingRequest } from '../../../../core/interfaces/booking-request.model';
import { BookingRequestService } from '../../../../core/services/booking-request.service';
import { EventPlanService } from '../../../../core/services/event-plan.service';
import { VendorAvailabilityService } from '../../../../core/services/vendor-availability.service';
import { VendorPackageService } from '../../../../core/services/vendor-package.service';
import { VendorService } from '../../../../core/services/vendor.service';

@Component({
  selector: 'app-booking-create',
  standalone: true,
  imports: [ReactiveFormsModule, TextField, SelectField, Button, AlertBanner, DecimalPipe, DatePipe],
  templateUrl: './booking-create.html',
  styleUrl: './booking-create.css',
})
export class BookingCreate implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vendorService = inject(VendorService);
  private readonly packageService = inject(VendorPackageService);
  private readonly availabilityService = inject(VendorAvailabilityService);
  private readonly eventPlanService = inject(EventPlanService);
  private readonly bookingService = inject(BookingRequestService);

  protected readonly vendor = signal<VendorProfile | null>(null);
  protected readonly pkg = signal<VendorPackage | null>(null);
  protected readonly slots = signal<VendorAvailability[]>([]);
  protected readonly eventPlanOptions = signal<SelectOption[]>([]);
  protected readonly needsEventPlanPicker = signal(false);

  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly slotError = signal<string | null>(null);
  protected readonly selectedSlotId = signal<number | null>(null);
  protected readonly setupError = signal<string | null>(null);

  private vendorId = 0;
  private packageId = 0;
  private eventPlanIdFromQuery: number | null = null;

  protected readonly availableSlots = computed(() =>
    this.slots().filter((slot) => slot.status === AvailabilityStatus.Available),
  );

  protected readonly form = this.fb.group({
    eventPlanId: this.fb.control<number | null>(null),
    guestCount: this.fb.nonNullable.control(''),
    clientMessage: this.fb.nonNullable.control(''),
  });

  ngOnInit(): void {
    const vendorIdParam = this.route.snapshot.queryParamMap.get('vendorId');
    const packageIdParam = this.route.snapshot.queryParamMap.get('packageId');
    const eventPlanIdParam = this.route.snapshot.queryParamMap.get('eventPlanId');

    if (!vendorIdParam || !packageIdParam) {
      this.setupError.set('Missing booking details — please start from a vendor package page.');
      this.loading.set(false);
      return;
    }

    this.vendorId = Number(vendorIdParam);
    this.packageId = Number(packageIdParam);
    this.eventPlanIdFromQuery = eventPlanIdParam ? Number(eventPlanIdParam) : null;

    if (this.eventPlanIdFromQuery) {
      this.form.patchValue({ eventPlanId: this.eventPlanIdFromQuery });
    } else {
      this.needsEventPlanPicker.set(true);
      this.form.controls.eventPlanId.addValidators(Validators.required);
    }

    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);

    this.vendorService.getById(this.vendorId).subscribe({ next: (v) => this.vendor.set(v) });

    // Always re-fetch the package fresh here rather than trusting anything
    // carried via query params — price/description come from the backend
    // only, matching the same rule the backend itself enforces for AgreedPrice.
    this.packageService.getById(this.packageId).subscribe({
      next: (p) => {
        this.pkg.set(p);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });

    this.refreshSlots();

    if (this.needsEventPlanPicker()) {
      this.eventPlanService.getMyEventPlans().subscribe({
        next: (plans) => {
          if (plans.length === 0) {
            // Preserve vendorId/packageId so event-plan-form can send the
            // client straight back here (with the new plan's id) instead of
            // dropping them at the event-plan list to start over.
            this.router.navigate(['/client/event-plans/new'], {
              queryParams: {
                from: 'booking',
                vendorId: this.vendorId,
                packageId: this.packageId,
              },
            });
            return;
          }
          this.eventPlanOptions.set(
            plans.map((p) => ({ value: p.id, label: `${p.title} — ${p.city}` })),
          );
        },
      });
    }
  }

  private refreshSlots(): void {
    this.availabilityService.getByVendor(this.vendorId).subscribe({
      next: (slots) => this.slots.set(slots),
    });
  }

  protected selectSlot(slotId: number): void {
    this.selectedSlotId.set(slotId);
    this.slotError.set(null);
  }

  protected guestCountErrorMessage(): string | null {
    const control = this.form.controls.guestCount;
    if (control.touched && control.hasError('exceedsMax')) {
      return `Guest count exceeds this package's maximum of ${this.pkg()?.maxGuests} guests.`;
    }
    return null;
  }

  protected goToVendors(): void {
    this.router.navigateByUrl('/client/vendors');
  }

  protected submit(): void {
    const slotId = this.selectedSlotId();
    if (!slotId) {
      this.slotError.set('Please choose an available date first.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const guestCount = raw.guestCount.trim() === '' ? undefined : Number(raw.guestCount);
    const maxGuests = this.pkg()?.maxGuests;

    if (maxGuests != null && guestCount !== undefined && guestCount > maxGuests) {
      this.form.controls.guestCount.setErrors({ exceedsMax: true });
      this.form.controls.guestCount.markAsTouched();
      return;
    }

    const eventPlanId = this.eventPlanIdFromQuery ?? raw.eventPlanId;
    if (!eventPlanId) {
      return;
    }

    const dto: CreateBookingRequest = {
      eventPlanId,
      availabilityId: slotId,
      vendorPackageId: this.packageId,
      guestCount,
      clientMessage: raw.clientMessage.trim() || undefined,
    };

    this.submitting.set(true);
    this.error.set(null);
    this.slotError.set(null);

    this.bookingService.createBooking(dto).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/client/event-plans?bookingSuccess=1');
      },
      error: (err: AppError) => {
        this.submitting.set(false);
        if (err.status === 409) {
          this.slotError.set("This slot was just booked by someone else — please pick another.");
          this.selectedSlotId.set(null);
          this.refreshSlots();
          return;
        }
        this.error.set(err);
      },
    });
  }
}
