import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  AdminClientDetails,
  AdminClientFilter,
  AdminClientListItem,
} from '../interfaces/admin-client.model';
import { PagedResult } from '../interfaces/paged-result.model';
import { toHttpParams } from '../../shared/utils/http-params';

/** Wraps AdminClientsController (Policy: AdminOnly, api/admin/clients). */
@Injectable({ providedIn: 'root' })
export class AdminClientService {
  private readonly http = inject(HttpClient);

  /** GET /api/admin/clients */
  list(filter: AdminClientFilter): Observable<PagedResult<AdminClientListItem>> {
    return this.http.get<PagedResult<AdminClientListItem>>(`${API_BASE_URL}/admin/clients`, {
      params: toHttpParams(filter),
    });
  }

  /** GET /api/admin/clients/{clientId} */
  getDetails(clientId: number): Observable<AdminClientDetails> {
    return this.http.get<AdminClientDetails>(`${API_BASE_URL}/admin/clients/${clientId}`);
  }
}
