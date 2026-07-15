import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL, STATIC_BASE_URL } from '../config/app-config';
import {
  PendingVendorVerification,
  RejectVendorPayload,
  VendorVerificationDetails,
} from '../interfaces/vendor-verification.model';

/** Wraps Planura.Apis.Controllers.AdminVendorVerificationController (policy: AdminOnly). */
@Injectable({ providedIn: 'root' })
export class VendorVerificationService {
  private readonly http = inject(HttpClient);

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
