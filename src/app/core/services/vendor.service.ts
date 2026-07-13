import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { VendorProfile } from '../interfaces/vendor-profile.model';

/**
 * Wraps the "me" endpoints on VendorController (policy: VendorOnly).
 * This is how the frontend resolves the logged-in vendor's Vendor.Id —
 * it is never present in AuthResponseDto/CurrentUserDto, only as the
 * vendor_id JWT claim, which this endpoint resolves server-side.
 */
@Injectable({ providedIn: 'root' })
export class VendorService {
  private readonly http = inject(HttpClient);

  /** GET /api/vendors/me */
  getMyProfile(): Observable<VendorProfile> {
    return this.http.get<VendorProfile>(`${API_BASE_URL}/vendors/me`);
  }
}
