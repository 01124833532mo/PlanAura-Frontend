import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  UpdateVendorAvailabilityPayload,
  VendorAvailability,
} from '../../../../core/interfaces/vendor-availability.model';

/** "2026-07-13T14:30" <-> the ISO/offset string the API sends and expects. */
function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

@Component({
  selector: 'app-availability-form',
  standalone: true,
  imports: [ReactiveFormsModule, Button, AlertBanner],
  templateUrl: './availability-form.html',
  styleUrl: './availability-form.css',
})
export class AvailabilityForm implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() availability: VendorAvailability | null = null;
  /** yyyy-MM-dd of a day clicked in the calendar; pre-fills the create form. */
  @Input() initialDate: string | null = null;
  @Input() saving = false;
  @Input() error: AppError | null = null;

  @Output() save = new EventEmitter<UpdateVendorAvailabilityPayload>();
  @Output() cancelled = new EventEmitter<void>();

  protected readonly form = this.fb.nonNullable.group({
    startAt: ['', Validators.required],
    endAt: ['', Validators.required],
  });

  ngOnChanges(): void {
    const slot = this.availability;
    if (slot) {
      this.form.reset({
        startAt: toDateTimeLocalValue(slot.startAt),
        endAt: toDateTimeLocalValue(slot.endAt),
      });
      return;
    }

    // Creating: pre-fill a sensible default time on the clicked day, if any.
    this.form.reset({
      startAt: this.initialDate ? `${this.initialDate}T12:00` : '',
      endAt: this.initialDate ? `${this.initialDate}T13:00` : '',
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const startAt = new Date(raw.startAt);
    const endAt = new Date(raw.endAt);

    if (endAt <= startAt) {
      this.form.controls.endAt.setErrors({ beforeStart: true });
      return;
    }

    this.save.emit({ startAt: startAt.toISOString(), endAt: endAt.toISOString() });
  }
}
