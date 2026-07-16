import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { VendorProfileStateService } from '../../../core/services/vendor-profile-state.service';
import { VendorVerificationService } from '../../../core/services/vendor-verification.service';
import { AppError } from '../../../core/interfaces/api-response.model';
import { ResubmitVerificationRequest } from '../../../core/interfaces/vendor-verification.model';
import { VendorType } from '../../../core/interfaces/vendor.model';
import { DocumentsFormGroup } from '../../vendor-onboarding/vendor-onboarding.types';
import { StepDocuments } from '../../vendor-onboarding/steps/step-documents/step-documents';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../shared/ui/button/button';

/**
 * Full-page state (no vendor sidebar) shown to a vendor whose verification
 * was Rejected. Shows the backend's rejection reason (from the vendor's own
 * verification history — the only place a vendor can read it) and reuses
 * the onboarding wizard's document-upload step for resubmission, since the
 * required documents are identical.
 */
@Component({
  selector: 'app-verification-rejected',
  standalone: true,
  imports: [ReactiveFormsModule, StepDocuments, AlertBanner, Button],
  templateUrl: './verification-rejected.html',
  styleUrl: './verification-rejected.css',
})
export class VerificationRejected implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly vendorVerificationService = inject(VendorVerificationService);
  private readonly router = inject(Router);

  protected readonly vendorProfileState = inject(VendorProfileStateService);

  protected readonly rejectionReason = signal<string | null>(null);
  protected readonly historyLoading = signal(false);
  protected readonly resubmitOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly vendorType = computed(
    () => this.vendorProfileState.profile()?.vendorType ?? VendorType.Individual,
  );
  protected readonly VendorType = VendorType;

  protected readonly documentsGroup: DocumentsFormGroup = this.fb.group({
    nationalIdFront: this.fb.control<File | null>(null, Validators.required),
    nationalIdBack: this.fb.control<File | null>(null, Validators.required),
    selfieWithId: this.fb.control<File | null>(null, Validators.required),
    commercialRegistration: this.fb.control<File | null>(null),
    taxCard: this.fb.control<File | null>(null),
  });

  ngOnInit(): void {
    this.vendorProfileState.load();
    this.loadRejectionReason();
  }

  private loadRejectionReason(): void {
    this.historyLoading.set(true);
    this.vendorVerificationService.getMyHistory().subscribe({
      next: (history) => {
        const latestRejection = history.find((entry) => entry.newStatus === 'rejected');
        this.rejectionReason.set(latestRejection?.notes ?? null);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  protected openResubmit(): void {
    this.resubmitOpen.set(true);
  }

  protected submitResubmission(): void {
    if (this.documentsGroup.invalid) {
      this.documentsGroup.markAllAsTouched();
      return;
    }

    const value = this.documentsGroup.getRawValue();
    const request: ResubmitVerificationRequest = {
      nationalIdFront: value.nationalIdFront!,
      nationalIdBack: value.nationalIdBack!,
      selfieWithId: value.selfieWithId!,
      commercialRegistration: value.commercialRegistration ?? undefined,
      taxCard: value.taxCard ?? undefined,
    };

    this.error.set(null);
    this.submitting.set(true);

    this.vendorVerificationService.resubmitVerification(request).subscribe({
      next: () => {
        this.submitting.set(false);
        this.vendorProfileState.refresh();
        this.router.navigateByUrl('/vendor/verification-pending');
      },
      error: (err: AppError) => {
        this.submitting.set(false);
        this.error.set(err);
      },
    });
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/auth');
  }
}
