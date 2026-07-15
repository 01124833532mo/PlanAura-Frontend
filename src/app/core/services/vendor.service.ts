import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { PortfolioMediaItem } from '../interfaces/portfolio.model';
import { UpdateVendorProfilePayload, VendorProfile } from '../interfaces/vendor-profile.model';

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

  /** PUT /api/vendors/me */
  updateMyProfile(payload: UpdateVendorProfilePayload): Observable<VendorProfile> {
    const formData = new FormData();

    formData.append('businessName', payload.businessName);
    if (payload.businessDescription) {
      formData.append('businessDescription', payload.businessDescription);
    }
    if (payload.categoryId !== undefined && payload.categoryId !== null) {
      formData.append('categoryId', String(payload.categoryId));
    }
    if (payload.city) {
      formData.append('city', payload.city);
    }
    if (payload.address) {
      formData.append('address', payload.address);
    }
    if (payload.latitude !== undefined && payload.latitude !== null) {
      formData.append('latitude', String(payload.latitude));
    }
    if (payload.longitude !== undefined && payload.longitude !== null) {
      formData.append('longitude', String(payload.longitude));
    }
    if (payload.logoFile) {
      formData.append('logoFile', payload.logoFile);
    }
    if (payload.coverImageFile) {
      formData.append('coverImageFile', payload.coverImageFile);
    }

    return this.http.put<VendorProfile>(`${API_BASE_URL}/vendors/me`, formData);
  }

  /** GET /api/vendors/{id}/portfolio/media (public endpoint, also used for the vendor's own id) */
  getPortfolioMedia(vendorId: number): Observable<PortfolioMediaItem[]> {
    return this.http.get<PortfolioMediaItem[]>(
      `${API_BASE_URL}/vendors/${vendorId}/portfolio/media`,
    );
  }

  /** POST /api/vendors/me/portfolio/media */
  addPortfolioMedia(file: File, title?: string): Observable<PortfolioMediaItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }

    return this.http.post<PortfolioMediaItem>(
      `${API_BASE_URL}/vendors/me/portfolio/media`,
      formData,
    );
  }

  /** DELETE /api/vendors/me/portfolio/media/{mediaId} */
  removePortfolioMedia(mediaId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/vendors/me/portfolio/media/${mediaId}`);
  }

  /** PUT /api/vendors/me/portfolio/media/reorder */
  reorderPortfolioMedia(orderedMediaIds: number[]): Observable<void> {
    return this.http.put<void>(`${API_BASE_URL}/vendors/me/portfolio/media/reorder`, {
      orderedMediaIds,
    });
  }
}
