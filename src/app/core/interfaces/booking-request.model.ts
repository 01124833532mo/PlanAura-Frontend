/** Mirrors Planura.Core.Domain.Enums.BookingStatus (int-backed enum). */
export enum BookingStatus {
  Pending = 1,
  Accepted = 2,
  Rejected = 3,
  Cancelled = 4,
  Completed = 5,
  Expired = 6,
  /** The event's slot has ended; the client is asked to confirm the service was delivered. */
  AwaitingConfirmation = 7,
  /** The client requested to cancel an Accepted booking; an admin has not yet decided. */
  CancellationRequested = 8,
}

/** Mirrors Planura.Core.Domain.Enums.BookingPaymentStatus (int-backed enum). */
export enum BookingPaymentStatus {
  Unpaid = 1,
  Paid = 2,
  Refunded = 3,
  /** Deposit path: the deposit was captured on accept; the remainder is still owed. */
  DepositPaid = 4,
  /** Deposit path: the automatic remainder charge failed; awaiting client payment or grace expiry. */
  RemainderFailed = 5,
}

/** Mirrors Planura.Core.Domain.Enums.RefundStatus (int-backed enum). */
export enum RefundStatus {
  None = 1,
  PendingReview = 2,
  Processed = 3,
  Rejected = 4,
}

/** Mirrors Planura.Core.Domain.Enums.DisputeStatus (int-backed enum). */
export enum DisputeStatus {
  Open = 1,
  Resolved = 2,
}

/**
 * Mirrors Planura.Core.Application.Models.ClientRequirementsDto.
 *
 * What this client specifically wants from this booking. These reach the AI that drafts the Booking
 * Agreement, and are the main reason two clients booking the same package get materially different
 * contracts. Every field is optional; anything left blank is omitted from the contract rather than
 * filled in with a default.
 */
export interface ClientRequirements {
  deliverables?: string;
  stylePreferences?: string;
  timingRequirements?: string;
  locationDetails?: string;
  specialRequests?: string;
}

/** Mirrors Planura.Core.Application.Models.CreateBookingRequestDto. */
export interface CreateBookingRequest {
  eventPlanId: number;
  availabilityId: number;
  vendorPackageId?: number;
  guestCount?: number;
  clientMessage?: string;
  requirements?: ClientRequirements;
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
  requirements?: ClientRequirements;
}

/** Mirrors Planura.Core.Domain.Enums.PaymentStatus (int-backed enum). */
export enum PaymentStatus {
  Pending = 1,
  Completed = 2,
  Failed = 3,
  Refunded = 4,
  /** Card hold placed at booking; nothing charged yet. */
  Authorized = 5,
  Cancelled = 6,
  /** Deposit captured on vendor accept; the balance is outstanding. */
  DepositPaid_RemainderDue = 7,
  /** Deposit-path counterpart of Authorized — only the deposit is held. */
  DepositAuthorized = 8,
}

/**
 * Mirrors Planura.Core.Application.Models.BookingPaymentQuoteDto.
 *
 * The server's pricing of a booking that has not been submitted yet. Every figure is computed by
 * BookingService.ResolvePaymentPlan — never recomputed here, so checkout cannot drift from the
 * amount actually charged.
 */
export interface BookingPaymentQuote {
  currency: string;
  totalAmount: number;
  amountDueNow: number;
  remainingAmount: number;
  isDeposit: boolean;
  depositPercentage: number | null;
  daysUntilEvent: number;
  fullPaymentThresholdDays: number;
  vendorResponseWindowHours: number;
  /** False today: the deposit split exists but no automatic remainder collection does. */
  remainderCollectionScheduled: boolean;
}

/**
 * Mirrors Planura.Core.Application.Models.BookingPaymentSummaryDto.
 *
 * `amountAuthorized` and `amountPaid` are deliberately separate: Planura holds the card at booking
 * and only captures when the vendor accepts, so for the whole pending window money is held but not
 * taken. Never present an authorized amount as paid.
 */
export interface BookingPaymentSummary {
  paymentId: number;
  currency: string;
  totalAmount: number;
  amountAuthorized: number;
  amountPaid: number;
  remainingAmount: number;
  isDeposit: boolean;
  depositAmount: number | null;
  remainderCollectionScheduled: boolean;
  status: PaymentStatus;
  reference: string | null;
  authorizedAt: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
}

/** Mirrors Planura.Core.Application.Models.BookingPaymentQuoteRequestDto. */
export interface BookingPaymentQuoteRequest {
  eventPlanId: number;
  availabilityId: number;
  vendorPackageId?: number;
  guestCount?: number;
}

/** Mirrors Planura.Core.Application.Models.AgreementPreviewResultDto. */
export interface AgreementPreviewResult {
  token: string;
  contractId: string;
  /** Absolute URL of the generated agreement PDF, for the embedded viewer. */
  documentUrl: string;
  generatedAt: string;
  /** The same pricing the contract was drafted against. */
  paymentPlan: BookingPaymentQuote;
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
  /** Deposit split (Phase 3) — surfaced for the cancel warning. isDeposit false / amounts null on the full-payment path. */
  isDeposit: boolean;
  depositAmount: number | null;
  totalAmount: number | null;
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

  /** Set when the booking enters AwaitingConfirmation — the clock the auto-confirm grace window counts from. */
  awaitingConfirmationSince: string | null;

  /** Client-requested cancellation of an Accepted booking, pending admin review. */
  cancellationReason: string | null;
  cancellationRequestedAt: string | null;
  cancellationReviewNotes: string | null;
  cancellationReviewedAt: string | null;
  cancellationRefundPercent: number | null;
  cancellationRefundAmount: number | null;
  refundStatus: RefundStatus;

  /** The booked slot's exact start/end — lets any "date" display also show the time. */
  slotStartAt: string | null;
  slotEndAt: string | null;

  /**
   * The booking's real financial state. Null only when no payment row exists. Use this rather than
   * `agreedPrice` whenever showing what has been held, charged, or is still outstanding.
   */
  payment: BookingPaymentSummary | null;

  /** Non-null only once the client has left a review for this (Completed) booking. */
  reviewId: number | null;
  reviewRating: number | null;
  reviewComment: string | null;
}

/** Mirrors Planura.Core.Application.Models.AdminBooking.BookingStatusHistoryEntryDto. The permanent
 * "Booking Activity" audit trail for a booking — the source of truth for outcomes, independent of
 * any (best-effort) notification. */
export interface BookingStatusHistoryEntry {
  previousStatus: string | null;
  newStatus: string;
  changedByUserId: number | null;
  changedByName: string | null;
  notes: string | null;
  changedAt: string;
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

/** Mirrors Planura.Core.Application.Models.PayRemainderResultDto — the result of a client on-session
 * "pay remainder now". When requiresAction is true, complete SCA with clientSecret (Stripe.js
 * confirmCardPayment); success is finalized server-side via webhook. */
export interface PayRemainderResult {
  /** Stripe PaymentIntent status: "succeeded" | "requires_action" | ... */
  status: string;
  paymentIntentId: string;
  /** Present when requiresAction is true — pass to Stripe.js to complete 3-D Secure. */
  clientSecret: string | null;
  requiresAction: boolean;
}

/** Mirrors Planura.Core.Application.Models.PaymentPreviewDto — the full-vs-deposit split shown before the
 * client pays, so booking-create can show the deposit breakdown. Computed server-side (source of truth). */
export interface PaymentPreview {
  isDeposit: boolean;
  depositAmount: number;
  totalAmount: number;
  remainderAmount: number;
  /** Date the remainder is auto-charged (event date − lead days); null on the full-payment path. "yyyy-MM-dd". */
  remainderChargeDate: string | null;
  currency: string;
}

/** Mirrors Planura.Core.Application.Models.CancellationQuoteDto. */
export interface CancellationQuote {
  daysUntilEvent: number;
  refundPercent: number;
  refundAmount: number;
}

/** Mirrors Planura.Core.Application.Models.PagedResult<BookingRequestDto>. */
export interface PagedBookingRequestList {
  items: BookingRequest[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Mirrors Planura.Core.Application.Models.BookingChatMessageDto — one message on the booking's
 * client/vendor chat thread, unlocked once the vendor has accepted (see BookingRequest.vendorAgreedAt).
 */
export interface BookingChatMessage {
  id: number;
  bookingRequestId: number;
  senderUserId: number;
  senderName: string;
  isMine: boolean;
  content: string;
  createdAt: string;
}
