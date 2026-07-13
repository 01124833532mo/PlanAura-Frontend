import { Component, Input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { PasswordField } from '../../../../shared/ui/password-field/password-field';
import { AccountFormGroup } from '../../vendor-onboarding.types';

@Component({
  selector: 'app-step-account',
  standalone: true,
  imports: [ReactiveFormsModule, TextField, PasswordField],
  templateUrl: './step-account.html',
})
export class StepAccount {
  @Input({ required: true }) group!: AccountFormGroup;

  protected touchedInvalid(name: keyof AccountFormGroup['controls']): boolean {
    const control = this.group.controls[name];
    return control.touched && control.invalid;
  }

  protected passwordMismatch(): boolean {
    return this.group.hasError('passwordMismatch') && this.group.controls.confirmPassword.touched;
  }
}
