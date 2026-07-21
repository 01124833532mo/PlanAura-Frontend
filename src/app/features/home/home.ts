import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { ServiceCategory } from '../../core/interfaces/vendor.model';
import { VendorListItem } from '../../core/interfaces/vendor-browse.model';
import { VendorBrowseService } from '../../core/services/vendor-browse.service';
import { VendorCard } from '../../shared/ui/vendor-card/vendor-card';
import { confirmLogout } from '../../shared/utils/confirm-logout';

/**
 * Fallback Material Symbols per category slug, used only when a category has
 * no iconUrl of its own. Covers common event-vendor categories; anything
 * unmatched falls back to a generic "celebration" icon.
 */
const CATEGORY_ICON_FALLBACKS: Record<string, string> = {
  venue: 'location_city',
  venues: 'location_city',
  catering: 'restaurant',
  caterer: 'restaurant',
  photography: 'photo_camera',
  photographer: 'photo_camera',
  videography: 'videocam',
  decor: 'local_florist',
  decoration: 'local_florist',
  florist: 'local_florist',
  music: 'music_note',
  entertainment: 'music_note',
  dj: 'music_note',
  makeup: 'face_retouching_natural',
  beauty: 'face_retouching_natural',
  planning: 'event_available',
  'event-planning': 'event_available',
  cake: 'cake',
  bakery: 'cake',
  transportation: 'directions_car',
  transport: 'directions_car',
};
const DEFAULT_CATEGORY_ICON = 'celebration';

/**
 * Post-login landing page for authenticated clients — a discovery/inspiration
 * splash, distinct from the utility dashboard at /client/dashboard. No
 * sidebar shell here on purpose (hero-style landing, not an in-app screen).
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, VendorCard, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly categoryService = inject(ServiceCategoryService);
  private readonly vendorBrowseService = inject(VendorBrowseService);
  private readonly router = inject(Router);

  protected readonly categories = signal<ServiceCategory[]>([]);
  protected readonly featuredVendors = signal<VendorListItem[]>([]);

  // Some category iconUrls 404 at runtime (likely manually-entered test data
  // pointing at files that were never actually uploaded) — track failures
  // here so the tile can fall back to the icon treatment instead of showing
  // the browser's broken-image glyph.
  protected readonly failedCategoryImages = signal<ReadonlySet<number>>(new Set());

  // Hero search — free-text "what are you planning" resolves against loaded
  // category names (best-effort match); city is passed straight through.
  // Neither is required: submitting blank still takes the user to the full
  // browse page with real filters, so the hero never dead-ends.
  protected readonly heroSearchTerm = signal('');
  protected readonly heroCity = signal('');

  ngOnInit(): void {
    this.categoryService.getActiveCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });

    this.vendorBrowseService.list({ sortBy: 'featured', pageSize: 6 }).subscribe({
      next: (result) => this.featuredVendors.set(result.items),
      error: () => this.featuredVendors.set([]),
    });
  }

  protected categoryIcon(slug: string): string {
    return CATEGORY_ICON_FALLBACKS[slug.toLowerCase()] ?? DEFAULT_CATEGORY_ICON;
  }

  protected onCategoryImageError(categoryId: number): void {
    this.failedCategoryImages.update((current) => new Set(current).add(categoryId));
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

    this.router.navigate(['/client/vendors'], { queryParams });
  }

  protected goToDashboard(): void {
    this.router.navigateByUrl('/client/dashboard');
  }

  protected goToNewPlan(): void {
    this.router.navigateByUrl('/client/event-plans/new');
  }

  protected async logout(): Promise<void> {
    const confirmed = await confirmLogout();
    if (!confirmed) {
      return;
    }
    this.authService.logout();
    this.router.navigateByUrl('/auth');
  }
}
