/** Mirrors the backend's AiChatMessageDto. */
export interface AiChatMessageDto {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

/** Mirrors the backend's SendChatMessageDto. */
export interface SendChatMessageRequest {
  conversationId?: number;
  eventPlanId?: number;
  message: string;
}

/** Mirrors the backend's ChatMessageResponseDto. */
export interface ChatMessageResponse {
  conversationId: number;
  userMessage: AiChatMessageDto;
  assistantMessage: AiChatMessageDto;
}
