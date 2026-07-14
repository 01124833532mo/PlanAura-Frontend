import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  CreateVendorAvailabilityPayload,
  UpdateVendorAvailabilityPayload,
  VendorAvailability,
} from '../interfaces/vendor-availability.model';

/**
 * Wraps the vendor-facing endpoints on VendorAvailabilityController
 * ([Authorize], api/VendorAvailability). BookSlot/CancelBooking are
 * intentionally not wrapped here — they depend on BookingRequestId, and
 * there's no booking-request feature in the frontend yet.
 */
@Injectable({ providedIn: 'root' })
export class VendorAvailabilityService {
  private readonly http = inject(HttpClient);

  /** GET /api/vendoravailability/by-vendor/{vendorId} */
  getByVendor(vendorId: number): Observable<VendorAvailability[]> {
    return this.http.get<VendorAvailability[]>(
      `${API_BASE_URL}/vendoravailability/by-vendor/${vendorId}`,
    );
  }

  /** POST /api/vendoravailability */
  create(payload: CreateVendorAvailabilityPayload): Observable<VendorAvailability> {
    return this.http.post<VendorAvailability>(`${API_BASE_URL}/vendoravailability`, payload);
  }

  /** PUT /api/vendoravailability/{id} */
  update(id: number, payload: UpdateVendorAvailabilityPayload): Observable<VendorAvailability> {
    return this.http.put<VendorAvailability>(
      `${API_BASE_URL}/vendoravailability/${id}`,
      payload,
    );
  }

  /** DELETE /api/vendoravailability/{id} */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/vendoravailability/${id}`);
  }
}
