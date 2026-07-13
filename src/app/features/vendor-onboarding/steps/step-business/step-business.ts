import { Component, Input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { SelectField, SelectOption } from '../../../../shared/ui/select-field/select-field';
import { SelectableCard } from '../../../../shared/ui/selectable-card/selectable-card';
import { BusinessFormGroup } from '../../vendor-onboarding.types';
import { ServiceCategory, VendorType } from '../../../../core/interfaces/vendor.model';

@Component({
  selector: 'app-step-business',
  standalone: true,
  imports: [ReactiveFormsModule, TextField, SelectField, SelectableCard],
  templateUrl: './step-business.html',
})
export class StepBusiness {
  @Input({ required: true }) group!: BusinessFormGroup;
  @Input() categories: ServiceCategory[] = [];

  protected readonly VendorType = VendorType;

  protected get categoryOptions(): SelectOption[] {
    return this.categories.map((category) => ({ value: category.id, label: category.nameEn }));
  }

  protected touchedInvalid(name: keyof BusinessFormGroup['controls']): boolean {
    const control = this.group.controls[name];
    return control.touched && control.invalid;
  }

  protected selectVendorType(type: VendorType): void {
    this.group.controls.vendorType.setValue(type);
    this.group.controls.vendorType.markAsTouched();
  }
}
