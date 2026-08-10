/** Mirrors Planura.Core.Domain.Enums.PaymentStatus (int-backed enum). */
export enum PaymentStatus {
  Pending = 1,
  Completed = 2,
  Failed = 3,
  Refunded = 4,
  Authorized = 5,
  Cancelled = 6,
  /** Deposit path: deposit captured on accept, remainder still owed. */
  DepositPaid_RemainderDue = 7,
  /** Deposit path: only the deposit is authorized (held) while awaiting vendor accept/reject. */
  DepositAuthorized = 8,
  /** Deposit path: remainder charged successfully — booking is paid in full. */
  FullyPaid = 9,
  /** Deposit path: the remainder charge failed (decline / SCA) — awaiting client payment or grace expiry. */
  RemainderFailed = 10,
  /** Deposit path: transient claim state while the remainder is being charged. */
  RemainderCharging = 11,
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
