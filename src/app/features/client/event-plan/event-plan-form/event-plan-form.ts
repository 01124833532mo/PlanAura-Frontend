import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { SelectField, SelectOption } from '../../../../shared/ui/select-field/select-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { notPastDateValidator } from '../../../../shared/validators/future-date.validator';
import { AppError } from '../../../../core/interfaces/api-response.model';
import { EventPlanService } from '../../../../core/services/event-plan.service';
import { notifyError, notifySuccess } from '../../../../shared/utils/notify';

@Component({
  selector: 'app-event-plan-form',
  standalone: true,
  imports: [ReactiveFormsModule, TextField, SelectField, Button, AlertBanner],
  templateUrl: './event-plan-form.html',
  styleUrl: './event-plan-form.css',
})
export class EventPlanForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly eventPlanService = inject(EventPlanService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly saving = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  // Set when booking-create redirected here because the client had no event
  // plans yet — carries vendorId/packageId so we can send them straight back
  // to finish booking instead of dropping them at the event-plan list.
  protected readonly fromBooking = this.route.snapshot.queryParamMap.get('from') === 'booking';
  private readonly bookingVendorId = this.route.snapshot.queryParamMap.get('vendorId');
  private readonly bookingPackageId = this.route.snapshot.queryParamMap.get('packageId');

  // Present only on the /edit route — same component/form for both modes.
  private readonly editingId = this.route.snapshot.paramMap.get('id')
    ? Number(this.route.snapshot.paramMap.get('id'))
    : null;
  protected readonly isEditMode = this.editingId !== null;

  protected readonly eventTypeOptions: SelectOption[] = [
    { value: 'Wedding', label: 'Wedding' },
    { value: 'Engagement', label: 'Engagement' },
    { value: 'Birthday', label: 'Birthday' },
    { value: 'Corporate', label: 'Corporate' },
  ];

  protected readonly todayIso = new Date().toISOString().slice(0, 10);

  // guestCount/budgetTotal are kept as strings here because ui-text-field's
  // ControlValueAccessor always writes/reads strings from its native
  // <input> — converted to numbers in submit() before emitting the payload.
  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    eventType: ['', Validators.required],
    eventDate: ['', [Validators.required, notPastDateValidator]],
    city: ['', Validators.required],
    guestCount: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.min(1)]],
    budgetTotal: [
      '',
      [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), Validators.min(0)],
    ],
    styleNotes: [''],
  });

  ngOnInit(): void {
    if (this.editingId === null) {
      return;
    }

    this.loading.set(true);
    this.eventPlanService.getEventPlan(this.editingId).subscribe({
      next: (plan) => {
        this.form.patchValue({
          title: plan.title,
          eventType: plan.eventType,
          // Backend may return a full ISO datetime; <input type="date"> needs exactly yyyy-MM-dd.
          eventDate: plan.eventDate.slice(0, 10),
          city: plan.city,
          guestCount: String(plan.guestCount),
          budgetTotal: String(plan.budgetTotal),
          styleNotes: plan.styleNotes ?? '',
        });
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.loading.set(false);
        if (err.status === 404) {
          notifyError("Event plan not found", "It may have been deleted, or doesn't belong to you.");
          this.router.navigateByUrl('/client/event-plans');
          return;
        }
        this.error.set(err);
      },
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const dto = {
      title: raw.title,
      eventType: raw.eventType,
      eventDate: raw.eventDate,
      city: raw.city,
      guestCount: Number(raw.guestCount),
      budgetTotal: Number(raw.budgetTotal),
      styleNotes: raw.styleNotes.trim() || undefined,
    };

    this.saving.set(true);
    this.error.set(null);

    if (this.editingId !== null) {
      const editingId = this.editingId;
      this.eventPlanService.updateEventPlan(editingId, dto).subscribe({
        next: () => {
          this.saving.set(false);
          notifySuccess('Event plan updated.');
          this.router.navigate(['/client/event-plans', editingId]);
        },
        error: (err: AppError) => {
          this.saving.set(false);
          if (err.status === 404) {
            notifyError("Event plan not found", "It may have been deleted, or doesn't belong to you.");
            this.router.navigateByUrl('/client/event-plans');
            return;
          }
          this.error.set(err);
          notifyError('Could not update event plan', err.message);
        },
      });
      return;
    }

    this.eventPlanService.createEventPlan(dto).subscribe({
      next: (createdPlan) => {
        this.saving.set(false);
        notifySuccess('Event plan created.');

        if (this.fromBooking && this.bookingVendorId && this.bookingPackageId) {
          this.router.navigate(['/booking/new'], {
            queryParams: {
              vendorId: this.bookingVendorId,
              packageId: this.bookingPackageId,
              eventPlanId: createdPlan.id,
            },
          });
          return;
        }

        this.router.navigateByUrl('/client/event-plans');
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.saving.set(false);
        notifyError('Could not create event plan', err.message);
      },
    });
  }

  protected cancel(): void {
    if (this.editingId !== null) {
      this.router.navigate(['/client/event-plans', this.editingId]);
      return;
    }
    this.router.navigateByUrl('/client/event-plans');
  }
}
