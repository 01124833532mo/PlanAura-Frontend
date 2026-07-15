import { VendorType } from './vendor.model';

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

/**
 * Mirrors Planura.Core.Application.Models.VendorVerification.VendorDetailsDto.
 *
 * NOTE: the backend DTO does not currently expose the vendor's email or phone
 * number (only VendorName, which is the account holder's full name). The UI
 * renders those fields as "Not provided by API" rather than omitting them, so
 * the layout matches the spec and is ready the moment the backend adds them.
 */
export interface VendorVerificationDetails {
  vendorId: number;
  vendorName: string;
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
