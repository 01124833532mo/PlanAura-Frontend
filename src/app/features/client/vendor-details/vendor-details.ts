import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { AppError } from '../../../core/interfaces/api-response.model';
import { PortfolioMediaItem } from '../../../core/interfaces/portfolio.model';
import { Review, ReviewSummary } from '../../../core/interfaces/review.model';
import { VendorPackage } from '../../../core/interfaces/vendor-package.model';
import { VendorProfile } from '../../../core/interfaces/vendor-profile.model';
import { ReviewService } from '../../../core/services/review.service';
import { VendorPackageService } from '../../../core/services/vendor-package.service';
import { VendorService } from '../../../core/services/vendor.service';

/**
 * Client-facing vendor listing page — the page that actually has to convert
 * (browse → this → booking-create). Redesigned as a proper listing: cover
 * hero, portfolio gallery with lightbox, package cards, and a public reviews
 * section, in that Airbnb-listing order. All data already existed via
 * VendorService.getPortfolioMedia / ReviewService.getVendorReviews+Summary —
 * neither was wired into this page before.
 */
@Component({
  selector: 'app-vendor-details',
  standalone: true,
  imports: [AlertBanner, DecimalPipe],
  templateUrl: './vendor-details.html',
  styleUrl: './vendor-details.css',
})
export class VendorDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vendorService = inject(VendorService);
  private readonly packageService = inject(VendorPackageService);
  private readonly reviewService = inject(ReviewService);

  protected readonly vendor = signal<VendorProfile | null>(null);
  protected readonly packages = signal<VendorPackage[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly portfolio = signal<PortfolioMediaItem[]>([]);
  protected readonly portfolioLoading = signal(false);
  protected readonly lightboxIndex = signal<number | null>(null);

  protected readonly reviews = signal<Review[]>([]);
  protected readonly reviewSummary = signal<ReviewSummary | null>(null);
  protected readonly reviewsLoading = signal(false);

  private vendorId = 0;
  private eventPlanId: number | null = null;

  ngOnInit(): void {
    this.vendorId = Number(this.route.snapshot.paramMap.get('id'));
    const eventPlanIdParam = this.route.snapshot.queryParamMap.get('eventPlanId');
    this.eventPlanId = eventPlanIdParam ? Number(eventPlanIdParam) : null;

    this.loading.set(true);
    this.error.set(null);

    this.vendorService.getById(this.vendorId).subscribe({
      next: (vendor) => {
        this.vendor.set(vendor);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });

    this.packageService.getByVendor(this.vendorId, true).subscribe({
      next: (packages) => this.packages.set(packages),
      error: () => this.packages.set([]),
    });

    this.loadPortfolio();
    this.loadReviews();
  }

  private loadPortfolio(): void {
    this.portfolioLoading.set(true);
    this.vendorService.getPortfolioMedia(this.vendorId).subscribe({
      next: (media) => {
        this.portfolio.set(media);
        this.portfolioLoading.set(false);
      },
      error: () => {
        this.portfolio.set([]);
        this.portfolioLoading.set(false);
      },
    });
  }

  private loadReviews(): void {
    this.reviewsLoading.set(true);
    this.reviewService.getVendorSummary(this.vendorId).subscribe({
      next: (summary) => this.reviewSummary.set(summary),
      error: () => this.reviewSummary.set(null),
    });
    this.reviewService.getVendorReviews(this.vendorId, { pageSize: 10 }).subscribe({
      next: (result) => {
        this.reviews.set(result.items);
        this.reviewsLoading.set(false);
      },
      error: () => {
        this.reviews.set([]);
        this.reviewsLoading.set(false);
      },
    });
  }

  /** Star counts, 5 down to 1, for the summary rating bars. */
  protected ratingBars(summary: ReviewSummary): { stars: number; count: number; pct: number }[] {
    const counts = [summary.fiveStar, summary.fourStar, summary.threeStar, summary.twoStar, summary.oneStar];
    const max = Math.max(1, ...counts);
    return counts.map((count, i) => ({ stars: 5 - i, count, pct: (count / max) * 100 }));
  }

  /** VendorDto's status comes through raw/lowercase ("verified"/"trusted"), unlike VendorListItemDto's capitalized form. */
  protected formatStatus(status: string): string {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
  }

  protected openLightbox(index: number): void {
    this.lightboxIndex.set(index);
  }

  protected closeLightbox(): void {
    this.lightboxIndex.set(null);
  }

  protected nextImage(): void {
    const items = this.portfolio();
    this.lightboxIndex.update((i) => (i === null || items.length === 0 ? i : (i + 1) % items.length));
  }

  protected prevImage(): void {
    const items = this.portfolio();
    this.lightboxIndex.update((i) =>
      i === null || items.length === 0 ? i : (i - 1 + items.length) % items.length,
    );
  }

  protected bookPackage(pkg: VendorPackage): void {
    this.router.navigate(['/client/booking/new'], {
      queryParams: {
        vendorId: this.vendorId,
        packageId: pkg.id,
        eventPlanId: this.eventPlanId ?? undefined,
      },
    });
  }

  protected goBack(): void {
    this.router.navigateByUrl('/client/vendors');
  }
}
