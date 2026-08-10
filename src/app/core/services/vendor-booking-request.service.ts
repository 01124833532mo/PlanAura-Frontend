import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  BookingChatMessage,
  BookingRequest,
  BookingRequestFilter,
  BookingStatusHistoryEntry,
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
    if (filter.paymentStatus !== undefined) {
      params = params.set('paymentStatus', filter.paymentStatus);
    }
    if (filter.excludeRefunded) {
      params = params.set('excludeRefunded', true);
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

  /** GET /api/booking-requests/incoming/{id}/timeline — the permanent Booking Activity audit trail. */
  getTimeline(id: number): Observable<BookingStatusHistoryEntry[]> {
    return this.http.get<BookingStatusHistoryEntry[]>(
      `${API_BASE_URL}/booking-requests/incoming/${id}/timeline`,
    );
  }

  /**
   * POST /api/booking-requests/{id}/accept — captures the client's payment and
   * marks the request Accepted. Only valid while the request is Pending. The
   * vendor must have agreed to the Booking Agreement first (agreementAccepted).
   */
  accept(id: number): Observable<BookingRequest> {
    return this.http.post<BookingRequest>(`${API_BASE_URL}/booking-requests/${id}/accept`, {
      agreementAccepted: true,
    });
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

  /**
   * POST /api/booking-requests/incoming/{id}/dispute — raises a dispute with the
   * admin. Note the `incoming/` prefix: the client's equivalent sits on
   * {id}/dispute, and both controllers share the api/booking-requests route, so
   * the vendor action is namespaced to avoid an ambiguous route match.
   * Only valid on Accepted or Completed bookings with no open dispute.
   */
  disputeBooking(id: number, reason: string): Observable<BookingRequest> {
    return this.http.post<BookingRequest>(
      `${API_BASE_URL}/booking-requests/incoming/${id}/dispute`,
      { reason },
    );
  }

  /**
   * POST /api/booking-requests/incoming/{id}/messages — sends a message on this booking's
   * client/vendor chat thread. Only valid once this vendor has accepted the request.
   */
  sendChatMessage(id: number, content: string): Observable<BookingChatMessage> {
    return this.http.post<BookingChatMessage>(
      `${API_BASE_URL}/booking-requests/incoming/${id}/messages`,
      { content },
    );
  }

  /**
   * GET /api/booking-requests/incoming/{id}/messages — this booking's chat messages, oldest first.
   * Pass afterId (the last message id already held) to fetch only newer ones when polling.
   */
  getChatMessages(id: number, afterId?: number): Observable<BookingChatMessage[]> {
    let params = new HttpParams();
    if (afterId !== undefined) {
      params = params.set('afterId', afterId);
    }
    return this.http.get<BookingChatMessage[]>(
      `${API_BASE_URL}/booking-requests/incoming/${id}/messages`,
      { params },
    );
  }
}
