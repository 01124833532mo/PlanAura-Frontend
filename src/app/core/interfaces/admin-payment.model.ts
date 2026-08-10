import { PaymentStatus } from './payment.model';

/** Mirrors Planura.Core.Application.Models.AdminPayment.AdminPaymentListItemDto exactly. */
export interface AdminPaymentListItem {
  paymentId: number;
  bookingRequestId: number;
  clientId: number;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  vendorId: number;
  vendorName: string | null;
  amount: number;

  // Derived from Payment.GetAmountCaptured()/TotalAmount on the backend, not from amount above (which is
  // deposit-only on the deposit path) — the correct "amount collected so far" figures for this payment.
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  refundedAmount: number;

  status: PaymentStatus;
  paymentMethod: string | null;
  gatewayReference: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
}

/** Mirrors Planura.Core.Application.Models.AdminPayment.AdminPaymentFilterDto exactly. */
export interface AdminPaymentFilter {
  status?: PaymentStatus;
  vendorId?: number;
  clientId?: number;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/** Mirrors Planura.Core.Application.Models.AdminPayment.AdminPaymentSummaryDto exactly. */
export interface AdminPaymentSummary {
  grossRevenue: number;
  refundedAmount: number;
  failedPaymentCount: number;
  pendingAuthorizationCount: number;
}

/** Mirrors Planura.Core.Application.Models.AdminPayment.RefundPaymentDto exactly. */
export interface RefundPaymentRequest {
  reason: string;
  /** Full refund when omitted; otherwise a partial refund amount in EGP. */
  amount?: number | null;
}
