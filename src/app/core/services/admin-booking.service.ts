import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  AdminBookingFilter,
  AdminBookingListItem,
  AdminDisputeDetails,
  AdminDisputeListItem,
  ResolveDisputeRequest,
} from '../interfaces/admin-booking.model';
import { PagedResult } from '../interfaces/paged-result.model';
import { toHttpParams } from '../../shared/utils/http-params';

/**
 * Wraps AdminBookingController (Policy: AdminOnly, api/admin/bookings) —
 * platform-wide booking list plus the open-disputes queue and resolution flow.
 */
@Injectable({ providedIn: 'root' })
export class AdminBookingService {
  private readonly http = inject(HttpClient);

  /** GET /api/admin/bookings */
  list(filter: AdminBookingFilter): Observable<PagedResult<AdminBookingListItem>> {
    return this.http.get<PagedResult<AdminBookingListItem>>(`${API_BASE_URL}/admin/bookings`, {
      params: toHttpParams(filter),
    });
  }

  /** GET /api/admin/bookings/disputes */
  getOpenDisputes(): Observable<AdminDisputeListItem[]> {
    return this.http.get<AdminDisputeListItem[]>(`${API_BASE_URL}/admin/bookings/disputes`);
  }

  /** GET /api/admin/bookings/disputes/{bookingId} */
  getDisputeDetails(bookingId: number): Observable<AdminDisputeDetails> {
    return this.http.get<AdminDisputeDetails>(
      `${API_BASE_URL}/admin/bookings/disputes/${bookingId}`,
    );
  }

  /** POST /api/admin/bookings/disputes/{bookingId}/resolve */
  resolveDispute(bookingId: number, request: ResolveDisputeRequest): Observable<void> {
    return this.http.post<void>(
      `${API_BASE_URL}/admin/bookings/disputes/${bookingId}/resolve`,
      request,
    );
  }
}
