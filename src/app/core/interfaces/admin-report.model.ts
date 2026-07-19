/** Mirrors Planura.Core.Application.Models.AdminReport.MonthlyRegistrationsDto exactly. */
export interface MonthlyRegistrations {
  year: number;
  month: number;
  clientCount: number;
  vendorCount: number;
  totalCount: number;
}

/** Mirrors Planura.Core.Application.Models.AdminReport.MonthlyCountDto exactly. */
export interface MonthlyCount {
  year: number;
  month: number;
  count: number;
}

/** Mirrors Planura.Core.Application.Models.AdminReport.MonthlyAmountDto exactly. */
export interface MonthlyAmount {
  year: number;
  month: number;
  amount: number;
}

/** Mirrors Planura.Core.Application.Models.AdminReport.TopVendorDto exactly. */
export interface TopVendor {
  vendorId: number;
  businessName: string;
  revenue: number;
  bookingCount: number;
}

/** Mirrors Planura.Core.Application.Models.AdminReport.TopCategoryDto exactly. */
export interface TopCategory {
  categoryId: number;
  categoryName: string;
  vendorCount: number;
  bookingCount: number;
}

/** Mirrors Planura.Core.Application.Models.AdminReport.VendorVerificationFunnelDto exactly. */
export interface VendorVerificationFunnel {
  submitted: number;
  pending: number;
  approved: number;
  rejected: number;
}
