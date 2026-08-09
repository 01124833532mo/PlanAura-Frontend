import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { ServiceCategory } from '../../core/interfaces/vendor.model';
import { VendorListItem } from '../../core/interfaces/vendor-browse.model';
import { VendorBrowseService } from '../../core/services/vendor-browse.service';
import { VendorCard } from '../../shared/ui/vendor-card/vendor-card';
import { CategoryCard } from '../../shared/ui/category-card/category-card';

/**
 * Public marketing homepage — guest-browsable (no authGuard/clientGuard, see
 * app.routes.ts), rendered inside PublicShell which supplies the navbar and
 * footer. Section order: Hero -> Discover/Search -> Popular Categories ->
 * Featured Vendors -> How Planura Works -> Trust/Value -> closing CTA.
 * Deliberately has no fabricated stats or testimonials — every number/card
 * on this page comes from a real API call (ServiceCategoryService /
 * VendorBrowseService).
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, VendorCard, CategoryCard, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, AfterViewInit {
  private readonly categoryService = inject(ServiceCategoryService);
  private readonly vendorBrowseService = inject(VendorBrowseService);
  private readonly router = inject(Router);

  @ViewChild('categoryScroll')
  private categoryScroll?: ElementRef<HTMLDivElement>;

  protected readonly categories = signal<ServiceCategory[]>([]);
  protected readonly categoriesLoading = signal(true);
  protected readonly featuredVendors = signal<VendorListItem[]>([]);
  protected readonly featuredLoading = signal(true);
  /** Real total from the browse API's PagedVendorList — not a made-up number. */
  protected readonly totalVendorCount = signal<number | null>(null);

  // Whether the category row has more content off-screen in either
  // direction — drives visibility of the prev/next scroll buttons. Only
  // relevant once there are enough categories to overflow a single row.
  protected readonly canScrollCategoriesPrev = signal(false);
  protected readonly canScrollCategoriesNext = signal(false);

  // Hero search — free-text "what are you planning" resolves against loaded
  // category names (best-effort match); city is passed straight through.
  // Neither is required: submitting blank still takes the user to the full
  // explore page with real filters, so the hero never dead-ends.
  protected readonly heroSearchTerm = signal('');
  protected readonly heroCity = signal('');

  ngOnInit(): void {
    this.categoryService.getActiveCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.categoriesLoading.set(false);
        // Tiles render after this tick, so defer the overflow check.
        setTimeout(() => this.updateCategoryScrollState());
      },
      error: () => {
        this.categories.set([]);
        this.categoriesLoading.set(false);
      },
    });

    this.vendorBrowseService.list({ sortBy: 'featured', pageSize: 8 }).subscribe({
      next: (result) => {
        this.featuredVendors.set(result.items);
        this.totalVendorCount.set(result.totalCount);
        this.featuredLoading.set(false);
      },
      error: () => {
        this.featuredVendors.set([]);
        this.featuredLoading.set(false);
      },
    });
  }

  ngAfterViewInit(): void {
    this.updateCategoryScrollState();
  }

  protected scrollCategories(direction: 'prev' | 'next'): void {
    const el = this.categoryScroll?.nativeElement;
    if (!el) {
      return;
    }
    const amount = el.clientWidth * 0.9 * (direction === 'prev' ? -1 : 1);
    el.scrollBy({ left: amount, behavior: 'smooth' });
    // scrollBy is async/animated, so re-check after it settles.
    setTimeout(() => this.updateCategoryScrollState(), 350);
  }

  protected updateCategoryScrollState(): void {
    const el = this.categoryScroll?.nativeElement;
    if (!el) {
      this.canScrollCategoriesPrev.set(false);
      this.canScrollCategoriesNext.set(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    this.canScrollCategoriesPrev.set(el.scrollLeft > 4);
    this.canScrollCategoriesNext.set(el.scrollLeft < maxScroll - 4);
  }

  protected searchVendors(): void {
    const term = this.heroSearchTerm().trim().toLowerCase();
    const city = this.heroCity().trim();
    const matchedCategory = term
      ? this.categories().find((c) => c.nameEn.toLowerCase().includes(term))
      : undefined;

    const queryParams: Record<string, string> = {};
    if (matchedCategory) {
      queryParams['category'] = matchedCategory.slug;
    }
    if (city) {
      queryParams['city'] = city;
    }

    this.router.navigate(['/explore/vendors'], { queryParams });
  }

  /** Quick category chip in the Discover section — jumps straight to a pre-filtered browse. */
  protected browseCategory(category: ServiceCategory): void {
    this.router.navigate(['/explore/vendors'], { queryParams: { category: category.slug } });
  }
}
