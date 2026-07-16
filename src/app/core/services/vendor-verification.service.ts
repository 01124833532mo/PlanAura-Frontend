import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, STATIC_BASE_URL } from '../config/app-config';
import {
  PendingVendorVerification,
  RejectVendorPayload,
  ResubmitVerificationRequest,
  VendorVerificationDetails,
  VendorVerificationHistoryEntry,
  VendorVerificationStatusResponse,
} from '../interfaces/vendor-verification.model';

/**
 * Wraps the vendor-facing endpoints on VendorVerificationController
 * (Policy: VendorOnly, api/vendor-verifications) and the admin-facing
 * endpoints on AdminVendorVerificationController (Policy: AdminOnly).
 */
@Injectable({ providedIn: 'root' })
export class VendorVerificationService {
  private readonly http = inject(HttpClient);

  /** GET /api/vendor-verifications/me/history */
  getMyHistory(): Observable<VendorVerificationHistoryEntry[]> {
    return this.http.get<VendorVerificationHistoryEntry[]>(
      `${API_BASE_URL}/vendor-verifications/me/history`,
    );
  }

  /**
   * POST /api/vendor-verifications/me/resubmit — only accepted by the
   * backend when the vendor's current verification status is Rejected.
   */
  resubmitVerification(
    request: ResubmitVerificationRequest,
  ): Observable<VendorVerificationStatusResponse> {
    const formData = new FormData();

    formData.append('nationalIdFront', request.nationalIdFront);
    formData.append('nationalIdBack', request.nationalIdBack);
    formData.append('selfieWithId', request.selfieWithId);
    if (request.commercialRegistration) {
      formData.append('commercialRegistration', request.commercialRegistration);
    }
    if (request.taxCard) {
      formData.append('taxCard', request.taxCard);
    }

    return this.http.post<VendorVerificationStatusResponse>(
      `${API_BASE_URL}/vendor-verifications/me/resubmit`,
      formData,
    );
  }

  /** GET /api/admin/vendor-verifications/pending */
  getPending(): Observable<PendingVendorVerification[]> {
    return this.http.get<PendingVendorVerification[]>(
      `${API_BASE_URL}/admin/vendor-verifications/pending`,
    );
  }

  /** GET /api/admin/vendor-verifications/{vendorId} */
  getDetails(vendorId: number): Observable<VendorVerificationDetails> {
    return this.http.get<VendorVerificationDetails>(
      `${API_BASE_URL}/admin/vendor-verifications/${vendorId}`,
    );
  }

  /** POST /api/admin/vendor-verifications/approve */
  approve(vendorId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API_BASE_URL}/admin/vendor-verifications/approve`,
      { vendorId },
    );
  }

  /** POST /api/admin/vendor-verifications/reject */
  reject(payload: RejectVendorPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API_BASE_URL}/admin/vendor-verifications/reject`,
      payload,
    );
  }

  /**
   * Verification document/portfolio FileUrl values come back as paths
   * relative to the API server's static root ("images/..."), not fully
   * qualified URLs. Resolves either shape into something an <img> can load.
   */
  resolveFileUrl(fileUrl: string): string {
    if (/^https?:\/\//i.test(fileUrl)) {
      return fileUrl;
    }
    return `${STATIC_BASE_URL}/${fileUrl.replace(/^\/+/, '')}`;
  }
}