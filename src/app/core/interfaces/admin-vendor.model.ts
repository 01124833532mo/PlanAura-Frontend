import { VendorType } from './vendor.model';

/** Mirrors Planura.Core.Domain.Constants.VerificationStatus values (lowercase strings). */
export const ADMIN_VENDOR_STATUS = {
  Unverified: 'unverified',
  Pending: 'pending',
  Verified: 'verified',
  Trusted: 'trusted',
  Rejected: 'rejected',
} as const;

export type AdminVendorStatus = (typeof ADMIN_VENDOR_STATUS)[keyof typeof ADMIN_VENDOR_STATUS];

/** Mirrors Planura.Core.Application.Models.AdminVendor.AdminVendorListItemDto exactly. */
export interface AdminVendorListItem {
  vendorId: number;
  userId: number;
  vendorName: string;
  businessName: string;
  vendorType: VendorType;
  categoryName: string | null;
  city: string | null;
  verificationStatus: string;
  isAccountActive: boolean;
  avgRating: number;
  totalReviews: number;
  totalCompletedBookings: number;
  createdAt: string;
}

/** Mirrors Planura.Core.Application.Models.AdminVendor.AdminVendorFilterDto exactly. */
export interface AdminVendorFilter {
  status?: string;
  categoryId?: number;
  city?: string;
  search?: string;
  isAccountActive?: boolean;
  page?: number;
  pageSize?: number;
}

/** Mirrors Planura.Core.Application.Models.AdminVendor.AdminVendorStatusCountsDto exactly. */
export interface AdminVendorStatusCounts {
  unverified: number;
  pending: number;
  verified: number;
  trusted: number;
  rejected: number;
}
