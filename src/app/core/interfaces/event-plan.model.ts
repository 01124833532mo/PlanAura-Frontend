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
