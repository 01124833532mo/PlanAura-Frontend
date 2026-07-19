import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  AdminVendorFilter,
  AdminVendorListItem,
  AdminVendorStatusCounts,
} from '../interfaces/admin-vendor.model';
import { PagedResult } from '../interfaces/paged-result.model';
import { toHttpParams } from '../../shared/utils/http-params';

/**
 * Wraps AdminVendorsController (Policy: AdminOnly, api/admin/vendors) — the
 * "All Vendors" roster covering every verification status. Detail and trust
 * promotion for a given vendor are served by VendorVerificationService
 * (getDetails / promoteToTrusted), which the backend also delegates to.
 */
@Injectable({ providedIn: 'root' })
export class AdminVendorService {
  private readonly http = inject(HttpClient);

  /** GET /api/admin/vendors */
  list(filter: AdminVendorFilter): Observable<PagedResult<AdminVendorListItem>> {
    return this.http.get<PagedResult<AdminVendorListItem>>(`${API_BASE_URL}/admin/vendors`, {
      params: toHttpParams(filter),
    });
  }

  /** GET /api/admin/vendors/status-counts */
  getStatusCounts(): Observable<AdminVendorStatusCounts> {
    return this.http.get<AdminVendorStatusCounts>(`${API_BASE_URL}/admin/vendors/status-counts`);
  }
}
