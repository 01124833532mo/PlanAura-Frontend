import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../shared/ui/button/button';
import { SelectOption } from '../../../shared/ui/select-field/select-field';
import { VendorCard } from '../../../shared/ui/vendor-card/vendor-card';
import { AppError } from '../../../core/interfaces/api-response.model';
import { VendorBrowseFilter, VendorListItem } from '../../../core/interfaces/vendor-browse.model';
import { ServiceCategoryService } from '../../../core/services/service-category.service';
import { VendorBrowseService } from '../../../core/services/vendor-browse.service';

/**
 * Minimum-rating tiers, low to high. The lower tiers matter: a vendor's AvgRating is a real
 * average over a handful of reviews, so most sit in the 3s — an options list that started at
 * 4.0 (as this one did) filtered every vendor out and read as a broken filter.
 */
const RATING_OPTIONS = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 4.8];
const PAGE_SIZE = 12;

type DropdownKey = 'category' | 'price' | 'rating' | 'sort';

@Component({
  selector: 'app-vendor-browse',
  standalone: true,
  imports: [ReactiveFormsModule, Button, AlertBanner, VendorCard, DecimalPipe],
  templateUrl: './vendor-browse.html',
  styleUrl: './vendor-browse.css',
})
export class VendorBrowse implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly vendorBrowseService = inject(VendorBrowseService);
  private readonly categoryService = inject(ServiceCategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly categoryOptions = signal<SelectOption[]>([]);
  protected readonly vendors = signal<VendorListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly page = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly minRating = signal<number | null>(null);
  protected readonly eventPlanId = signal<number | undefined>(undefined);

  /** Which custom dropdown segment is open — only one at a time, like Airbnb's search bar. */
  protected readonly openDropdown = signal<DropdownKey | null>(null);

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
    // Typed number|null, NOT string: the price inputs are <input type="number">, so Angular
    // binds NumberValueAccessor, which writes a number (or null when the box is emptied) into
    // the control regardless of how it was declared. Declaring these as strings made the
    // compiler believe raw.minPrice was a string while it held a number at runtime, and the
    // .trim() calls below threw as soon as a price was typed — taking the whole search with it.
    minPrice: this.fb.control<number | null>(null),
    maxPrice: this.fb.control<number | null>(null),
    sortBy: this.fb.nonNullable.control<'featured' | 'rating' | 'priceAsc' | 'priceDesc'>(
      'featured',
    ),
  });

  ngOnInit(): void {
    const categoryFromQuery = this.route.snapshot.queryParamMap.get('category');
    if (categoryFromQuery) {
      this.filterForm.patchValue({ category: categoryFromQuery }, { emitEvent: false });
    }

    const cityFromQuery = this.route.snapshot.queryParamMap.get('city');
    if (cityFromQuery) {
      this.filterForm.patchValue({ city: cityFromQuery }, { emitEvent: false });
    }

    const eventPlanIdFromQuery = this.route.snapshot.queryParamMap.get('eventPlanId');
    if (eventPlanIdFromQuery) {
      this.eventPlanId.set(Number(eventPlanIdFromQuery));
    }

    this.categoryService.getActiveCategories().subscribe({
      next: (categories) =>
        this.categoryOptions.set(categories.map((c) => ({ value: c.slug, label: c.nameEn }))),
    });

    // All filter fields (including the two dropdowns) share one 300ms debounce
    // — simpler and safer than juggling separate "instant" vs. "debounced"
    // subscriptions, and imperceptible for a dropdown/keystroke change in practice.
    this.filterForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)))
      .subscribe(() => {
        this.page.set(1);
        this.runSearch();
      });

    this.runSearch();
  }

  /** Closes any open dropdown segment when the user clicks outside the filter bar. */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.openDropdown() === null) {
      return;
    }
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.openDropdown.set(null);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    const key = this.openDropdown();
    if (!key) {
      return;
    }
    this.openDropdown.set(null);
    (this.elementRef.nativeElement.querySelector(`#${key}-trigger`) as HTMLElement | null)?.focus();
  }

  protected toggleDropdown(key: DropdownKey): void {
    this.openDropdown.set(this.openDropdown() === key ? null : key);
  }

  protected closeDropdown(): void {
    this.openDropdown.set(null);
  }

  /** Closes a dropdown once focus leaves its trigger+panel entirely (mouse OR keyboard tabbing). */
  protected onSegmentFocusOut(event: FocusEvent, key: DropdownKey): void {
    const related = event.relatedTarget as Node | null;
    const segment = event.currentTarget as HTMLElement;
    if ((!related || !segment.contains(related)) && this.openDropdown() === key) {
      this.openDropdown.set(null);
    }
  }

  /** ArrowDown/ArrowUp on a closed trigger opens it straight into the option list, combobox-style. */
  protected onTriggerKeydown(event: KeyboardEvent, key: DropdownKey): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    this.openDropdown.set(key);
    const focusFirst = event.key === 'ArrowDown';
    setTimeout(() => {
      if (key === 'price') {
        (this.elementRef.nativeElement.querySelector('#price-panel input') as HTMLElement | null)?.focus();
        return;
      }
      this.focusOptionAt(key, focusFirst ? 0 : -1);
    }, 0);
  }

  /** Arrow/Home/End navigation between options inside an open listbox panel. */
  protected onListboxKeydown(event: KeyboardEvent): void {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const panel = event.currentTarget as HTMLElement;
    const options = Array.from(panel.querySelectorAll<HTMLButtonElement>('.dropdown-option'));
    if (options.length === 0) {
      return;
    }
    const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1 + options.length) % options.length;
        break;
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + options.length) % options.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      default:
        nextIndex = options.length - 1;
    }
    options[nextIndex]?.focus();
  }

  private focusOptionAt(key: DropdownKey, index: number): void {
    const panel = this.elementRef.nativeElement.querySelector(`#${key}-listbox`) as HTMLElement | null;
    const options = panel ? Array.from(panel.querySelectorAll<HTMLButtonElement>('.dropdown-option')) : [];
    if (options.length === 0) {
      return;
    }
    (index === -1 ? options[options.length - 1] : options[index])?.focus();
  }

  /** Drives the "Clear filters" button's visibility — only shown once something is actually set. */
  protected hasActiveFilters(): boolean {
    const raw = this.filterForm.getRawValue();
    return (
      !!raw.category ||
      raw.city.trim() !== '' ||
      raw.minPrice !== null ||
      raw.maxPrice !== null ||
      this.minRating() !== null
    );
  }

  // SelectOption.value is typed string | number (shared with other pages that use numeric
  // ids) even though category slugs are always strings in practice — normalize here.
  protected selectCategory(value: string | number | null): void {
    this.filterForm.patchValue({ category: value === null ? null : String(value) });
    this.closeDropdown();
  }

  protected categoryLabel(): string {
    const value = this.filterForm.get('category')?.value ?? null;
    if (!value) {
      return 'Any category';
    }
    return this.categoryOptions().find((o) => o.value === value)?.label ?? 'Any category';
  }

  // sortOptions is declared as SelectOption[] (value: string | number) for consistency
  // with categoryOptions, even though its values are always one of the four sort keys.
  protected selectSort(value: string | number): void {
    this.filterForm.patchValue({ sortBy: value as 'featured' | 'rating' | 'priceAsc' | 'priceDesc' });
    this.closeDropdown();
  }

  protected sortLabel(): string {
    const value = this.filterForm.get('sortBy')?.value ?? 'featured';
    return this.sortOptions.find((o) => o.value === value)?.label ?? 'Featured';
  }

  protected priceLabel(): string {
    const { minPrice, maxPrice } = this.filterForm.getRawValue();
    if (minPrice === null && maxPrice === null) {
      return 'Any price';
    }
    if (minPrice !== null && maxPrice !== null) {
      return `${minPrice} – ${maxPrice}`;
    }
    if (minPrice !== null) {
      return `${minPrice}+`;
    }
    return `Up to ${maxPrice}`;
  }

  protected clearPrice(): void {
    this.filterForm.patchValue({ minPrice: null, maxPrice: null });
  }

  /** Passing null clears the filter; re-picking the active tier toggles it off. */
  protected selectRating(rating: number | null): void {
    this.minRating.set(rating === null || this.minRating() === rating ? null : rating);
    this.page.set(1);
    this.runSearch();
  }

  protected ratingLabel(): string {
    const rating = this.minRating();
    return rating === null ? 'Any rating' : `${rating.toFixed(1)}+ stars`;
  }

  /** Skips the 300ms debounce for an explicit "search now" tap on the hero search button. */
  protected searchNow(): void {
    this.page.set(1);
    this.runSearch();
  }

  protected resetFilters(): void {
    this.filterForm.reset(
      { category: null, city: '', minPrice: null, maxPrice: null, sortBy: 'featured' },
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
      minPrice: raw.minPrice ?? undefined,
      maxPrice: raw.maxPrice ?? undefined,
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
