/** Mirrors the backend's EventPlanDto (verify field names once the controller is available). */
export interface EventPlan {
  id: number;
  title: string;
  eventType: string;
  eventDate: string;
  city: string;
  guestCount: number;
  budgetTotal: number;
  styleNotes?: string;
  createdAt: string;
}

/** Mirrors the backend's CreateEventPlanDto (verify field names once the controller is available). */
export interface CreateEventPlanRequest {
  title: string;
  eventType: string;
  eventDate: string;
  city: string;
  guestCount: number;
  budgetTotal: number;
  styleNotes?: string;
}

/**
 * Mirrors the backend's UpdateEventPlanDto for PUT /api/event-plans/{id}.
 * Only eventType is strictly required server-side, but the form always
 * collects/sends every field regardless of create vs. edit mode, so this
 * matches CreateEventPlanRequest's shape exactly.
 */
export type UpdateEventPlanRequest = CreateEventPlanRequest;
