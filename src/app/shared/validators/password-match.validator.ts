import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Cross-field validator mirroring RegisterVendorDto's
 * [Compare(nameof(Password))] on ConfirmPassword. Attach to a FormGroup
 * that has both a "password" and a "confirmPassword" control.
 */
export function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword
    ? { passwordMismatch: true }
    : null;
}
