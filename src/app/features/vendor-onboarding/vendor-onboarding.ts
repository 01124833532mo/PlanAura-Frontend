import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { StepperHeader } from '../../shared/ui/stepper-header/stepper-header';
import { Button } from '../../shared/ui/button/button';
import { AlertBanner } from '../../shared/ui/alert-banner/alert-banner';
import { StepAccount } from './steps/step-account/step-account';
import { StepBusiness } from './steps/step-business/step-business';
import { StepDocuments } from './steps/step-documents/step-documents';
import { StepPortfolio } from './steps/step-portfolio/step-portfolio';
import { StepReview } from './steps/step-review/step-review';

import { AuthService } from '../../core/services/auth.service';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { VendorOnboardingStateService } from '../../core/services/vendor-onboarding-state.service';
import { AppError } from '../../core/interfaces/api-response.model';
import { ServiceCategory, VendorRegistrationPayload, VendorType } from '../../core/interfaces/vendor.model';
import { WIZARD_STEP_LABELS } from './vendor-onboarding.types';
import { passwordsMatchValidator } from '../../shared/validators/password-match.validator';
import { atLeastOneFileValidator } from '../../shared/validators/file-list.validator';

@Component({
  selector: 'app-vendor-onboarding',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    StepperHeader,
    Button,
    AlertBanner,
    StepAccount,
    StepBusiness,
    StepDocuments,
    StepPortfolio,
    StepReview,
  ],
  templateUrl: './vendor-onboarding.html',
  styleUrl: './vendor-onboarding.css',
})
export class VendorOnboarding implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly categoryService = inject(ServiceCategoryService);
  private readonly onboardingState = inject(VendorOnboardingStateService);
  private readonly router = inject(Router);

  protected readonly stepLabels = WIZARD_STEP_LABELS;
  protected readonly currentStep = signal(0);
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly categories = signal<ServiceCategory[]>([]);

  protected readonly accountGroup = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  protected readonly businessGroup = this.fb.nonNullable.group({
    businessName: ['', Validators.required],
    businessDescription: [''],
    categoryId: this.fb.control<number | null>(null),
    city: [''],
    address: [''],
    vendorType: this.fb.nonNullable.control<VendorType>(VendorType.Individual, Validators.required),
  });

  protected readonly documentsGroup = this.fb.group({
    nationalIdFront: this.fb.control<File | null>(null, Validators.required),
    nationalIdBack: this.fb.control<File | null>(null, Validators.required),
    selfieWithId: this.fb.control<File | null>(null, Validators.required),
    commercialRegistration: this.fb.control<File | null>(null),
    taxCard: this.fb.control<File | null>(null),
  });

  protected readonly portfolioGroup = this.fb.nonNullable.group({
    images: this.fb.nonNullable.control<File[]>([], atLeastOneFileValidator),
  });

  protected readonly categoryName = computed(() => {
    const id = this.businessGroup.controls.categoryId.value;
    return this.categories().find((c) => c.id === id)?.nameEn ?? null;
  });

  ngOnInit(): void {
    const prefill = this.onboardingState.prefill();
    if (prefill) {
      this.accountGroup.patchValue(prefill);
    }

    this.categoryService.getActiveCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]), // category list is a nice-to-have, not fatal
    });

    // Commercial registration / tax card are only required for Business vendors
    // (mirrors AuthService.ValidateVendorRegistrationAsync exactly).
    this.businessGroup.controls.vendorType.valueChanges.subscribe((type) => {
      const commercialRegistration = this.documentsGroup.controls.commercialRegistration;
      const taxCard = this.documentsGroup.controls.taxCard;

      if (type === VendorType.Business) {
        commercialRegistration.addValidators(Validators.required);
        taxCard.addValidators(Validators.required);
      } else {
        commercialRegistration.clearValidators();
        taxCard.clearValidators();
      }
      commercialRegistration.updateValueAndValidity();
      taxCard.updateValueAndValidity();
    });
  }

  protected next(): void {
    if (!this.currentGroupValid()) {
      this.currentGroup().markAllAsTouched();
      return;
    }
    this.currentStep.update((step) => Math.min(step + 1, this.stepLabels.length - 1));
  }

  protected back(): void {
    this.error.set(null);
    this.currentStep.update((step) => Math.max(step - 1, 0));
  }

  protected submit(): void {
    if (
      this.accountGroup.invalid ||
      this.businessGroup.invalid ||
      this.documentsGroup.invalid ||
      this.portfolioGroup.invalid
    ) {
      this.error.set({
        status: 0,
        message: 'Please go back and complete every required field before submitting.',
        fieldErrors: [],
      });
      return;
    }

    this.error.set(null);
    this.submitting.set(true);

    const payload = this.buildPayload();

    this.authService.registerVendor(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
        this.onboardingState.clear();
      },
      error: (err: AppError) => {
        this.submitting.set(false);
        this.error.set(err);
      },
    });
  }

  protected goToSignIn(): void {
    this.router.navigateByUrl('/auth');
  }

  private currentGroup(): AbstractControl {
    switch (this.currentStep()) {
      case 0:
        return this.accountGroup;
      case 1:
        return this.businessGroup;
      case 2:
        return this.documentsGroup;
      case 3:
        return this.portfolioGroup;
      default:
        return this.accountGroup;
    }
  }

  private currentGroupValid(): boolean {
    return this.currentGroup().valid;
  }

  private buildPayload(): VendorRegistrationPayload {
    const account = this.accountGroup.getRawValue();
    const business = this.businessGroup.getRawValue();
    const documents = this.documentsGroup.getRawValue();
    const portfolio = this.portfolioGroup.getRawValue();

    return {
      fullName: account.fullName,
      email: account.email,
      phoneNumber: account.phoneNumber,
      password: account.password,
      confirmPassword: account.confirmPassword,

      businessName: business.businessName,
      businessDescription: business.businessDescription || undefined,
      categoryId: business.categoryId ?? undefined,
      city: business.city || undefined,
      address: business.address || undefined,
      vendorType: business.vendorType,

      nationalIdFront: documents.nationalIdFront!,
      nationalIdBack: documents.nationalIdBack!,
      selfieWithId: documents.selfieWithId!,
      commercialRegistration: documents.commercialRegistration ?? undefined,
      taxCard: documents.taxCard ?? undefined,

      portfolioImages: portfolio.images,
    };
  }
}
