import { Component, Input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServiceCategory } from '../../../core/interfaces/vendor.model';
import { categoryIconFor } from '../../utils/category-icon';

/**
 * Visual category tile — links into Explore Vendors pre-filtered by this
 * category's slug. Used on the homepage category carousel and the Explore
 * Services catalog page (see explore-services.ts) so category-based
 * discovery looks identical everywhere it appears.
 */
@Component({
  selector: 'ui-category-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './category-card.html',
  styleUrl: './category-card.css',
})
export class CategoryCard {
  @Input({ required: true }) category!: ServiceCategory;

  protected readonly imageFailed = signal(false);

  protected get icon(): string {
    return categoryIconFor(this.category.slug);
  }

  protected onImageError(): void {
    this.imageFailed.set(true);
  }
}
