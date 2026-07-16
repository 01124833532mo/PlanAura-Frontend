/** Mirrors Planura.Core.Application.Models.VendorPackageDto. */
export interface VendorPackage {
  id: number;
  vendorId: number;
  title: string;
  description: string | null;
  basePrice: number;
  currency: string;
  maxGuests: number | null;
  includes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors Planura.Core.Application.Models.CreateVendorPackageDto. */
export interface CreateVendorPackagePayload {
  title: string;
  description?: string;
  basePrice: number;
  currency: string;
  maxGuests?: number;
  includes?: string;
  isActive: boolean;
}

/** Mirrors Planura.Core.Application.Models.UpdateVendorPackageDto. */
export interface UpdateVendorPackagePayload {
  title: string;
  description?: string;
  basePrice: number;
  currency: string;
  maxGuests?: number;
  includes?: string;
  isActive: boolean;
}

/** Mirrors Planura.Core.Application.Models.VendorPackageSearchDto. */
export interface VendorPackageSearchQuery {
  title?: string;
  categoryId?: number;
  activeOnly?: boolean;
}
