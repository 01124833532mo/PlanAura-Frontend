import { Injectable, computed, inject, signal } from '@angular/core';
import { VendorProfile } from '../interfaces/vendor-profile.model';
import { VendorService } from './vendor.service';

/**
 * In-memory cache for the logged-in vendor's own profile (fetched once via
 * GET /api/vendors/me). VendorPackagesController/VendorAvailabilityController
 * need the Vendor.Id explicitly in request bodies — this is where the rest
 * of the vendor dashboard reads it from, instead of every page re-fetching it.
 */
@Injectable({ providedIn: 'root' })
export class VendorProfileStateService {
  private readonly vendorService = inject(VendorService);

  private readonly profileSignal = signal<VendorProfile | null>(null);
  private readonly loadingSignal = signal(false);

  readonly profile = this.profileSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly vendorId = computed(() => this.profileSignal()?.id ?? null);

  /** Fetches the profile once and caches it; safe to call repeatedly (no-op while cached or in flight). */
  load(): void {
    if (this.profileSignal() || this.loadingSignal()) {
      return;
    }

    this.loadingSignal.set(true);
    this.vendorService.getMyProfile().subscribe({
      next: (profile) => {
        this.profileSignal.set(profile);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  clear(): void {
    this.profileSignal.set(null);
    this.loadingSignal.set(false);
  }

  /** Forces a fresh fetch, discarding any cached profile — use after an edit or a verification resubmission. */
  refresh(): void {
    this.clear();
    this.load();
  }
}
