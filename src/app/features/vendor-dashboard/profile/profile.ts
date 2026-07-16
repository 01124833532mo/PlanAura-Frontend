import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../shared/ui/button/button';
import { FileDropzone } from '../../../shared/ui/file-dropzone/file-dropzone';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { AppError } from '../../../core/interfaces/api-response.model';
import { PortfolioMediaItem } from '../../../core/interfaces/portfolio.model';
import { UpdateVendorProfilePayload } from '../../../core/interfaces/vendor-profile.model';
import { ServiceCategory, VendorType } from '../../../core/interfaces/vendor.model';
import { AvailabilityStatus, VendorAvailability } from '../../../core/interfaces/vendor-availability.model';
import { VendorPackage } from '../../../core/interfaces/vendor-package.model';
import { AuthService } from '../../../core/services/auth.service';
import { ServiceCategoryService } from '../../../core/services/service-category.service';
import { VendorAvailabilityService } from '../../../core/services/vendor-availability.service';
import { VendorPackageService } from '../../../core/services/vendor-package.service';
import { VendorProfileStateService } from '../../../core/services/vendor-profile-state.service';
import { VendorService } from '../../../core/services/vendor.service';
import { notifyError, notifySuccess } from '../../../shared/utils/notify';

/** Tab identifiers for the social-profile-style section navigation. */
export type ProfileTabId =
  | 'about'
  | 'services'
  | 'portfolio'
  | 'packages'
  | 'availability'
  | 'reviews'
  | 'contact'
  | 'business';

interface ProfileTab {
  id: ProfileTabId;
  label: string;
  icon: string;
}

/** A handful of realistic-looking sample reviews to preview the future Reviews tab. */
interface PlaceholderReview {
  author: string;
  rating: number;
  date: string;
  comment: string;
}

/**
 * Lets the authenticated vendor view and edit their own profile and manage
 * their portfolio images. Ownership is enforced server-side (VendorController
 * always resolves "me" from the JWT vendor_id claim) — this page never
 * passes a vendor id to any mutation endpoint.
 *
 * Redesigned as a social-profile-style page (cover photo, large avatar,
 * tabbed sections) on top of the same data/APIs as before. Packages and
 * Availability tabs read from the real, already-wired VendorPackageService /
 * VendorAvailabilityService (read-only preview here — full CRUD stays on
 * their existing dedicated pages). There is no reviews feature or endpoint
 * anywhere in the app yet, so the Reviews & Ratings tab shows the real
 * aggregate rating/review count plus clearly-illustrative placeholder review
 * cards, per explicit instruction to use placeholder data where the backend
 * doesn't have it yet.
 *
 * Latitude/longitude are part of VendorDto/UpdateVendorProfileDto but are
 * left out of this form: nothing in the app collects them today (not even
 * vendor onboarding) and there's no map/geocoding UI to reuse for entering
 * them, so adding one here would be a new UI pattern rather than a reuse.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    TextField,
    SelectField,
    FileDropzone,
    Button,
    AlertBanner,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vendorService = inject(VendorService);
  private readonly categoryService = inject(ServiceCategoryService);
  private readonly vendorPackageService = inject(VendorPackageService);
  private readonly vendorAvailabilityService = inject(VendorAvailabilityService);

  protected readonly vendorProfileState = inject(VendorProfileStateService);
  protected readonly authService = inject(AuthService);

  protected readonly categories = signal<ServiceCategory[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly saved = signal(false);
  protected readonly editModalOpen = signal(false);

  protected readonly portfolio = signal<PortfolioMediaItem[]>([]);
  protected readonly portfolioLoading = signal(false);
  protected readonly portfolioError = signal<AppError | null>(null);
  protected readonly addingMedia = signal(false);
  protected readonly newMediaControl = this.fb.control<File | null>(null);
  protected readonly reorderingId = signal<number | null>(null);

  protected readonly packages = signal<VendorPackage[]>([]);
  protected readonly packagesLoading = signal(false);

  protected readonly availability = signal<VendorAvailability[]>([]);
  protected readonly availabilityLoading = signal(false);
  protected readonly AvailabilityStatus = AvailabilityStatus;
  protected readonly VendorType = VendorType;

  protected readonly lightboxIndex = signal<number | null>(null);

  protected readonly tabs: ProfileTab[] = [
    { id: 'about', label: 'About', icon: 'info' },
    { id: 'services', label: 'Services', icon: 'design_services' },
    { id: 'portfolio', label: 'Portfolio & Media', icon: 'photo_library' },
    { id: 'packages', label: 'Packages', icon: 'inventory_2' },
    { id: 'availability', label: 'Availability', icon: 'event_available' },
    { id: 'reviews', label: 'Reviews & Ratings', icon: 'star' },
    { id: 'contact', label: 'Contact Information', icon: 'call' },
    { id: 'business', label: 'Business Details', icon: 'domain' },
  ];

  protected readonly activeTab = signal<ProfileTabId>('about');

  protected readonly placeholderReviews: PlaceholderReview[] = [
    {
      author: 'Sarah M.',
      rating: 5,
      date: '2 weeks ago',
      comment: 'Absolutely wonderful to work with — professional, punctual, and the results exceeded our expectations.',
    },
    {
      author: 'Ahmed K.',
      rating: 5,
      date: '1 month ago',
      comment: 'Great communication throughout the whole planning process. Would book again without hesitation.',
    },
    {
      author: 'Layla H.',
      rating: 4,
      date: '2 months ago',
      comment: 'Really happy with the quality of the work. A couple of small delays, but the end result was worth it.',
    },
  ];

  protected readonly activePackages = computed(() => this.packages().filter((pkg) => pkg.isActive));

  protected readonly upcomingAvailability = computed(() => {
    const now = Date.now();
    return this.availability()
      .filter((slot) => new Date(slot.endAt).getTime() >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  });

  protected readonly isVerified = computed(() => {
    const status = this.vendorProfileState.profile()?.verificationStatus?.toLowerCase();
    return status === 'verified' || status === 'trusted';
  });

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
        this.fetchPackages(vendorId);
        this.fetchAvailability(vendorId);
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

  private fetchPackages(vendorId: number): void {
    this.packagesLoading.set(true);
    this.vendorPackageService.getByVendor(vendorId).subscribe({
      next: (packages) => {
        this.packages.set(packages);
        this.packagesLoading.set(false);
      },
      error: () => {
        this.packages.set([]);
        this.packagesLoading.set(false);
      },
    });
  }

  private fetchAvailability(vendorId: number): void {
    this.availabilityLoading.set(true);
    this.vendorAvailabilityService.getByVendor(vendorId).subscribe({
      next: (slots) => {
        this.availability.set(slots);
        this.availabilityLoading.set(false);
      },
      error: () => {
        this.availability.set([]);
        this.availabilityLoading.set(false);
      },
    });
  }

  protected setTab(id: ProfileTabId): void {
    this.activeTab.set(id);
  }

  protected formatStatus(status: string | undefined | null): string {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
  }

  protected ratingRounded(rating: number): number {
    return Math.round(rating);
  }

  protected availabilityStatusLabel(status: AvailabilityStatus): string {
    switch (status) {
      case AvailabilityStatus.Available:
        return 'Available';
      case AvailabilityStatus.Booked:
        return 'Booked';
      case AvailabilityStatus.Blocked:
        return 'Blocked';
      default:
        return 'Unknown';
    }
  }

  protected openEditModal(): void {
    this.saved.set(false);
    this.error.set(null);
    this.editModalOpen.set(true);
  }

  protected closeEditModal(): void {
    this.editModalOpen.set(false);
  }

  protected async shareProfile(): Promise<void> {
    const vendorId = this.vendorProfileState.vendorId();
    if (vendorId === null) {
      return;
    }

    const url = `${window.location.origin}/client/vendors/${vendorId}`;
    try {
      await navigator.clipboard.writeText(url);
      notifySuccess('Profile link copied to clipboard.');
    } catch {
      notifyError('Could not copy link', 'Please copy the URL manually.');
    }
  }

  protected openLightbox(index: number): void {
    this.lightboxIndex.set(index);
  }

  protected closeLightbox(): void {
    this.lightboxIndex.set(null);
  }

  protected nextLightboxItem(): void {
    const items = this.portfolio();
    this.lightboxIndex.update((current) => {
      if (current === null || items.length === 0) {
        return current;
      }
      return (current + 1) % items.length;
    });
  }

  protected prevLightboxItem(): void {
    const items = this.portfolio();
    this.lightboxIndex.update((current) => {
      if (current === null || items.length === 0) {
        return current;
      }
      return (current - 1 + items.length) % items.length;
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
        this.editModalOpen.set(false);
        this.vendorProfileState.refresh();
        notifySuccess('Profile updated successfully.');
      },
      error: (err: AppError) => {
        this.saving.set(false);
        this.error.set(err);
        notifyError('Could not update profile', err.message);
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
