/** Mirrors Planura.Core.Application.Models.AdminDashboard.DashboardStatisticsDto exactly. */
export interface DashboardStatistics {
  totalVendors: number;
  pendingVendors: number;
  approvedVendors: number;
  rejectedVendors: number;
  unverifiedVendors: number;
  totalClients: number;
  totalBookingRequests: number;
  totalRevenue: number;
  openDisputes: number;
  newClientsThisWeek: number;
  newVendorsThisWeek: number;
  activeUsersLast30Days: number;
  revenueThisMonth: number;
  /** BookingStatus enum name -> count. */
  bookingsByStatus: Record<string, number>;
}

/** Mirrors Planura.Core.Application.Models.AdminDashboard.RecentActivityItemDto exactly. */
export interface RecentActivityItem {
  /** "VendorVerification" or "BookingStatus". */
  eventType: 'VendorVerification' | 'BookingStatus' | string;
  description: string;
  actorName: string | null;
  occurredAt: string;
}
