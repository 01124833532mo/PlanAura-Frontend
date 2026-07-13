import { FormControl, FormGroup } from '@angular/forms';
import { VendorType } from '../../core/interfaces/vendor.model';

export interface AccountFormControls {
  fullName: FormControl<string>;
  email: FormControl<string>;
  phoneNumber: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
}
export type AccountFormGroup = FormGroup<AccountFormControls>;

export interface BusinessFormControls {
  businessName: FormControl<string>;
  businessDescription: FormControl<string>;
  categoryId: FormControl<number | null>;
  city: FormControl<string>;
  address: FormControl<string>;
  vendorType: FormControl<VendorType>;
}
export type BusinessFormGroup = FormGroup<BusinessFormControls>;

export interface DocumentsFormControls {
  nationalIdFront: FormControl<File | null>;
  nationalIdBack: FormControl<File | null>;
  selfieWithId: FormControl<File | null>;
  commercialRegistration: FormControl<File | null>;
  taxCard: FormControl<File | null>;
}
export type DocumentsFormGroup = FormGroup<DocumentsFormControls>;

export interface PortfolioFormControls {
  images: FormControl<File[]>;
}
export type PortfolioFormGroup = FormGroup<PortfolioFormControls>;

export const WIZARD_STEP_LABELS = ['Account', 'Business', 'Documents', 'Portfolio', 'Review'];
