import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { VendorProfile } from '../interfaces/vendor-profile.model';

/**
 * Wraps profile endpoints on VendorController. getMyProfile() (policy:
 * VendorOnly) is how the frontend resolves the logged-in vendor's Vendor.Id —
 * it is never present in AuthResponseDto/CurrentUserDto, only as the
 * vendor_id JWT claim, which that endpoint resolves server-side. getById()
 * (AllowAnonymous server-side) is the public vendor-detail lookup used by
 * the client-facing vendor-details page.
 */
@Injectable({ providedIn: 'root' })
export class VendorService {
  private readonly http = inject(HttpClient);

  /** GET /api/vendors/me */
  getMyProfile(): Observable<VendorProfile> {
    return this.http.get<VendorProfile>(`${API_BASE_URL}/vendors/me`);
  }

  /** GET /api/vendors/{id} */
  getById(id: number): Observable<VendorProfile> {
    return this.http.get<VendorProfile>(`${API_BASE_URL}/vendors/${id}`);
  }
}
