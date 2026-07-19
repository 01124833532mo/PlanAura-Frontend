import { BookingPaymentStatus, BookingStatus, DisputeStatus } from './booking-request.model';

/** Mirrors Planura.Core.Application.Models.AdminBooking.AdminBookingDto exactly. */
export interface AdminBookingListItem {
  id: number;
  eventDate: string;
  agreedPrice: number | null;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  createdAt: string;
  disputeStatus: DisputeStatus | null;
  clientName: string;
  vendorName: string;
  packageName: string | null;
}

/** Mirrors Planura.Core.Application.Models.AdminBooking.AdminBookingFilterDto exactly. */
export interface AdminBookingFilter {
  search?: string;
  status?: BookingStatus;
  paymentStatus?: BookingPaymentStatus;
  disputeStatus?: DisputeStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

/** Mirrors Planura.Core.Application.Models.AdminBooking.AdminDisputeListItemDto exactly. */
export interface AdminDisputeListItem {
  bookingId: number;
  clientId: number;
  clientName: string | null;
  vendorId: number;
  vendorName: string | null;
  agreedPrice: number | null;
  eventDate: string;
  disputeStatus: DisputeStatus;
  disputedAt: string | null;
  bookingStatus: BookingStatus;
  paymentStatus: BookingPaymentStatus;
}

/** Mirrors Planura.Core.Application.Models.AdminBooking.AdminDisputeDetailsDto exactly. */
export interface AdminDisputeDetails {
  bookingId: number;
  eventDate: string;
  agreedPrice: number | null;
  guestCount: number | null;
  bookingStatus: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  clientId: number;
  clientName: string;
  vendorId: number;
  vendorName: string;
  disputeStatus: DisputeStatus | null;
  disputedAt: string | null;
  /** The actual reason the dispute was raised. */
  disputeReason: string | null;
  resolutionNotes: string | null;
  resolvedByAdminId: number | null;
  resolvedByAdminName: string | null;
  resolvedAt: string | null;
  /** Original booking request message, predates the dispute. */
  clientMessage: string | null;
  /** Original vendor reply, predates the dispute. */
  vendorResponse: string | null;
}

/** Mirrors Planura.Core.Application.Models.AdminBooking.ResolveDisputeDto exactly. */
export interface ResolveDisputeRequest {
  resolutionNotes: string;
  /** When true, refunds the booking's Completed payment as part of resolving the dispute. */
  refundClient: boolean;
}
