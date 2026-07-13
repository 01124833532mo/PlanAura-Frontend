import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  CreateVendorPackagePayload,
  UpdateVendorPackagePayload,
  VendorPackage,
  VendorPackageSearchQuery,
} from '../interfaces/vendor-package.model';

/**
 * Wraps the vendor-facing endpoints on VendorPackagesController
 * ([Authorize], api/VendorPackages).
 */
@Injectable({ providedIn: 'root' })
export class VendorPackageService {
  private readonly http = inject(HttpClient);

  /** GET /api/vendorpackages/by-vendor/{vendorId} */
  getByVendor(vendorId: number, activeOnly = false): Observable<VendorPackage[]> {
    return this.http.get<VendorPackage[]>(
      `${API_BASE_URL}/vendorpackages/by-vendor/${vendorId}`,
      { params: { activeOnly } },
    );
  }

  /** GET /api/vendorpackages/{id} */
  getById(id: number): Observable<VendorPackage> {
    return this.http.get<VendorPackage>(`${API_BASE_URL}/vendorpackages/${id}`);
  }

  /** GET /api/vendorpackages/search */
  search(query: VendorPackageSearchQuery): Observable<VendorPackage[]> {
    const params: Record<string, string | number | boolean> = {};
    if (query.title) {
      params['title'] = query.title;
    }
    if (query.categoryId !== undefined) {
      params['categoryId'] = query.categoryId;
    }
    if (query.activeOnly !== undefined) {
      params['activeOnly'] = query.activeOnly;
    }

    return this.http.get<VendorPackage[]>(`${API_BASE_URL}/vendorpackages/search`, { params });
  }

  /** POST /api/vendorpackages */
  create(payload: CreateVendorPackagePayload): Observable<VendorPackage> {
    return this.http.post<VendorPackage>(`${API_BASE_URL}/vendorpackages`, payload);
  }

  /** PUT /api/vendorpackages/{id} */
  update(id: number, payload: UpdateVendorPackagePayload): Observable<VendorPackage> {
    return this.http.put<VendorPackage>(`${API_BASE_URL}/vendorpackages/${id}`, payload);
  }

  /** DELETE /api/vendorpackages/{id} */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/vendorpackages/${id}`);
  }
}
