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
  /** Token from the agreement-preview step, binding the reviewed Booking Agreement to this booking. */
  agreementToken: string;
  /** The client ticked "I have read and agree to the Booking Agreement". */
  agreementAccepted: boolean;
}

/** Mirrors Planura.Core.Application.Models.AgreementPreviewRequestDto. */
export interface AgreementPreviewRequest {
  eventPlanId: number;
  availabilityId: number;
  vendorPackageId?: number;
  guestCount?: number;
  clientMessage?: string;
}

/** Mirrors Planura.Core.Application.Models.AgreementPreviewResultDto. */
export interface AgreementPreviewResult {
  token: string;
  contractId: string;
  /** Absolute URL of the generated agreement PDF, for the embedded viewer. */
  documentUrl: string;
  generatedAt: string;
}

/** Mirrors Planura.Core.Application.Models.BookingRequestDto. */
export interface BookingRequest {
  id: number;
  eventPlanId: number;
  clientId: number;
  clientName: string | null;
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
  /** The AI-generated Event Booking Contract — produced at the client's payment step and reviewed by both parties. */
  contractId: string | null;
  contractDocumentUrl: string | null;
  contractGeneratedAt: string | null;

  /** When each party accepted the Booking Agreement (the consent gate before their action). */
  clientAgreedAt: string | null;
  vendorAgreedAt: string | null;

  /** Non-null only once the client has left a review for this (Completed) booking. */
  reviewId: number | null;
  reviewRating: number | null;
  reviewComment: string | null;
}

/** Mirrors Planura.Core.Application.Models.BookingRequestFilterDto. No eventPlanId filter exists server-side. */
export interface BookingRequestFilter {
  status?: BookingStatus;
  /**
   * Independent of `status` — a refund never changes BookingStatus, so this is
   * the only way to list refunded bookings. Vendor endpoint only.
   */
  paymentStatus?: BookingPaymentStatus;
  /**
   * Drops refunded bookings. Needed on every status tab: a refund doesn't change
   * BookingStatus, so an Accepted-then-refunded booking would otherwise still
   * show under Accepted. Vendor endpoint only.
   */
  excludeRefunded?: boolean;
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
