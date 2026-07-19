import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  AdminPaymentFilter,
  AdminPaymentListItem,
  AdminPaymentSummary,
  RefundPaymentRequest,
} from '../interfaces/admin-payment.model';
import { PaymentTransaction } from '../interfaces/payment.model';
import { PagedResult } from '../interfaces/paged-result.model';
import { toHttpParams } from '../../shared/utils/http-params';

/** Wraps AdminPaymentsController (Policy: AdminOnly, api/admin/payments). */
@Injectable({ providedIn: 'root' })
export class AdminPaymentService {
  private readonly http = inject(HttpClient);

  /** GET /api/admin/payments */
  list(filter: AdminPaymentFilter): Observable<PagedResult<AdminPaymentListItem>> {
    return this.http.get<PagedResult<AdminPaymentListItem>>(`${API_BASE_URL}/admin/payments`, {
      params: toHttpParams(filter),
    });
  }

  /** GET /api/admin/payments/summary */
  getSummary(): Observable<AdminPaymentSummary> {
    return this.http.get<AdminPaymentSummary>(`${API_BASE_URL}/admin/payments/summary`);
  }

  /** POST /api/admin/payments/{paymentId}/refund */
  refund(paymentId: number, request: RefundPaymentRequest): Observable<PaymentTransaction> {
    return this.http.post<PaymentTransaction>(
      `${API_BASE_URL}/admin/payments/${paymentId}/refund`,
      request,
    );
  }
}
