import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Mirrors AuthService.ValidateVendorRegistrationAsync's
 * "At least one portfolio image is required." rule.
 */
export function atLeastOneFileValidator(control: AbstractControl): ValidationErrors | null {
  const files = control.value as File[] | null;
  return files && files.length > 0 ? null : { required: true };
}
