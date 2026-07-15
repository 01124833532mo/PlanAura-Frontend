import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  ResubmitVerificationRequest,
  VendorVerificationHistoryEntry,
  VendorVerificationStatusResponse,
} from '../interfaces/vendor-verification.model';

/**
 * Wraps the vendor-facing endpoints on VendorVerificationController
 * (Policy: VendorOnly, api/vendor-verifications).
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
}
