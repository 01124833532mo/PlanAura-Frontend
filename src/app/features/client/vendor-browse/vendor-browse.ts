import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../shared/ui/button/button';
import { SelectField, SelectOption } from '../../../shared/ui/select-field/select-field';
import { TextField } from '../../../shared/ui/text-field/text-field';
import { VendorCard } from '../../../shared/ui/vendor-card/vendor-card';
import { AppError } from '../../../core/interfaces/api-response.model';
import { VendorBrowseFilter, VendorListItem } from '../../../core/interfaces/vendor-browse.model';
import { ServiceCategoryService } from '../../../core/services/service-category.service';
import { VendorBrowseService } from '../../../core/services/vendor-browse.service';

const RATING_OPTIONS = [4.0, 4.5, 4.8];
const PAGE_SIZE = 12;

@Component({
  selector: 'app-vendor-browse',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TextField,
    SelectField,
    Button,
    AlertBanner,
    VendorCard,
    DecimalPipe,
  ],
  templateUrl: './vendor-browse.html',
  styleUrl: './vendor-browse.css',
})
export class VendorBrowse implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vendorBrowseService = inject(VendorBrowseService);
  private readonly categoryService = inject(ServiceCategoryService);
  private readonly route = inject(ActivatedRoute);

  protected readonly categoryOptions = signal<SelectOption[]>([]);
  protected readonly vendors = signal<VendorListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly minRating = signal<number | null>(null);
  protected readonly eventPlanId = signal<number | undefined>(undefined);

  protected readonly ratingOptions = RATING_OPTIONS;
  protected readonly pageSize = PAGE_SIZE;

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / this.pageSize)),
  );
  protected readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  protected readonly sortOptions: SelectOption[] = [
    { value: 'featured', label: 'Featured' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'priceAsc', label: 'Price: Low to High' },
    { value: 'priceDesc', label: 'Price: High to Low' },
  ];

  // Matches package-browser's mixed nullable/nonNullable control pattern —
  // category has no "cleared" state reachable from the <select> itself
  // (only resetFilters() can clear it back to null), same as that page.
  protected readonly filterForm = this.fb.group({
    category: this.fb.control<string | null>(null),
    city: this.fb.nonNullable.control(''),
    minPrice: this.fb.nonNullable.control(''),
    maxPrice: this.fb.nonNullable.control(''),
    sortBy: this.fb.nonNullable.control<'featured' | 'rating' | 'priceAsc' | 'priceDesc'>(
      'featured',
    ),
  });

  ngOnInit(): void {
    const categoryFromQuery = this.route.snapshot.queryParamMap.get('category');
    if (categoryFromQuery) {
      this.filterForm.patchValue({ category: categoryFromQuery }, { emitEvent: false });
    }

    const eventPlanIdFromQuery = this.route.snapshot.queryParamMap.get('eventPlanId');
    if (eventPlanIdFromQuery) {
      this.eventPlanId.set(Number(eventPlanIdFromQuery));
    }

    this.categoryService.getActiveCategories().subscribe({
      next: (categories) =>
        this.categoryOptions.set(categories.map((c) => ({ value: c.slug, label: c.nameEn }))),
    });

    // All filter fields (including the two selects) share one 300ms debounce
    // — simpler and safer than juggling separate "instant" vs. "debounced"
    // subscriptions, and imperceptible for a dropdown change in practice.
    this.filterForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)))
      .subscribe(() => {
        this.page.set(1);
        this.runSearch();
      });

    this.runSearch();
  }

  protected selectRating(rating: number): void {
    this.minRating.set(this.minRating() === rating ? null : rating);
    this.page.set(1);
    this.runSearch();
  }

  protected resetFilters(): void {
    this.filterForm.reset(
      { category: null, city: '', minPrice: '', maxPrice: '', sortBy: 'featured' },
      { emitEvent: false },
    );
    this.minRating.set(null);
    this.page.set(1);
    this.runSearch();
  }

  protected goToPage(target: number): void {
    if (target < 1 || target > this.totalPages()) {
      return;
    }
    this.page.set(target);
    this.runSearch();
  }

  private runSearch(): void {
    const raw = this.filterForm.getRawValue();
    this.loading.set(true);
    this.error.set(null);

    const filter: VendorBrowseFilter = {
      category: raw.category ?? undefined,
      city: raw.city.trim() || undefined,
      minPrice: raw.minPrice.trim() === '' ? undefined : Number(raw.minPrice),
      maxPrice: raw.maxPrice.trim() === '' ? undefined : Number(raw.maxPrice),
      minRating: this.minRating() ?? undefined,
      sortBy: raw.sortBy,
      page: this.page(),
      pageSize: this.pageSize,
    };

    this.vendorBrowseService.list(filter).subscribe({
      next: (result) => {
        this.vendors.set(result.items);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }
}
