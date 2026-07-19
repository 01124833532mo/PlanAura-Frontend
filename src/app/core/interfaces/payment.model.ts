/** Mirrors Planura.Core.Domain.Enums.PaymentStatus (int-backed enum). */
export enum PaymentStatus {
  Pending = 1,
  Completed = 2,
  Failed = 3,
  Refunded = 4,
  Authorized = 5,
  Cancelled = 6,
}

/** Mirrors Planura.Core.Application.Models.PaymentDto. No currency field — the platform is single-currency. */
export interface PaymentTransaction {
  id: number;
  bookingRequestId: number;
  clientId: number;
  vendorId: number;
  amount: number;
  status: PaymentStatus;
  paymentMethod: string | null;
  gatewayReference: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  refundReason: string | null;
  createdAt: string;
}

/** Mirrors Planura.Core.Application.Models.TransactionsFilterDto. */
export interface TransactionsFilter {
  status?: PaymentStatus;
  page?: number;
  pageSize?: number;
}

/** Mirrors Planura.Core.Application.Models.PagedResult<PaymentDto>. */
export interface PagedPaymentTransactionList {
  items: PaymentTransaction[];
  totalCount: number;
  page: number;
  pageSize: number;
}
