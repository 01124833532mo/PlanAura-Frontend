/** Mirrors Planura.Core.Domain.Enums.AvailabilityStatus (int-backed enum). */
export enum AvailabilityStatus {
  Available = 1,
  Booked = 2,
  Blocked = 3,
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
  vendorId: number;
  startAt: string;
  endAt: string;
}

/** Mirrors Planura.Core.Application.Models.UpdateVendorAvailabilityDto. */
export interface UpdateVendorAvailabilityPayload {
  startAt: string;
  endAt: string;
}
