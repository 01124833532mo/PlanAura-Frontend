import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { Button } from '../../../shared/ui/button/button';
import { VendorCard } from '../../../shared/ui/vendor-card/vendor-card';
import { VendorListItem } from '../../../core/interfaces/vendor-browse.model';
import { VendorProfile } from '../../../core/interfaces/vendor-profile.model';
import { FavoritesService } from '../../../core/services/favorites.service';
import { VendorService } from '../../../core/services/vendor.service';

/**
 * The client's saved-vendor list. FavoritesService is a real, working, per-device store (see its own
 * header comment) — the heart toggle on every vendor card has saved to it for a while now, but until
 * this page there was nowhere to actually *see* the list, so favoriting felt like it went nowhere.
 *
 * There's no batch "get vendors by ids" endpoint, so each saved id is resolved with the same
 * VendorService.getById the vendor-details page already uses (public, AllowAnonymous server-side) —
 * fine for a saved-vendors list, which is realistically a handful of vendors, not hundreds.
 */
@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [Button, VendorCard],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export class Favorites implements OnInit {
  private readonly favoritesService = inject(FavoritesService);
  private readonly vendorService = inject(VendorService);
  private readonly router = inject(Router);

  protected readonly ids = this.favoritesService.ids;
  protected readonly loading = signal(false);

  private readonly vendorsById = signal<Map<number, VendorListItem>>(new Map());

  /** Live-filtered by the current favorite id set, so un-hearting a card removes it immediately
   * without needing a re-fetch — no growing case to handle here since every card shown already
   * came from this set (favoriting happens on other pages, not this one). */
  protected readonly favoriteVendors = computed(() => {
    const ids = this.ids();
    const map = this.vendorsById();
    return [...ids]
      .map((id) => map.get(id))
      .filter((v): v is VendorListItem => v != null)
      .sort((a, b) => a.businessName.localeCompare(b.businessName));
  });

  ngOnInit(): void {
    const ids = [...this.ids()];
    if (ids.length === 0) {
      return;
    }

    this.loading.set(true);
    forkJoin(ids.map((id) => this.vendorService.getById(id).pipe(catchError(() => of(null))))).subscribe(
      (vendors) => {
        const map = new Map<number, VendorListItem>();
        for (const v of vendors) {
          if (v) {
            map.set(v.id, this.toListItem(v));
          }
        }
        this.vendorsById.set(map);
        this.loading.set(false);
      },
    );
  }

  /** Adapts VendorDto (VendorProfile) to the VendorListItemDto shape ui-vendor-card expects — the
   * fields it doesn't have (startingPrice) fall back to the card's own "Contact for pricing" state. */
  private toListItem(v: VendorProfile): VendorListItem {
    const normalized = v.verificationStatus?.toLowerCase();
    return {
      id: v.id,
      businessName: v.businessName,
      logoUrl: v.logoUrl,
      category: v.categoryName,
      city: v.city,
      startingPrice: null,
      avgRating: v.avgRating,
      reviewCount: v.totalReviews,
      verificationStatus: normalized === 'trusted' ? 'Trusted' : 'Verified',
      shortDescription: v.businessDescription,
    };
  }

  protected goToVendors(): void {
    this.router.navigateByUrl('/explore/vendors');
  }
}
