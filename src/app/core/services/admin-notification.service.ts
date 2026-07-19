import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { BroadcastNotificationRequest } from '../interfaces/admin-account.model';

/** Wraps AdminNotificationsController (Policy: AdminOnly, api/admin/notifications). */
@Injectable({ providedIn: 'root' })
export class AdminNotificationService {
  private readonly http = inject(HttpClient);

  /** POST /api/admin/notifications/broadcast */
  broadcast(request: BroadcastNotificationRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${API_BASE_URL}/admin/notifications/broadcast`,
      request,
    );
  }
}
