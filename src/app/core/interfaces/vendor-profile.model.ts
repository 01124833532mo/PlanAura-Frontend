import { VendorType } from './vendor.model';

/** Mirrors Planura.Core.Application.Models.Vendor.VendorDto exactly. */
export interface VendorProfile {
  id: number;
  businessName: string;
  businessDescription: string | null;
  categoryId: number | null;
  categoryName: string | null;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  verificationStatus: string;
  vendorType: VendorType;
  avgRating: number;
  totalReviews: number;
  totalCompletedBookings: number;
  createdAt: string;
}

/** Mirrors Planura.Core.Application.Models.Vendor.UpdateVendorProfileDto exactly. */
export interface UpdateVendorProfilePayload {
  businessName: string;
  businessDescription?: string;
  categoryId?: number;
  city?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  logoFile?: File;
  coverImageFile?: File;
}
