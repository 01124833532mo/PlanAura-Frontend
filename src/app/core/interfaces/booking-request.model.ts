/** Mirrors Planura.Core.Domain.Enums.BookingStatus (int-backed enum). */
export enum BookingStatus {
  Pending = 1,
  Accepted = 2,
  Rejected = 3,
  Cancelled = 4,
  Completed = 5,
  Expired = 6,
}

/** Mirrors Planura.Core.Domain.Enums.BookingPaymentStatus (int-backed enum). */
export enum BookingPaymentStatus {
  Unpaid = 1,
  Paid = 2,
  Refunded = 3,
}

/** Mirrors Planura.Core.Domain.Enums.DisputeStatus (int-backed enum). */
export enum DisputeStatus {
  Open = 1,
  Resolved = 2,
}

/** Mirrors Planura.Core.Application.Models.CreateBookingRequestDto. */
export interface CreateBookingRequest {
  eventPlanId: number;
  availabilityId: number;
  vendorPackageId?: number;
  guestCount?: number;
  clientMessage?: string;
  /** Stripe PaymentMethod id (pm_...) collected client-side via Stripe Elements. */
  paymentMethodId: string;
  /** Client-generated id, reused as the Stripe idempotency key to dedupe retried submits. */
  requestId: string;
}

/** Mirrors Planura.Core.Application.Models.BookingRequestDto. */
export interface BookingRequest {
  id: number;
  eventPlanId: number;
  clientId: number;
  vendorId: number;
  vendorPackageId: number | null;
  eventDate: string;
  guestCount: number | null;
  /** Server-derived from the package's BasePrice — never sent by the client. */
  agreedPrice: number | null;
  clientMessage: string | null;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  vendorResponse: string | null;
  respondedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  disputeStatus: DisputeStatus | null;
  disputedAt: string | null;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  /** Set once the AI-generated Event Booking Contract has been produced (on vendor accept). */
  contractId: string | null;
  contractDocumentUrl: string | null;
  contractGeneratedAt: string | null;
}

/** Mirrors Planura.Core.Application.Models.BookingRequestFilterDto. No eventPlanId filter exists server-side. */
export interface BookingRequestFilter {
  status?: BookingStatus;
  page?: number;
  pageSize?: number;
}

/** Mirrors Planura.Core.Application.Models.PagedResult<BookingRequestDto>. */
export interface PagedBookingRequestList {
  items: BookingRequest[];
  totalCount: number;
  page: number;
  pageSize: number;
}
