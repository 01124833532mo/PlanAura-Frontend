/** Mirrors Planura.Core.Domain.Constants.NotificationTypes exactly. */
export const NotificationType = {
  VendorSubmitted: 'vendor_submitted',
  VendorPendingReview: 'vendor_pending_review',
  VendorApproved: 'vendor_approved',
  VendorRejected: 'vendor_rejected',
  VendorResubmitted: 'vendor_resubmitted',
  BookingRequestReceived: 'booking_request_received',
  BookingCancelled: 'booking_cancelled',
  BookingAccepted: 'booking_accepted',
  BookingRejected: 'booking_rejected',
  PaymentSuccessful: 'payment_successful',
  PaymentReceived: 'payment_received',
  PaymentFailed: 'payment_failed',
  BookingRequestExpired: 'booking_request_expired',
  ContractGenerated: 'contract_generated',
  PartnershipAgreementGenerated: 'partnership_agreement_generated',
  PartnershipAgreementPendingReview: 'partnership_agreement_pending_review',
} as const;

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType];

/** Mirrors Planura.Core.Application.Models.Notification.NotificationDto exactly. */
export interface AppNotification {
  id: number;
  type: string | null;
  title: string | null;
  body: string | null;
  /** Optional pre-serialized JSON payload — parse with parseNotificationData<T>. */
  dataJson: string | null;
  isRead: boolean;
  createdAt: string;
}

/** Shape of dataJson for ContractGenerated notifications sent to the client. */
export interface ContractGeneratedClientData {
  bookingId: number;
  vendorName: string;
  eventDate: string;
  contractUrl: string;
}

/** Shape of dataJson for ContractGenerated notifications sent to the vendor. */
export interface ContractGeneratedVendorData {
  bookingId: number;
  contractUrl: string;
}

/** Shape of dataJson for PartnershipAgreementGenerated notifications sent to the vendor. */
export interface PartnershipAgreementGeneratedData {
  vendorId: number;
  agreementUrl: string;
}

/** Shape of dataJson for PartnershipAgreementPendingReview notifications sent to admins. */
export interface PartnershipAgreementReviewData {
  vendorId: number;
  vendorName: string;
  bookingId: number;
  generatedAt: string;
  agreementUrl: string;
}

/** Shape of dataJson for plain BookingAccepted fallback notifications (no contract). */
export interface BookingAcceptedData {
  bookingId: number;
}

/** Safely parses a notification's dataJson payload; returns null if absent or malformed. */
export function parseNotificationData<T>(notification: AppNotification): T | null {
  if (!notification.dataJson) {
    return null;
  }
  try {
    return JSON.parse(notification.dataJson) as T;
  } catch {
    return null;
  }
}
