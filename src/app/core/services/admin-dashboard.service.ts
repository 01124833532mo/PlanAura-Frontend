import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { DashboardStatistics, RecentActivityItem } from '../interfaces/admin-dashboard.model';

/** Wraps AdminDashboardController (Policy: AdminOnly, api/admin/dashboard). */
@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);

  /** GET /api/admin/dashboard/statistics */
  getStatistics(): Observable<DashboardStatistics> {
    return this.http.get<DashboardStatistics>(`${API_BASE_URL}/admin/dashboard/statistics`);
  }

  /** GET /api/admin/dashboard/recent-activity?take=20 */
  getRecentActivity(take = 20): Observable<RecentActivityItem[]> {
    return this.http.get<RecentActivityItem[]>(`${API_BASE_URL}/admin/dashboard/recent-activity`, {
      params: { take },
    });
  }
}
