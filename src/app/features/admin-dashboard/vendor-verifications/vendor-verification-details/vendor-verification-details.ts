import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  VendorVerificationDetails,
  VendorVerificationDocument,
  VendorVerificationPortfolioMedia,
  VERIFICATION_DOCUMENT_LABELS,
} from '../../../../core/interfaces/vendor-verification.model';
import { VendorType } from '../../../../core/interfaces/vendor.model';
import { VendorVerificationService } from '../../../../core/services/vendor-verification.service';

/**
 * Read-only "View Details" panel for a vendor verification request: vendor
 * info, uploaded verification documents (with image previews) and portfolio
 * images. Presentational only — the parent owns the modal chrome, loading,
 * and fetch/error state (mirrors app-package-details' contract).
 */
@Component({
  selector: 'app-vendor-verification-details',
  standalone: true,
  imports: [Button, DatePipe, AlertBanner],
  templateUrl: './vendor-verification-details.html',
  styleUrl: './vendor-verification-details.css',
})
export class VendorVerificationDetailsView {
  private readonly verificationService = inject(VendorVerificationService);

  @Input() details: VendorVerificationDetails | null = null;
  @Input() loading = false;
  @Input() error: AppError | null = null;

  @Output() closed = new EventEmitter<void>();

  protected readonly VendorType = VendorType;

  protected documentLabel(doc: VendorVerificationDocument): string {
    return VERIFICATION_DOCUMENT_LABELS[doc.documentType] ?? 'Document';
  }

  protected documentUrl(doc: VendorVerificationDocument | VendorVerificationPortfolioMedia): string {
    return this.verificationService.resolveFileUrl(doc.fileUrl);
  }

  protected formatFileSize(bytes: number | null): string | null {
    if (bytes == null) {
      return null;
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
