/** Sent to AiController POST /api/ai/invitations (mirrors GenerateInvitationDto). */
export interface GenerateInvitationRequest {
  eventPlanId: number;
  theme: string;
  prompt: string;
}

/** Mirrors the backend's InvitationDto - both the generate response and each item in the list response. */
export interface Invitation {
  id: number;
  eventPlanId: number;
  theme: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
}
