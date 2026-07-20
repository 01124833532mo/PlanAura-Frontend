import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button } from '../../../shared/ui/button/button';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { PasswordField } from '../../../shared/ui/password-field/password-field';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { AuthService } from '../../../core/services/auth.service';
import { AppError } from '../../../core/interfaces/api-response.model';
import { passwordsMatchValidator } from '../../../shared/validators/password-match.validator';
import { notifySuccess } from '../../../shared/utils/notify';

type Step = 1 | 2 | 3;

/**
 * Three-step "forgot password" flow, driven by a single `step` signal:
 *   1. request a reset code by email  -> POST /auth/forget-password
 *   2. verify the 6-digit code        -> POST /auth/verify-code
 *   3. set a new password             -> POST /auth/reset-password
 *
 * The email entered in step 1 is held in a signal and reused for steps 2 & 3,
 * since every backend endpoint in this flow needs it. On success the user is
 * sent back to /auth to sign in with the new password (we do NOT auto-login,
 * so AuthService.resetPassword intentionally never stores the returned token).
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Button, TextField, PasswordField, AlertBanner],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly step = signal<Step>(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly email = signal('');

  protected readonly title = computed(() => {
    switch (this.step()) {
      case 1:
        return 'Forgot your password?';
      case 2:
        return 'Enter your reset code';
      default:
        return 'Set a new password';
    }
  });

  protected readonly subtitle = computed(() => {
    switch (this.step()) {
      case 1:
        return "Enter your email and we'll send you a 6-digit reset code.";
      case 2:
        return `We sent a 6-digit code to ${this.email()}. It expires in 15 minutes.`;
      default:
        return 'Choose a strong password for your account.';
    }
  });

  protected readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  // Control names are "password"/"confirmPassword" so passwordsMatchValidator
  // (which looks up those exact names) can be reused as-is.
  protected readonly passwordForm = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  protected submitEmail(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    const { email } = this.emailForm.getRawValue();
    this.error.set(null);
    this.loading.set(true);

    this.authService.forgetPassword({ email }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.email.set(email);
        notifySuccess(res.message);
        this.step.set(2);
      },
      error: (err: AppError) => {
        this.loading.set(false);
        this.error.set(err);
      },
    });
  }

  protected submitCode(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }

    const { code } = this.codeForm.getRawValue();
    this.error.set(null);
    this.loading.set(true);

    this.authService.verifyResetCode({ email: this.email(), resetCode: Number(code) }).subscribe({
      next: () => {
        this.loading.set(false);
        this.step.set(3);
      },
      error: (err: AppError) => {
        this.loading.set(false);
        this.error.set(err);
      },
    });
  }

  protected submitPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { password } = this.passwordForm.getRawValue();
    this.error.set(null);
    this.loading.set(true);

    this.authService.resetPassword({ email: this.email(), newPassword: password }).subscribe({
      next: () => {
        this.loading.set(false);
        notifySuccess('Your password has been reset. Please sign in.');
        this.router.navigateByUrl('/auth');
      },
      error: (err: AppError) => {
        this.loading.set(false);
        this.error.set(err);
      },
    });
  }

  /** Go back to step 1 to correct the email address. */
  protected changeEmail(): void {
    this.error.set(null);
    this.codeForm.reset();
    this.step.set(1);
  }

  protected passwordMismatch(): boolean {
    return (
      this.passwordForm.hasError('passwordMismatch') &&
      this.passwordForm.get('confirmPassword')!.touched
    );
  }
}
