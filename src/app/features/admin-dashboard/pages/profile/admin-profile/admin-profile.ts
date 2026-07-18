import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../../core/services/auth.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import { adminNotifyError, adminNotifySuccess } from '../../../shared/admin-notify';

/** Admin's own profile — update name/phone, and change password. */
@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-profile.html',
  styleUrl: './admin-profile.css',
})
export class AdminProfile implements OnInit {
  protected readonly authService = inject(AuthService);

  protected fullName = '';
  protected phoneNumber = '';

  protected readonly savingProfile = signal(false);
  protected readonly profileError = signal<AppError | null>(null);

  protected currentPassword = '';
  protected newPassword = '';
  protected confirmNewPassword = '';

  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal<AppError | null>(null);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.fullName = user.fullName;
      this.phoneNumber = user.phoneNumber ?? '';
    } else {
      this.authService.fetchCurrentUser().subscribe({
        next: (u) => {
          this.fullName = u.fullName;
          this.phoneNumber = u.phoneNumber ?? '';
        },
      });
    }
  }

  protected get canSubmitProfile(): boolean {
    return this.fullName.trim().length > 1 && !this.savingProfile();
  }

  protected submitProfile(): void {
    if (!this.canSubmitProfile) return;

    this.savingProfile.set(true);
    this.profileError.set(null);

    this.authService
      .updateProfile({ fullName: this.fullName.trim(), phoneNumber: this.phoneNumber.trim() || undefined })
      .subscribe({
        next: () => {
          this.savingProfile.set(false);
          adminNotifySuccess('Profile updated.');
        },
        error: (err: AppError) => {
          this.profileError.set(err);
          this.savingProfile.set(false);
        },
      });
  }

  protected get canSubmitPassword(): boolean {
    return (
      this.currentPassword.length > 0 &&
      this.newPassword.length >= 8 &&
      this.newPassword === this.confirmNewPassword &&
      !this.savingPassword()
    );
  }

  protected submitPassword(): void {
    if (!this.canSubmitPassword) return;

    this.savingPassword.set(true);
    this.passwordError.set(null);

    this.authService
      .changePassword({
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
        confirmNewPassword: this.confirmNewPassword,
      })
      .subscribe({
        next: () => {
          this.savingPassword.set(false);
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmNewPassword = '';
          adminNotifySuccess('Password changed.');
        },
        error: (err: AppError) => {
          this.passwordError.set(err);
          this.savingPassword.set(false);
          adminNotifyError('Could not change password', err.message);
        },
      });
  }
}
