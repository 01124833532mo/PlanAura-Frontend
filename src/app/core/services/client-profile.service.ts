import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { ClientProfile, UpdateClientProfilePayload } from '../interfaces/client-profile.model';

/**
 * Wraps the client-facing profile endpoints on ClientController. Mirrors
 * VendorService's getMyProfile()/updateMyProfile() shape exactly — same
 * multipart/form-data approach for the avatar upload.
 */
@Injectable({ providedIn: 'root' })
export class ClientProfileService {
  private readonly http = inject(HttpClient);

  /** GET /api/clients/me */
  getMyProfile(): Observable<ClientProfile> {
    return this.http.get<ClientProfile>(`${API_BASE_URL}/clients/me`);
  }

  /** PUT /api/clients/me */
  updateMyProfile(payload: UpdateClientProfilePayload): Observable<ClientProfile> {
    const formData = new FormData();

    formData.append('fullName', payload.fullName);
    formData.append('email', payload.email);
    if (payload.phoneNumber) {
      formData.append('phoneNumber', payload.phoneNumber);
    }
    if (payload.city) {
      formData.append('city', payload.city);
    }
    if (payload.dateOfBirth) {
      formData.append('dateOfBirth', payload.dateOfBirth);
    }
    if (payload.avatarFile) {
      formData.append('avatarFile', payload.avatarFile);
    }

    return this.http.put<ClientProfile>(`${API_BASE_URL}/clients/me`, formData);
  }
}
