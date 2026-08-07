/** Mirrors Planura.Core.Application.Models.Vendor.VendorListItemDto exactly. */
export interface VendorListItem {
  id: number;
  businessName: string;
  logoUrl: string | null;
  category: string | null;
  city: string | null;
  /**
   * BACKEND TODO: VendorListItemDto has no currency field (unlike
   * VendorPackageDto), so "starting at" prices can't be formatted with the
   * vendor's actual package currency here. Frontend falls back to a
   * hardcoded "EGP" (the platform's entity-level default) until the DTO
   * is extended with a Currency field.
   */
  startingPrice: number | null;
  /** Always present (defaults to 0 server-side) — check reviewCount, not this, to detect "no reviews yet". */
  avgRating: number;
  reviewCount: number;
  verificationStatus: 'Verified' | 'Trusted';
  shortDescription: string | null;
}

/** Mirrors Planura.Core.Application.Models.Vendor.VendorBrowseFilterDto. Category accepts a slug or numeric id. */
export interface VendorBrowseFilter {
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  /** Only vendors with at least one Available slot starting on this date (yyyy-MM-dd), e.g. "a photographer available on August 12". */
  availableOn?: string;
  sortBy?: 'featured' | 'rating' | 'priceAsc' | 'priceDesc';
  page?: number;
  pageSize?: number;
}

/** Mirrors Planura.Core.Application.Models.PagedResult<VendorListItemDto>. */
export interface PagedVendorList {
  items: VendorListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}
