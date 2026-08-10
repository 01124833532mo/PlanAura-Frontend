import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  RecordVendorPayoutRequest,
  VendorFinancialFilter,
  VendorFinancialSummary,
  VendorPayout,
} from '../interfaces/admin-vendor-payout.model';
import { PagedResult } from '../interfaces/paged-result.model';
import { toHttpParams } from '../../shared/utils/http-params';

/** Wraps AdminVendorPayoutsController (Policy: AdminOnly, api/admin/vendor-payouts). */
@Injectable({ providedIn: 'root' })
export class AdminVendorPayoutService {
  private readonly http = inject(HttpClient);

  /** GET /api/admin/vendor-payouts */
  list(filter: VendorFinancialFilter): Observable<PagedResult<VendorFinancialSummary>> {
    return this.http.get<PagedResult<VendorFinancialSummary>>(`${API_BASE_URL}/admin/vendor-payouts`, {
      params: toHttpParams(filter),
    });
  }

  /** GET /api/admin/vendor-payouts/{vendorId} */
  getOne(vendorId: number): Observable<VendorFinancialSummary> {
    return this.http.get<VendorFinancialSummary>(`${API_BASE_URL}/admin/vendor-payouts/${vendorId}`);
  }

  /** GET /api/admin/vendor-payouts/{vendorId}/history */
  getHistory(vendorId: number): Observable<VendorPayout[]> {
    return this.http.get<VendorPayout[]>(`${API_BASE_URL}/admin/vendor-payouts/${vendorId}/history`);
  }

  /** POST /api/admin/vendor-payouts/{vendorId} */
  recordPayout(vendorId: number, request: RecordVendorPayoutRequest): Observable<VendorPayout> {
    return this.http.post<VendorPayout>(`${API_BASE_URL}/admin/vendor-payouts/${vendorId}`, request);
  }
}
