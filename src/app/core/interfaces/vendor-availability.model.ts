/** Mirrors Planura.Core.Domain.Enums.AvailabilityStatus (int-backed enum). */
export enum AvailabilityStatus {
  Available = 1,
  Booked = 2,
  Blocked = 3,
  Held = 4,
}

/** Mirrors Planura.Core.Application.Models.VendorAvailabilityDto. */
export interface VendorAvailability {
  id: number;
  vendorId: number;
  startAt: string;
  endAt: string;
  status: AvailabilityStatus;
  bookingRequestId: number | null;
  createdAt: string;
}

/** Mirrors Planura.Core.Application.Models.CreateVendorAvailabilityDto. */
export interface CreateVendorAvailabilityPayload {
  startAt: string;
  endAt: string;
}

/** Mirrors Planura.Core.Application.Models.UpdateVendorAvailabilityDto. */
export interface UpdateVendorAvailabilityPayload {
  startAt: string;
  endAt: string;
}

/**
 * Mirrors Planura.Core.Application.Models.CreateRecurringAvailabilityDto. StartTime/EndTime are
 * plain "HH:mm" wall-clock strings (TimeOnly on the backend) as the vendor typed them — the backend
 * interprets them as Egypt local time (UTC+3), not UTC.
 */
export interface CreateRecurringAvailabilityPayload {
  /** 0=Sunday .. 6=Saturday (JS Date#getDay() numbering, matches System.DayOfWeek). */
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  startDate: string;
  repeatMonths: number;
}

/** Mirrors Planura.Core.Application.Models.GenerateRecurringAvailabilityResultDto. */
export interface GenerateRecurringAvailabilityResult {
  createdCount: number;
  skippedCount: number;
}
