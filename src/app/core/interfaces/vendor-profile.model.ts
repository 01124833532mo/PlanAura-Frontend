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
  /** True once this vendor's one-time Partnership Agreement with Planura has been generated. */
  hasPartnershipAgreement: boolean;
  partnershipAgreementId: string | null;
  partnershipAgreementUrl: string | null;
  partnershipAgreementGeneratedAt: string | null;
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
