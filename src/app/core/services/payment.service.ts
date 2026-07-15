import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  InitiatePaymentResult,
  PagedPaymentTransactionList,
  PaymentOptions,
  TransactionsFilter,
} from '../interfaces/payment.model';

/** Wraps the client-facing endpoints on PaymentsController (ClientOnly). */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

  /** GET /api/booking-requests/{id}/payment-options */
  getPaymentOptions(bookingId: number): Observable<PaymentOptions> {
    return this.http.get<PaymentOptions>(
      `${API_BASE_URL}/booking-requests/${bookingId}/payment-options`,
    );
  }

  /** POST /api/booking-requests/{id}/payments — InitiatePaymentDto has no fields, but a JSON body is still required. */
  initiatePayment(bookingId: number): Observable<InitiatePaymentResult> {
    return this.http.post<InitiatePaymentResult>(
      `${API_BASE_URL}/booking-requests/${bookingId}/payments`,
      {},
    );
  }

  /** GET /api/payments/my-transactions */
  getMyTransactions(filter: TransactionsFilter = {}): Observable<PagedPaymentTransactionList> {
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

    return this.http.get<PagedPaymentTransactionList>(
      `${API_BASE_URL}/payments/my-transactions`,
      { params },
    );
  }
}
