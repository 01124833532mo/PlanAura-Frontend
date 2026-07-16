/** Mirrors Planura.Core.Application.Models.Vendor.VendorDashboardStatsDto. */
export interface VendorDashboardStats {
  // Booking requests breakdown
  totalBookingRequests: number;
  pendingRequests: number;
  acceptedRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;
  completedRequests: number;
  expiredRequests: number;

  // Accepted bookings whose event date is still in the future
  upcomingBookings: number;

  // Sum of captured (completed) payments for this vendor
  totalRevenue: number;

  // Reputation (denormalized on the vendor profile)
  avgRating: number;
  totalReviews: number;
  totalCompletedBookings: number;

  // Catalog
  activePackages: number;
}
