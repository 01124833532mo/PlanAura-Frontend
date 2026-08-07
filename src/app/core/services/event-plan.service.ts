import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  CreateEventPlanRequest,
  EventPlan,
  EventPlanChecklistItem,
  UpdateEventPlanRequest,
} from '../interfaces/event-plan.model';

/**
 * Wraps the client-facing event-plan endpoints. Client ownership is resolved
 * server-side from the JWT (matching VendorService's getMyProfile() pattern)
 * rather than passed explicitly, so no clientId is threaded through here.
 */
@Injectable({ providedIn: 'root' })
export class EventPlanService {
  private readonly http = inject(HttpClient);

  /** GET /api/event-plans */
  getMyEventPlans(): Observable<EventPlan[]> {
    return this.http.get<EventPlan[]>(`${API_BASE_URL}/event-plans`);
  }

  /** GET /api/event-plans/{id} */
  getEventPlan(id: number): Observable<EventPlan> {
    return this.http.get<EventPlan>(`${API_BASE_URL}/event-plans/${id}`);
  }

  /** POST /api/event-plans */
  createEventPlan(dto: CreateEventPlanRequest): Observable<EventPlan> {
    return this.http.post<EventPlan>(`${API_BASE_URL}/event-plans`, dto);
  }

  /** DELETE /api/event-plans/{id} */
  deleteEventPlan(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/event-plans/${id}`);
  }

  /** PUT /api/event-plans/{id} */
  updateEventPlan(id: number, dto: UpdateEventPlanRequest): Observable<EventPlan> {
    return this.http.put<EventPlan>(`${API_BASE_URL}/event-plans/${id}`, dto);
  }

  /** POST /api/event-plans/{id}/checklist */
  addChecklistItem(eventPlanId: number, serviceCategoryId: number): Observable<EventPlanChecklistItem> {
    return this.http.post<EventPlanChecklistItem>(
      `${API_BASE_URL}/event-plans/${eventPlanId}/checklist`,
      { serviceCategoryId },
    );
  }

  /** DELETE /api/event-plans/{id}/checklist/{serviceCategoryId} */
  removeChecklistItem(eventPlanId: number, serviceCategoryId: number): Observable<void> {
    return this.http.delete<void>(
      `${API_BASE_URL}/event-plans/${eventPlanId}/checklist/${serviceCategoryId}`,
    );
  }
}
