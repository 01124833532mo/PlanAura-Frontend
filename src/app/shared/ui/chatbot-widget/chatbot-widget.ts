import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { AiChatService } from '../../../core/services/ai-chat.service';
import { AppError } from '../../../core/interfaces/api-response.model';

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
  /** Set on a failed send so the composer can offer a retry without re-typing. */
  failed?: boolean;
}

/**
 * Planura AI Assistant — floating chat widget wired to the real backend
 * (AiChatController -> AiChatService -> Gemini). Maintains the conversation
 * thread id returned by the first response so follow-up messages continue
 * the same conversation server-side, matching AiChatConversation's model.
 *
 * Mounted once at the app root (see app.ts/app.html) so it persists across
 * client-area navigation instead of being re-created per page.
 */
@Component({
  selector: 'ui-chatbot-widget',
  standalone: true,
  templateUrl: './chatbot-widget.html',
  styleUrl: './chatbot-widget.css',
})
export class ChatbotWidget {
  private readonly aiChatService = inject(AiChatService);

  protected readonly open = signal(false);
  protected readonly minimized = signal(false);
  protected readonly sending = signal(false);

  protected readonly messages = signal<ChatMessage[]>([
    { sender: 'bot', text: "👋 Hi! I'm your Planura AI Assistant." },
    {
      sender: 'bot',
      text: 'Ask me for vendor recommendations, budget ideas, or anything about planning your event.',
    },
  ]);

  private conversationId: number | undefined;
  private lastFailedText: string | null = null;

  @ViewChild('scrollAnchor') private scrollAnchor?: ElementRef<HTMLElement>;

  protected toggle(): void {
    this.open.update((value) => !value);
    if (this.open()) {
      this.minimized.set(false);
      queueMicrotask(() => this.scrollToBottom());
    }
  }

  protected close(): void {
    this.open.set(false);
    this.minimized.set(false);
  }

  protected toggleMinimize(): void {
    this.minimized.update((value) => !value);
  }

  protected sendMessage(input: HTMLInputElement): void {
    const text = input.value.trim();
    if (!text || this.sending()) {
      return;
    }

    input.value = '';
    this.dispatch(text);
  }

  /** Re-sends the last message that failed, without requiring the user to retype it. */
  protected retryLastMessage(): void {
    if (!this.lastFailedText || this.sending()) {
      return;
    }
    // Drop the trailing failed bubble before re-sending so it isn't duplicated.
    this.messages.update((list) => list.filter((m) => !m.failed));
    this.dispatch(this.lastFailedText);
  }

  private dispatch(text: string): void {
    this.messages.update((list) => [...list, { sender: 'user', text }]);
    this.sending.set(true);
    this.lastFailedText = null;
    queueMicrotask(() => this.scrollToBottom());

    this.aiChatService
      .sendMessage({ conversationId: this.conversationId, message: text })
      .subscribe({
        next: (response) => {
          this.conversationId = response.conversationId;
          this.messages.update((list) => [
            ...list,
            { sender: 'bot', text: response.assistantMessage.content },
          ]);
          this.sending.set(false);
          queueMicrotask(() => this.scrollToBottom());
        },
        error: (err: AppError) => {
          this.lastFailedText = text;
          this.messages.update((list) => [
            ...list,
            {
              sender: 'bot',
              text: err?.message || "Sorry, I couldn't reach the assistant just now. Please try again.",
              failed: true,
            },
          ]);
          this.sending.set(false);
          queueMicrotask(() => this.scrollToBottom());
        },
      });
  }

  private scrollToBottom(): void {
    this.scrollAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}
