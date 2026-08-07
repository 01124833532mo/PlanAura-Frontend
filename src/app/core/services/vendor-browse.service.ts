import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { PagedVendorList, VendorBrowseFilter } from '../interfaces/vendor-browse.model';

/** Wraps GET /api/vendors (ClientOnly) — VendorController.BrowseVendors. */
@Injectable({ providedIn: 'root' })
export class VendorBrowseService {
  private readonly http = inject(HttpClient);

  list(filter: VendorBrowseFilter): Observable<PagedVendorList> {
    let params = new HttpParams();

    if (filter.category) {
      params = params.set('category', filter.category);
    }
    if (filter.city) {
      params = params.set('city', filter.city);
    }
    if (filter.minPrice !== undefined) {
      params = params.set('minPrice', filter.minPrice);
    }
    if (filter.maxPrice !== undefined) {
      params = params.set('maxPrice', filter.maxPrice);
    }
    if (filter.minRating !== undefined) {
      params = params.set('minRating', filter.minRating);
    }
    if (filter.availableOn) {
      params = params.set('availableOn', filter.availableOn);
    }
    // "featured" is the backend's own default sort when omitted — no need to send it.
    if (filter.sortBy && filter.sortBy !== 'featured') {
      params = params.set('sortBy', filter.sortBy);
    }
    if (filter.page !== undefined) {
      params = params.set('page', filter.page);
    }
    if (filter.pageSize !== undefined) {
      params = params.set('pageSize', filter.pageSize);
    }

    return this.http.get<PagedVendorList>(`${API_BASE_URL}/vendors`, { params });
  }
}
