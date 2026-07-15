/** Mirrors Planura.Core.Domain.Constants.VerificationStatus exactly. */
export const VERIFICATION_STATUS = {
  Unverified: 'unverified',
  Pending: 'pending',
  Verified: 'verified',
  Trusted: 'trusted',
  Rejected: 'rejected',
} as const;

/** Mirrors VerificationStatus.IsApproved: an approved vendor is verified or trusted. */
export function isApprovedVerificationStatus(status: string): boolean {
  return status === VERIFICATION_STATUS.Verified || status === VERIFICATION_STATUS.Trusted;
}

/**
 * Single source of truth for where a vendor lands based on their backend
 * verification status. Reused by vendor.guard.ts (session restore / direct
 * navigation) and auth-page.ts's navigateAfterAuth (post-login/registration)
 * so the mapping never has to be duplicated.
 */
export function resolveVendorLandingPath(status: string): string {
  if (isApprovedVerificationStatus(status)) {
    return '/vendor/dashboard';
  }
  if (status === VERIFICATION_STATUS.Rejected) {
    return '/vendor/verification-rejected';
  }
  return '/vendor/verification-pending';
}

/** Mirrors Planura.Core.Application.Models.VendorVerification.VendorVerificationHistoryDto exactly. */
export interface VendorVerificationHistoryEntry {
  vendorVerificationId: number;
  previousStatus: string | null;
  newStatus: string;
  changedByAdminName: string | null;
  notes: string | null;
  changedAt: string;
}

/** Mirrors Planura.Core.Application.Models.VendorVerification.ResubmitVerificationDto exactly. */
export interface ResubmitVerificationRequest {
  nationalIdFront: File;
  nationalIdBack: File;
  selfieWithId: File;
  commercialRegistration?: File;
  taxCard?: File;
}

/** Mirrors Planura.Core.Application.Models.VendorVerification.VendorVerificationStatusDto exactly. */
export interface VendorVerificationStatusResponse {
  vendorVerificationId: number;
  status: string;
  submittedAt: string | null;
}
