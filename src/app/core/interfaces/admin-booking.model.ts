import { BookingPaymentStatus, BookingStatus, DisputeStatus, RefundStatus } from './booking-request.model';

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
  refundStatus: RefundStatus;
  cancellationRefundAmount: number | null;
  cancellationRequestedAt: string | null;
}

/** Mirrors Planura.Core.Application.Models.AdminBooking.AdminBookingFilterDto exactly. */
export interface AdminBookingFilter {
  search?: string;
  status?: BookingStatus;
  paymentStatus?: BookingPaymentStatus;
  disputeStatus?: DisputeStatus;
  refundStatus?: RefundStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

/** Mirrors Planura.Core.Application.Models.AdminBooking.CancellationRequestListItemDto exactly. */
export interface CancellationRequestListItem {
  bookingId: number;
  clientId: number;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  vendorId: number;
  vendorName: string | null;
  eventDate: string;
  agreedPrice: number | null;
  cancellationReason: string | null;
  cancellationRequestedAt: string | null;
  cancellationRefundPercent: number | null;
  cancellationRefundAmount: number | null;
}

/** Mirrors Planura.Core.Application.Models.AdminBooking.ApproveCancellationDto exactly. */
export interface ApproveCancellationRequest {
  amount?: number;
  note?: string;
}

/** Mirrors Planura.Core.Application.Models.AdminBooking.RejectCancellationDto exactly. */
export interface RejectCancellationRequest {
  note: string;
}

/** Mirrors Planura.Core.Application.Models.AdminBooking.PaymentTimelineEntryDto exactly. */
export interface PaymentTimelineEntry {
  paymentId: number;
  amount: number;
  status: number;
  paymentMethod: string | null;
  gatewayReference: string | null;
  authorizedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  refundedAt: string | null;
  refundedAmount: number | null;
  refundReason: string | null;
  createdAt: string;
}

/** Mirrors Planura.Core.Application.Models.AdminBooking.BookingStatusHistoryEntryDto exactly. */
export interface BookingStatusHistoryEntry {
  previousStatus: string | null;
  newStatus: string;
  changedByUserId: number | null;
  changedByName: string | null;
  notes: string | null;
  changedAt: string;
}

/** Mirrors Planura.Core.Application.Models.AdminBooking.AdminBookingPaymentDetailDto exactly. */
export interface AdminBookingPaymentDetail {
  bookingId: number;
  status: BookingStatus;
  eventDate: string;

  clientId: number;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;

  vendorId: number;
  vendorName: string | null;

  totalAmount: number | null;

  // Derived from the latest Payment row's own captured-amount fields on the backend (never from
  // paymentStatus below, which is only a coarse cache).
  amountPaid: number;
  remainingAmount: number;
  refundedAmount: number;

  paymentStatus: BookingPaymentStatus;

  refundStatus: RefundStatus;
  cancellationReason: string | null;
  cancellationRequestedAt: string | null;
  cancellationReviewNotes: string | null;
  cancellationRefundPercent: number | null;
  cancellationRefundAmount: number | null;
  cancelledAt: string | null;

  disputeStatus: DisputeStatus | null;
  disputedAt: string | null;
  resolutionNotes: string | null;

  paymentTimeline: PaymentTimelineEntry[];
  statusHistory: BookingStatusHistoryEntry[];
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
  /** 'Client' or 'Vendor' — either party can raise a dispute. Null for older records. */
  disputeRaisedBy: string | null;
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
