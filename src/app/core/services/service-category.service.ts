import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { ServiceCategory } from '../interfaces/vendor.model';

/**
 * Wraps the GET endpoints on ServiceCategoriesController. The controller is
 * class-level [Authorize] with no [AllowAnonymous] override, so callers must
 * be logged in — authInterceptor attaches the bearer token automatically.
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
