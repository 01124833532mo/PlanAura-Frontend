import { VendorType } from './vendor.model';

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

/** Mirrors Planura.Core.Domain.Enums.VerificationDocumentType (int-backed enum). */
export enum VerificationDocumentType {
  NationalIdFront = 0,
  NationalIdBack = 1,
  SelfieWithId = 2,
  NationalId = 3,
  CommercialRegistration = 4,
  TaxCard = 5,
}

/** Human-readable labels for VerificationDocumentType, keyed by enum value. */
export const VERIFICATION_DOCUMENT_LABELS: Record<VerificationDocumentType, string> = {
  [VerificationDocumentType.NationalIdFront]: 'National ID (Front)',
  [VerificationDocumentType.NationalIdBack]: 'National ID (Back)',
  [VerificationDocumentType.SelfieWithId]: 'Selfie with ID',
  [VerificationDocumentType.NationalId]: 'National ID',
  [VerificationDocumentType.CommercialRegistration]: 'Commercial Registration',
  [VerificationDocumentType.TaxCard]: 'Tax Card',
};

/** Mirrors Planura.Core.Application.Models.VendorVerification.PendingVendorDto. */
export interface PendingVendorVerification {
  vendorId: number;
  vendorName: string;
  businessName: string;
  vendorType: VendorType;
  categoryName: string | null;
  submittedAt: string | null;
  status: string;
}

/** Mirrors Planura.Core.Application.Models.VendorVerification.VendorDocumentDto. */
export interface VendorVerificationDocument {
  documentType: VerificationDocumentType;
  fileUrl: string;
  originalFileName: string | null;
  contentType: string | null;
  fileSizeBytes: number | null;
}

/** Mirrors Planura.Core.Application.Models.VendorVerification.PortfolioMediaDto. */
export interface VendorVerificationPortfolioMedia {
  fileUrl: string;
  title: string | null;
  displayOrder: number;
}

/** Mirrors Planura.Core.Application.Models.VendorVerification.VendorDetailsDto. */
export interface VendorVerificationDetails {
  vendorId: number;
  vendorName: string;
  email: string | null;
  phoneNumber: string | null;
  businessName: string;
  businessDescription: string | null;
  vendorType: VendorType;
  categoryName: string | null;
  city: string | null;
  address: string | null;
  verificationStatus: string;
  submittedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  documents: VendorVerificationDocument[];
  portfolioMedia: VendorVerificationPortfolioMedia[];
}

/** Body for POST /api/admin/vendor-verifications/reject (RejectVendorDto). */
export interface RejectVendorPayload {
  vendorId: number;
  rejectionReason: string;
}