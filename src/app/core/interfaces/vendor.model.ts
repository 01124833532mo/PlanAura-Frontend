/** Mirrors Planura.Core.Domain.Enums.VendorType (int-backed enum). */
export enum VendorType {
  Individual = 1,
  Business = 2,
}

/** Mirrors Planura.Core.Application.Models.ServiceCategoryDto. */
export interface ServiceCategory {
  id: number;
  nameEn: string;
  slug: string;
  iconUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

/**
 * Everything Planura.Core.Application.Models.RegisterVendorDto requires,
 * field-for-field. Built up across the onboarding wizard, then sent as a
 * single multipart/form-data POST to /api/auth/register/vendor exactly the
 * way AuthService.RegisterVendorAsync expects it (one atomic call — the
 * backend has no endpoint that creates a partial vendor account).
 */
export interface VendorRegistrationPayload {
  // Account (Identity)
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;

  // Business
  businessName: string;
  businessDescription?: string;
  categoryId?: number;
  city?: string;
  address?: string;
  vendorType: VendorType;

  // Verification documents
  nationalIdFront: File;
  nationalIdBack: File;
  selfieWithId: File;
  commercialRegistration?: File; // required only when vendorType === Business
  taxCard?: File; // required only when vendorType === Business

  // Portfolio
  portfolioImages: File[]; // at least 1 required, regardless of vendor type
}
