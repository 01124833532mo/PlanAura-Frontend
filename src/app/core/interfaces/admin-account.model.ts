/** Mirrors Planura.Core.Application.Models.Admin.AdminAccountDto exactly. */
export interface AdminAccount {
  userId: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

/** Mirrors Planura.Core.Application.Models.Admin.CreateAdminDto exactly. */
export interface CreateAdminRequest {
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  password: string;
  confirmPassword: string;
}

/** Mirrors Planura.Core.Application.Models.AccountStatusDto exactly. */
export interface AccountStatus {
  userId: number;
  isActive: boolean;
}

/** Mirrors Planura.Core.Application.Models.Notification.BroadcastNotificationDto exactly. */
export interface BroadcastNotificationRequest {
  /** "client", "vendor", or "all". */
  role: 'client' | 'vendor' | 'all';
  type: string;
  title: string;
  body?: string;
}
