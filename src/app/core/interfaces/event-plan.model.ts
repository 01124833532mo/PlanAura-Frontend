/** Mirrors Planura.Core.Application.Models.EventPlanChecklistItemDto. IsSatisfied is computed
 * server-side (true when the plan has an active booking whose vendor belongs to this category). */
export interface EventPlanChecklistItem {
  serviceCategoryId: number;
  categoryName: string;
  iconUrl: string | null;
  isSatisfied: boolean;
}

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
  /** Sum of AgreedPrice over this plan's active bookings. Only populated by getEventPlan (detail); 0 on list results. */
  totalBookedCost: number;
  /** budgetTotal - totalBookedCost, or null when no budget is set. Only populated by getEventPlan; null on list results. */
  remainingBudget: number | null;
  /** Only populated by getEventPlan; empty on list results. */
  checklist: EventPlanChecklistItem[];
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
