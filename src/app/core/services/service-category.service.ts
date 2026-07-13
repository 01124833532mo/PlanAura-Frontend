import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { ServiceCategory } from '../interfaces/vendor.model';

/**
 * Wraps the public GET endpoints on ServiceCategoriesController
 * (anonymous, no [Authorize] on GetAll — verified in the backend source).
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
}
