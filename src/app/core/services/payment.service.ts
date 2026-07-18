import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { PagedPaymentTransactionList, TransactionsFilter } from '../interfaces/payment.model';

/**
 * Wraps the client-facing endpoints on PaymentsController (ClientOnly).
 * getPaymentOptions()/initiatePayment() were removed along with them —
 * payment is now authorized at booking-request creation time (see
 * BookingRequestService.createBooking), not as a separate post-acceptance step.
 */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);

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
