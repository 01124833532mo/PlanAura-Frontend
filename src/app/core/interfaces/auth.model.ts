/** Mirrors Planura.Core.Application.Models.LoginDto exactly. */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Mirrors Planura.Core.Application.Models.RegisterClientDto exactly. */
export interface RegisterClientRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

/** Mirrors Planura.Core.Application.Models.AuthResponseDto exactly. */
export interface AuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  userId: number;
  fullName: string;
  email: string;
  roles: string[];
}

/** Mirrors Planura.Core.Application.Models.CurrentUserDto exactly. */
export interface CurrentUser {
  userId: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  roles: string[];
}

/** Mirrors Planura.Core.Application.Models.UpdateProfileDto exactly. */
export interface UpdateProfileRequest {
  fullName: string;
  phoneNumber?: string | null;
  preferredLanguage?: string | null;
}

/** Mirrors Planura.Core.Application.Models.ChangePasswordDto exactly. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

/** Mirrors Planura.Core.Application.Models.Auth.ForgetPasswordByEmailDto exactly. */
export interface ForgetPasswordRequest {
  email: string;
}

/**
 * Mirrors Planura.Core.Application.Models.Auth.ResetCodeConfirmationByEmailDto.
 * resetCode is an int on the backend — send it as a number, not a string.
 */
export interface VerifyResetCodeRequest {
  email: string;
  resetCode: number;
}

/** Mirrors Planura.Core.Application.Models.Auth.ResetPasswordByEmailDto exactly. */
export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
}

/** Mirrors Planura.Core.Application.Models.Auth.SuccessDto exactly. */
export interface SuccessResponse {
  status: string;
  message: string;
}

export const ROLE_ADMIN = 'admin';
export const ROLE_VENDOR = 'vendor';
export const ROLE_CLIENT = 'client';
