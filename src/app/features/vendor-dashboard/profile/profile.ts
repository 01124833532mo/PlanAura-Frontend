import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../shared/ui/button/button';
import { FileDropzone } from '../../../shared/ui/file-dropzone/file-dropzone';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { AppError } from '../../../core/interfaces/api-response.model';
import { PortfolioMediaItem } from '../../../core/interfaces/portfolio.model';
import { UpdateVendorProfilePayload } from '../../../core/interfaces/vendor-profile.model';
import { ServiceCategory } from '../../../core/interfaces/vendor.model';
import { ServiceCategoryService } from '../../../core/services/service-category.service';
import { VendorProfileStateService } from '../../../core/services/vendor-profile-state.service';
import { VendorService } from '../../../core/services/vendor.service';

/**
 * Lets the authenticated vendor view and edit their own profile and manage
 * their portfolio images. Ownership is enforced server-side (VendorController
 * always resolves "me" from the JWT vendor_id claim) — this page never
 * passes a vendor id to any mutation endpoint.
 *
 * Latitude/longitude are part of VendorDto/UpdateVendorProfileDto but are
 * left out of this form: nothing in the app collects them today (not even
 * vendor onboarding) and there's no map/geocoding UI to reuse for entering
 * them, so adding one here would be a new UI pattern rather than a reuse.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, TextField, SelectField, FileDropzone, Button, AlertBanner],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vendorService = inject(VendorService);
  private readonly categoryService = inject(ServiceCategoryService);

  protected readonly vendorProfileState = inject(VendorProfileStateService);

  protected readonly categories = signal<ServiceCategory[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly saved = signal(false);

  protected readonly portfolio = signal<PortfolioMediaItem[]>([]);
  protected readonly portfolioLoading = signal(false);
  protected readonly portfolioError = signal<AppError | null>(null);
  protected readonly addingMedia = signal(false);
  protected readonly newMediaControl = this.fb.control<File | null>(null);
  protected readonly reorderingId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    businessName: ['', [Validators.required, Validators.maxLength(150)]],
    businessDescription: [''],
    categoryId: this.fb.control<number | null>(null),
    city: [''],
    address: [''],
    logoFile: this.fb.control<File | null>(null),
    coverImageFile: this.fb.control<File | null>(null),
  });

  protected get categoryOptions(): SelectOption[] {
    return this.categories().map((category) => ({ value: category.id, label: category.nameEn }));
  }

  constructor() {
    effect(() => {
      const vendorId = this.vendorProfileState.vendorId();
      if (vendorId !== null) {
        this.fetchPortfolio(vendorId);
      }
    });

    effect(() => {
      const profile = this.vendorProfileState.profile();
      if (profile) {
        this.form.patchValue({
          businessName: profile.businessName,
          businessDescription: profile.businessDescription ?? '',
          categoryId: profile.categoryId,
          city: profile.city ?? '',
          address: profile.address ?? '',
        });
      }
    });
  }

  ngOnInit(): void {
    this.vendorProfileState.load();
    this.categoryService.getActiveCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
  }

  private fetchPortfolio(vendorId: number): void {
    this.portfolioLoading.set(true);
    this.portfolioError.set(null);

    this.vendorService.getPortfolioMedia(vendorId).subscribe({
      next: (media) => {
        this.portfolio.set(media);
        this.portfolioLoading.set(false);
      },
      error: (err: AppError) => {
        this.portfolioError.set(err);
        this.portfolioLoading.set(false);
      },
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: UpdateVendorProfilePayload = {
      businessName: value.businessName,
      businessDescription: value.businessDescription || undefined,
      categoryId: value.categoryId ?? undefined,
      city: value.city || undefined,
      address: value.address || undefined,
      logoFile: value.logoFile ?? undefined,
      coverImageFile: value.coverImageFile ?? undefined,
    };

    this.saving.set(true);
    this.error.set(null);
    this.saved.set(false);

    this.vendorService.updateMyProfile(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        this.vendorProfileState.refresh();
      },
      error: (err: AppError) => {
        this.saving.set(false);
        this.error.set(err);
      },
    });
  }

  protected addMedia(): void {
    const vendorId = this.vendorProfileState.vendorId();
    const file = this.newMediaControl.value;
    if (vendorId === null || !file) {
      return;
    }

    this.addingMedia.set(true);
    this.portfolioError.set(null);

    this.vendorService.addPortfolioMedia(file).subscribe({
      next: (media) => {
        this.portfolio.update((list) => [...list, media]);
        this.newMediaControl.setValue(null);
        this.addingMedia.set(false);
      },
      error: (err: AppError) => {
        this.portfolioError.set(err);
        this.addingMedia.set(false);
      },
    });
  }

  protected removeMedia(mediaId: number): void {
    if (!confirm('Remove this portfolio image?')) {
      return;
    }

    this.portfolioError.set(null);

    this.vendorService.removePortfolioMedia(mediaId).subscribe({
      next: () => {
        this.portfolio.update((list) => list.filter((item) => item.id !== mediaId));
      },
      error: (err: AppError) => this.portfolioError.set(err),
    });
  }

  protected moveMedia(index: number, direction: -1 | 1): void {
    const list = [...this.portfolio()];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) {
      return;
    }

    [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
    this.portfolio.set(list);

    this.reorderingId.set(list[targetIndex].id);
    this.vendorService.reorderPortfolioMedia(list.map((item) => item.id)).subscribe({
      next: () => this.reorderingId.set(null),
      error: (err: AppError) => {
        this.portfolioError.set(err);
        this.reorderingId.set(null);
      },
    });
  }
}
