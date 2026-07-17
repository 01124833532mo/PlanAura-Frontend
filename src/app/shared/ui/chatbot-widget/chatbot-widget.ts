import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { AppError } from '../../../core/interfaces/api-response.model';
import { AiChatService } from '../../../core/services/ai-chat.service';

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
}

/**
 * Live Planura AI Assistant widget, backed by AiChatController
 * (POST /api/ai-chat/messages) via AiChatService.
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
  private readonly aiChat = inject(AiChatService);

  protected readonly open = signal(false);
  protected readonly minimized = signal(false);
  protected readonly sending = signal(false);
  protected readonly errorText = signal<string | null>(null);

  protected readonly messages = signal<ChatMessage[]>([
    { sender: 'bot', text: "👋 Hi! I'm your Planura AI Assistant." },
    {
      sender: 'bot',
      text: 'I can help you find vendors, plan your event, answer questions, and more.',
    },
  ]);

  private conversationId?: number;

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

    this.messages.update((list) => [...list, { sender: 'user', text }]);
    input.value = '';
    this.errorText.set(null);
    this.sending.set(true);
    queueMicrotask(() => this.scrollToBottom());

    this.aiChat.sendMessage({ conversationId: this.conversationId, message: text }).subscribe({
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
        this.errorText.set(err.message ?? 'The assistant is unavailable right now.');
        this.sending.set(false);
      },
    });
  }

  private scrollToBottom(): void {
    this.scrollAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}
