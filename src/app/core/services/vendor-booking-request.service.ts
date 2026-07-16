import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  BookingRequest,
  BookingRequestFilter,
  PagedBookingRequestList,
} from '../interfaces/booking-request.model';

/**
 * Wraps the vendor-facing endpoints on VendorBookingRequestsController
 * (api/booking-requests, [Authorize(VendorOnly)]). The vendor is resolved
 * from the JWT server-side, so no vendor id is ever sent from the client.
 */
@Injectable({ providedIn: 'root' })
export class VendorBookingRequestService {
  private readonly http = inject(HttpClient);

  /**
   * GET /api/booking-requests/incoming — the vendor's incoming requests,
   * paged. pageSize defaults to 20 server-side (max 100) if omitted.
   */
  listIncoming(filter: BookingRequestFilter = {}): Observable<PagedBookingRequestList> {
    let params = new HttpParams();

    if (filter.status !== undefined) {
      params = params.set('status', filter.status);
    }
    if (filter.page !== undefined) {
      params = params.set('page', filter.page);
    }
    if (filter.pageSize !== undefined) {
      params = params.set('pageSize', filter.pageSize);
    }

    return this.http.get<PagedBookingRequestList>(`${API_BASE_URL}/booking-requests/incoming`, {
      params,
    });
  }

  /** GET /api/booking-requests/incoming/{id} */
  getIncoming(id: number): Observable<BookingRequest> {
    return this.http.get<BookingRequest>(`${API_BASE_URL}/booking-requests/incoming/${id}`);
  }

  /**
   * POST /api/booking-requests/{id}/accept — captures the client's payment and
   * marks the request Accepted. Only valid while the request is Pending.
   */
  accept(id: number): Observable<BookingRequest> {
    return this.http.post<BookingRequest>(`${API_BASE_URL}/booking-requests/${id}/accept`, {});
  }

  /**
   * POST /api/booking-requests/{id}/reject — declines the request. The reason
   * is optional (RejectBookingRequestDto.Reason is nullable). Only valid while
   * the request is Pending.
   */
  reject(id: number, reason?: string): Observable<BookingRequest> {
    return this.http.post<BookingRequest>(`${API_BASE_URL}/booking-requests/${id}/reject`, {
      reason: reason ?? null,
    });
  }
}
