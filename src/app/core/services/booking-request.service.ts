import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  AgreementPreviewRequest,
  AgreementPreviewResult,
  BookingPaymentQuote,
  BookingPaymentQuoteRequest,
  BookingRequest,
  BookingRequestFilter,
  BookingStatusHistoryEntry,
  CancellationQuote,
  CreateBookingRequest,
  PagedBookingRequestList,
} from '../interfaces/booking-request.model';

/** Wraps the client-facing endpoints on BookingRequestsController (ClientOnly). */
@Injectable({ providedIn: 'root' })
export class BookingRequestService {
  private readonly http = inject(HttpClient);

  /**
   * POST /api/booking-requests/payment-quote — the server's pricing for the booking as configured so
   * far: total, amount due now, remaining balance. Cheap and AI-free, unlike previewAgreement, so it
   * can be called as soon as a slot is picked to show real figures before the contract is drafted.
   */
  paymentQuote(dto: BookingPaymentQuoteRequest): Observable<BookingPaymentQuote> {
    return this.http.post<BookingPaymentQuote>(`${API_BASE_URL}/booking-requests/payment-quote`, dto);
  }

  /**
   * POST /api/booking-requests/agreement-preview — generates the Booking Agreement for the current
   * (fixed) payment-step details and returns a token to bind it on createBooking. Called when the
   * client reaches the payment step so they can review and agree before confirming.
   */
  previewAgreement(dto: AgreementPreviewRequest): Observable<AgreementPreviewResult> {
    return this.http.post<AgreementPreviewResult>(
      `${API_BASE_URL}/booking-requests/agreement-preview`,
      dto,
    );
  }

  /** POST /api/booking-requests */
  createBooking(dto: CreateBookingRequest): Observable<BookingRequest> {
    return this.http.post<BookingRequest>(`${API_BASE_URL}/booking-requests`, dto);
  }

  /**
   * GET /api/booking-requests — no eventPlanId filter exists server-side, so
   * callers that need a single plan's bookings must filter the result
   * client-side. pageSize defaults to 20 server-side (max 100) if omitted.
   */
  listMyBookings(filter: BookingRequestFilter = {}): Observable<PagedBookingRequestList> {
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

    return this.http.get<PagedBookingRequestList>(`${API_BASE_URL}/booking-requests`, { params });
  }

  /** GET /api/booking-requests/{id} */
  getBooking(id: number): Observable<BookingRequest> {
    return this.http.get<BookingRequest>(`${API_BASE_URL}/booking-requests/${id}`);
  }

  /** GET /api/booking-requests/{id}/timeline — the permanent Booking Activity audit trail. */
  getTimeline(id: number): Observable<BookingStatusHistoryEntry[]> {
    return this.http.get<BookingStatusHistoryEntry[]>(`${API_BASE_URL}/booking-requests/${id}/timeline`);
  }

  /** PATCH /api/booking-requests/{id}/cancel — Pending bookings only, cancels immediately. */
  cancelBooking(id: number): Observable<BookingRequest> {
    return this.http.patch<BookingRequest>(`${API_BASE_URL}/booking-requests/${id}/cancel`, {});
  }

  /** GET /api/booking-requests/{id}/cancellation-quote — estimated refund for an Accepted booking. */
  getCancellationQuote(id: number): Observable<CancellationQuote> {
    return this.http.get<CancellationQuote>(`${API_BASE_URL}/booking-requests/${id}/cancellation-quote`);
  }

  /**
   * POST /api/booking-requests/{id}/request-cancellation — requests cancellation of an Accepted
   * booking. Does not cancel it immediately: moves it to CancellationRequested pending admin
   * approval.
   */
  requestCancellation(id: number, reason: string): Observable<BookingRequest> {
    return this.http.post<BookingRequest>(`${API_BASE_URL}/booking-requests/${id}/request-cancellation`, {
      reason,
    });
  }

  /** POST /api/booking-requests/{id}/confirm-completion — confirms service delivery, completing an AwaitingConfirmation booking. */
  confirmCompletion(id: number): Observable<BookingRequest> {
    return this.http.post<BookingRequest>(`${API_BASE_URL}/booking-requests/${id}/confirm-completion`, {});
  }

  /** POST /api/booking-requests/{id}/dispute */
  disputeBooking(id: number, reason: string): Observable<BookingRequest> {
    return this.http.post<BookingRequest>(`${API_BASE_URL}/booking-requests/${id}/dispute`, {
      reason,
    });
  }
}
