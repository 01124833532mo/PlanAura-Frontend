import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from '../../../shared/ui/button/button';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { PasswordField } from '../../../shared/ui/password-field/password-field';
import { SegmentedToggle, SegmentedOption } from '../../../shared/ui/segmented-toggle/segmented-toggle';
import { SelectableCard } from '../../../shared/ui/selectable-card/selectable-card';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { AuthService } from '../../../core/services/auth.service';
import { VendorOnboardingStateService } from '../../../core/services/vendor-onboarding-state.service';
import { VendorService } from '../../../core/services/vendor.service';
import { AppError } from '../../../core/interfaces/api-response.model';
import { CurrentUser, RegisterClientRequest } from '../../../core/interfaces/auth.model';
import { resolveVendorLandingPath } from '../../../core/interfaces/vendor-verification.model';
import { passwordsMatchValidator } from '../../../shared/validators/password-match.validator';

type AuthMode = 'login' | 'register';
type RegisterRole = 'customer' | 'vendor';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Button,
    TextField,
    PasswordField,
    SegmentedToggle,
    SelectableCard,
    AlertBanner,
  ],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.css',
})
export class AuthPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly onboardingState = inject(VendorOnboardingStateService);
  private readonly vendorService = inject(VendorService);
  private readonly router = inject(Router);

  protected readonly modeOptions: SegmentedOption[] = [
    { value: 'login', label: 'Login' },
    { value: 'register', label: 'Register' },
  ];

  protected readonly mode = signal<AuthMode>('login');
  protected readonly role = signal<RegisterRole>('vendor');
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly infoMessage = signal<string | null>(null);
  protected readonly signedInUser = signal<CurrentUser | null>(null);

  protected readonly title = computed(() =>
    this.mode() === 'login' ? 'Welcome back' : 'Create an account',
  );
  protected readonly subtitle = computed(() =>
    this.mode() === 'login'
      ? 'Please enter your details to sign in.'
      : 'Join the elite network of event planners and vendors.',
  );
  protected readonly ctaLabel = computed(() => (this.mode() === 'login' ? 'Sign In' : 'Get Started'));

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly registerForm = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  protected setMode(mode: string): void {
    this.mode.set(mode as AuthMode);
    this.error.set(null);
    this.infoMessage.set(null);
    this.signedInUser.set(null);
  }

  protected selectRole(role: RegisterRole): void {
    this.role.set(role);
    this.infoMessage.set(null);
  }

  protected submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.loading.set(true);

    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.authService.fetchCurrentUser().subscribe({
          next: (user) => {
            this.loading.set(false);
            this.signedInUser.set(user);
            this.navigateAfterAuth();
          },
          error: () => {
            // Login itself already succeeded; a failed follow-up /me call
            // shouldn't be reported as a login failure.
            this.loading.set(false);
          },
        });
      },
      error: (err: AppError) => {
        this.loading.set(false);
        this.error.set(err);
      },
    });
  }

  protected submitRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { fullName, email, phoneNumber, password, confirmPassword } =
      this.registerForm.getRawValue();

    if (this.role() === 'customer') {
      this.submitClientRegistration({ fullName, email, phoneNumber, password, confirmPassword });
      return;
    }

    // The backend's RegisterVendorAsync is a single atomic call that also
    // needs business info + documents, so this page can only carry the
    // account fields forward into the onboarding wizard's first step.
    this.onboardingState.setAccountPrefill({
      fullName,
      email,
      phoneNumber,
      password,
      confirmPassword,
    });

    this.router.navigateByUrl('/vendor/register');
  }

  private submitClientRegistration(request: RegisterClientRequest): void {
    this.error.set(null);
    this.loading.set(true);

    this.authService.registerClient(request).subscribe({
      next: () => {
        this.authService.fetchCurrentUser().subscribe({
          next: (user) => {
            this.loading.set(false);
            this.signedInUser.set(user);
            this.navigateAfterAuth();
          },
          error: () => {
            // Registration itself already succeeded; a failed follow-up /me
            // call shouldn't be reported as a registration failure.
            this.loading.set(false);
          },
        });
      },
      error: (err: AppError) => {
        this.loading.set(false);
        this.error.set(err);
      },
    });
  }

  /**
   * Role-based landing page after a successful login or registration, in
   * priority order: admin -> vendor -> client (home). Reuses AuthService's
   * role signals rather than re-parsing roles here.
   *
   * For vendors, the destination also depends on their verification status
   * (Pending/Rejected/Approved), so their own profile is loaded here and
   * resolved via the same resolveVendorLandingPath() the (session-restore)
   * vendorGuard uses — one mapping, two callers, no duplicated logic.
   */
  private navigateAfterAuth(): void {
    if (this.authService.isAdmin()) {
      this.router.navigateByUrl('/admin/dashboard');
      return;
    }

    if (this.authService.isVendor()) {
      this.vendorService.getMyProfile().subscribe({
        next: (profile) => {
          this.router.navigateByUrl(resolveVendorLandingPath(profile.verificationStatus));
        },
        error: () => {
          // vendorGuard re-derives status on its own if this lookup fails.
          this.router.navigateByUrl('/vendor/dashboard');
        },
      });
      return;
    }

    this.router.navigateByUrl('/');
  }

  protected logout(): void {
    this.authService.logout();
    this.signedInUser.set(null);
  }

  protected passwordMismatch(): boolean {
    return this.registerForm.hasError('passwordMismatch') && this.registerForm.get('confirmPassword')!.touched;
  }
}
