import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import { ChatMessageResponse, SendChatMessageRequest } from '../interfaces/ai-chat.model';

/**
 * Wraps the client-facing AiChatController endpoint. Stateless by design —
 * the running conversation thread is owned by ChatbotWidget, the single
 * consumer today; client ownership itself is resolved server-side from the
 * JWT, same as EventPlanService.
 */
@Injectable({ providedIn: 'root' })
export class AiChatService {
  private readonly http = inject(HttpClient);

  /** POST /api/ai-chat/messages */
  sendMessage(request: SendChatMessageRequest): Observable<ChatMessageResponse> {
    return this.http.post<ChatMessageResponse>(`${API_BASE_URL}/ai-chat/messages`, request);
  }
}
