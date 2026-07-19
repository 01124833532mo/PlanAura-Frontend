import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { ServiceCategory, ServiceCategoryPayload } from '../interfaces/vendor.model';

/**
 * Wraps ServiceCategoriesController. Reads (GetAll/GetById/GetBySlug) are
 * [AllowAnonymous]; mutations (Create/Update/Delete) require the AdminOnly
 * policy — authInterceptor attaches the bearer token automatically.
 */
@Injectable({ providedIn: 'root' })
export class ServiceCategoryService {
  private readonly http = inject(HttpClient);

  /** GET /api/servicecategories?activeOnly=true */
  getActiveCategories(): Observable<ServiceCategory[]> {
    return this.http.get<ServiceCategory[]>(`${API_BASE_URL}/servicecategories`, {
      params: { activeOnly: true },
    });
  }

  /** GET /api/servicecategories?activeOnly=false — every category, for the admin management page. */
  getAllCategories(): Observable<ServiceCategory[]> {
    return this.http.get<ServiceCategory[]>(`${API_BASE_URL}/servicecategories`, {
      params: { activeOnly: false },
    });
  }

  /** POST /api/servicecategories (multipart/form-data) */
  create(payload: ServiceCategoryPayload): Observable<ServiceCategory> {
    return this.http.post<ServiceCategory>(
      `${API_BASE_URL}/servicecategories`,
      this.toFormData(payload),
    );
  }

  /** PUT /api/servicecategories/{id} (multipart/form-data) */
  update(id: number, payload: ServiceCategoryPayload): Observable<ServiceCategory> {
    return this.http.put<ServiceCategory>(
      `${API_BASE_URL}/servicecategories/${id}`,
      this.toFormData(payload),
    );
  }

  /** DELETE /api/servicecategories/{id} */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/servicecategories/${id}`);
  }

  private toFormData(payload: ServiceCategoryPayload): FormData {
    const formData = new FormData();
    formData.append('nameEn', payload.nameEn);
    formData.append('slug', payload.slug);
    formData.append('isActive', String(payload.isActive));
    if (payload.iconFile) {
      formData.append('iconFile', payload.iconFile);
    }
    return formData;
  }
}
