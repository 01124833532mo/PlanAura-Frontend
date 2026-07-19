import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { DatetimePicker } from '../../../../shared/ui/datetime-picker/datetime-picker';
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
  imports: [ReactiveFormsModule, Button, AlertBanner, DatetimePicker],
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

  /** Human-readable preview of the chosen range, shown live under the fields. */
  protected preview(): string | null {
    const { startAt, endAt } = this.form.getRawValue();
    if (!startAt || !endAt) {
      return null;
    }

    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return null;
    }

    const sameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();

    const dateFmt: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const timeFmt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
    const time = (d: Date) => d.toLocaleTimeString('en-US', timeFmt);
    const date = (d: Date) => d.toLocaleDateString('en-US', dateFmt);

    const range = sameDay
      ? `${date(start)} · ${time(start)} – ${time(end)}`
      : `${date(start)}, ${time(start)} → ${date(end)}, ${time(end)}`;

    return `${range} (${this.formatDuration(end.getTime() - start.getTime())})`;
  }

  private formatDuration(ms: number): string {
    const totalMinutes = Math.round(ms / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (days > 0) {
      parts.push(`${days}d`);
    }
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    if (minutes > 0) {
      parts.push(`${minutes}m`);
    }
    return parts.length > 0 ? parts.join(' ') : '0m';
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
