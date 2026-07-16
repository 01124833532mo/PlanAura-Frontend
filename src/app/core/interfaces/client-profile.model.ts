/** Mirrors Planura.Core.Application.Models.Client.ClientProfileDto exactly. */
export interface ClientProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  city: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

/** Mirrors Planura.Core.Application.Models.Client.UpdateClientProfileDto exactly. */
export interface UpdateClientProfilePayload {
  fullName: string;
  email: string;
  phoneNumber?: string;
  city?: string;
  dateOfBirth?: string;
  avatarFile?: File;
}
