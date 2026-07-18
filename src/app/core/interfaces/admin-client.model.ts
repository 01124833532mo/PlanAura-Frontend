/** Mirrors Planura.Core.Application.Models.AdminClient.AdminClientListItemDto exactly. */
export interface AdminClientListItem {
  clientId: number;
  userId: number;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  city: string | null;
  isAccountActive: boolean;
  bookingCount: number;
  createdAt: string;
}

/** Mirrors Planura.Core.Application.Models.AdminClient.AdminClientFilterDto exactly. */
export interface AdminClientFilter {
  search?: string;
  city?: string;
  isAccountActive?: boolean;
  page?: number;
  pageSize?: number;
}

/** Mirrors Planura.Core.Application.Models.AdminClient.AdminClientEventPlanDto exactly. */
export interface AdminClientEventPlan {
  id: number;
  title: string | null;
  eventType: string;
  eventDate: string | null;
  status: string;
  createdAt: string;
}

/** Mirrors Planura.Core.Application.Models.AdminClient.AdminClientBookingDto exactly. */
export interface AdminClientBooking {
  id: number;
  vendorName: string;
  eventDate: string;
  agreedPrice: number | null;
  status: string;
  paymentStatus: string;
}

/** Mirrors Planura.Core.Application.Models.AdminClient.AdminClientDetailsDto exactly. */
export interface AdminClientDetails {
  clientId: number;
  userId: number;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  city: string | null;
  dateOfBirth: string | null;
  isAccountActive: boolean;
  createdAt: string;
  eventPlanCount: number;
  bookingCount: number;
  totalSpend: number;
  eventPlans: AdminClientEventPlan[];
  bookings: AdminClientBooking[];
}
