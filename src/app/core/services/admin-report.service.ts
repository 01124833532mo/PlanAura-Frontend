import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  MonthlyAmount,
  MonthlyCount,
  MonthlyRegistrations,
  TopCategory,
  TopVendor,
  VendorVerificationFunnel,
} from '../interfaces/admin-report.model';

/** Wraps AdminReportsController (Policy: AdminOnly, api/admin/reports). */
@Injectable({ providedIn: 'root' })
export class AdminReportService {
  private readonly http = inject(HttpClient);

  /** GET /api/admin/reports/users/registrations?months=12 */
  getUserRegistrations(months = 12): Observable<MonthlyRegistrations[]> {
    return this.http.get<MonthlyRegistrations[]>(
      `${API_BASE_URL}/admin/reports/users/registrations`,
      { params: { months } },
    );
  }

  /** GET /api/admin/reports/bookings/monthly?months=12 */
  getBookingsMonthly(months = 12): Observable<MonthlyCount[]> {
    return this.http.get<MonthlyCount[]>(`${API_BASE_URL}/admin/reports/bookings/monthly`, {
      params: { months },
    });
  }

  /** GET /api/admin/reports/payments/revenue?months=12 */
  getRevenueMonthly(months = 12): Observable<MonthlyAmount[]> {
    return this.http.get<MonthlyAmount[]>(`${API_BASE_URL}/admin/reports/payments/revenue`, {
      params: { months },
    });
  }

  /** GET /api/admin/reports/vendors/top?by=revenue&take=10 */
  getTopVendors(by: 'revenue' | 'bookings' = 'revenue', take = 10): Observable<TopVendor[]> {
    return this.http.get<TopVendor[]>(`${API_BASE_URL}/admin/reports/vendors/top`, {
      params: { by, take },
    });
  }

  /** GET /api/admin/reports/categories/top?by=vendors&take=10 */
  getTopCategories(
    by: 'vendors' | 'bookings' = 'vendors',
    take = 10,
  ): Observable<TopCategory[]> {
    return this.http.get<TopCategory[]>(`${API_BASE_URL}/admin/reports/categories/top`, {
      params: { by, take },
    });
  }

  /** GET /api/admin/reports/vendors/funnel */
  getVendorFunnel(): Observable<VendorVerificationFunnel> {
    return this.http.get<VendorVerificationFunnel>(`${API_BASE_URL}/admin/reports/vendors/funnel`);
  }
}
