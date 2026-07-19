import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { AccountStatus, AdminAccount, CreateAdminRequest } from '../interfaces/admin-account.model';

/**
 * Wraps AdminAdminsController (api/admin/admins — list/create additional
 * admins) and the role-agnostic AdminAccountsController (api/admin/users —
 * suspend/reactivate any account, including admins).
 */
@Injectable({ providedIn: 'root' })
export class AdminAccountService {
  private readonly http = inject(HttpClient);

  /** GET /api/admin/admins */
  listAdmins(): Observable<AdminAccount[]> {
    return this.http.get<AdminAccount[]>(`${API_BASE_URL}/admin/admins`);
  }

  /** POST /api/admin/admins */
  createAdmin(request: CreateAdminRequest): Observable<AdminAccount> {
    return this.http.post<AdminAccount>(`${API_BASE_URL}/admin/admins`, request);
  }

  /** POST /api/admin/users/{userId}/suspend */
  suspend(userId: number): Observable<AccountStatus> {
    return this.http.post<AccountStatus>(`${API_BASE_URL}/admin/users/${userId}/suspend`, {});
  }

  /** POST /api/admin/users/{userId}/reactivate */
  reactivate(userId: number): Observable<AccountStatus> {
    return this.http.post<AccountStatus>(`${API_BASE_URL}/admin/users/${userId}/reactivate`, {});
  }
}
