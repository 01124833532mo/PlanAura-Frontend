/** Mirrors Planura.Core.Application.Models.AdminVendorPayout.VendorFinancialSummaryDto exactly. */
export interface VendorFinancialSummary {
  vendorId: number;
  vendorName: string;
  totalBookings: number;
  totalBookingValue: number;
  /** Gross amount ever captured from clients for this vendor's bookings, before refunds. */
  totalCollected: number;
  totalRefunded: number;
  /** totalCollected minus totalRefunded. */
  netCollected: number;
  amountPaidOut: number;
  /** netCollected minus amountPaidOut, floored at zero. No commission is deducted. */
  amountPayable: number;
}

/** Mirrors Planura.Core.Application.Models.AdminVendorPayout.VendorFinancialFilterDto exactly. */
export interface VendorFinancialFilter {
  search?: string;
  page?: number;
  pageSize?: number;
}

/** Mirrors Planura.Core.Application.Models.AdminVendorPayout.RecordVendorPayoutDto exactly. */
export interface RecordVendorPayoutRequest {
  amount: number;
  payoutDate: string;
  reference?: string | null;
  notes?: string | null;
}

/** Mirrors Planura.Core.Application.Models.AdminVendorPayout.VendorPayoutDto exactly. */
export interface VendorPayout {
  id: number;
  vendorId: number;
  amount: number;
  payoutDate: string;
  reference: string | null;
  notes: string | null;
  recordedByAdminName: string | null;
  createdAt: string;
}
