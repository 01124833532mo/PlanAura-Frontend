import { DecimalPipe } from '@angular/common';
import { Component, Input, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VendorListItem } from '../../../core/interfaces/vendor-browse.model';
import { FavoritesService } from '../../../core/services/favorites.service';

/**
 * Vendor listing card — redesigned as a full-bleed image tile in the Airbnb
 * listing mold: the whole card is the link (not just a CTA button buried at
 * the bottom), the image does most of the work, and copy is reduced to what
 * actually helps someone decide (rating, location, starting price). No card
 * border/box at rest; a favorite (heart) toggle lives on the image itself.
 */
@Component({
  selector: 'ui-vendor-card',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './vendor-card.html',
  styleUrl: './vendor-card.css',
})
export class VendorCard {
  private readonly favoritesService = inject(FavoritesService);

  @Input({ required: true }) vendor!: VendorListItem;
  /** Carried into vendor-details so "Book this package" can thread it through to booking-create. */
  @Input() eventPlanId?: number;

  /** Hardcoded pending the VendorListItemDto Currency field — see vendor-browse.model.ts. */
  protected readonly fallbackCurrency = 'EGP';

  protected readonly isFavorite = computed(() => this.favoritesService.isFavorite(this.vendor.id));

  protected toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favoritesService.toggle(this.vendor.id);
  }
}
