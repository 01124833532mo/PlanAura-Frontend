import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Rejects a date-input control value (yyyy-mm-dd) earlier than today. */
export function notPastDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return new Date(value) < today ? { pastDate: true } : null;
}
