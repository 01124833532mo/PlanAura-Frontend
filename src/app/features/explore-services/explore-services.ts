import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppError } from '../../core/interfaces/api-response.model';
import { ServiceCategory } from '../../core/interfaces/vendor.model';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { CategoryCard } from '../../shared/ui/category-card/category-card';
import { AlertBanner } from '../../shared/ui/alert-banner/alert-banner';

/**
 * "Explore Services" — the category-driven catalog entry point requested by
 * the redesign spec. There is no single backend endpoint that returns
 * services-with-vendor-info together (only vendor packages, which don't
 * carry vendor name/logo, and a separate vendor browse endpoint) — rather
 * than fake that join, this page uses the real ServiceCategoryService and
 * lets each category tile deep-link into Explore Vendors pre-filtered by
 * category (vendor-browse.ts already supports ?category=<slug>).
 */
@Component({
  selector: 'app-explore-services',
  standalone: true,
  imports: [FormsModule, CategoryCard, AlertBanner],
  templateUrl: './explore-services.html',
  styleUrl: './explore-services.css',
})
export class ExploreServices implements OnInit {
  private readonly categoryService = inject(ServiceCategoryService);

  protected readonly categories = signal<ServiceCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);
  protected readonly searchTerm = signal('');

  protected readonly filteredCategories = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.categories();
    }
    return this.categories().filter((c) => c.nameEn.toLowerCase().includes(term));
  });

  ngOnInit(): void {
    this.categoryService.getActiveCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }
}
