import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { SelectField, SelectOption } from '../../../../shared/ui/select-field/select-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  UpdateVendorPackagePayload,
  VendorPackage,
} from '../../../../core/interfaces/vendor-package.model';

@Component({
  selector: 'app-package-form',
  standalone: true,
  imports: [ReactiveFormsModule, TextField, SelectField, Button, AlertBanner],
  templateUrl: './package-form.html',
  styleUrl: './package-form.css',
})
export class PackageForm implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() package: VendorPackage | null = null;
  @Input() saving = false;
  @Input() error: AppError | null = null;

  @Output() save = new EventEmitter<UpdateVendorPackagePayload>();
  @Output() cancelled = new EventEmitter<void>();

  protected readonly currencyOptions: SelectOption[] = [
    { value: 'EGP', label: 'EGP' },
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
  ];

  // basePrice/maxGuests are kept as strings here because ui-text-field's
  // ControlValueAccessor always writes/reads strings from its native
  // <input> — converted to numbers in submit() before emitting the payload.
  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    basePrice: ['0', [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    currency: ['EGP', Validators.required],
    maxGuests: ['', Validators.pattern(/^\d*$/)],
    includes: [''],
    isActive: [true],
  });

  ngOnChanges(): void {
    const pkg = this.package;
    this.form.reset({
      title: pkg?.title ?? '',
      description: pkg?.description ?? '',
      basePrice: pkg ? String(pkg.basePrice) : '0',
      currency: pkg?.currency ?? 'EGP',
      maxGuests: pkg?.maxGuests != null ? String(pkg.maxGuests) : '',
      includes: pkg?.includes ?? '',
      isActive: pkg?.isActive ?? true,
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.save.emit({
      title: raw.title,
      description: raw.description.trim() || undefined,
      basePrice: Number(raw.basePrice),
      currency: raw.currency,
      maxGuests: raw.maxGuests.trim() === '' ? undefined : Number(raw.maxGuests),
      includes: raw.includes.trim() || undefined,
      isActive: raw.isActive,
    });
  }
}
