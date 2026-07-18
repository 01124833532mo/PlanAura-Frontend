import { Component, ElementRef, ViewChild, signal } from '@angular/core';

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
}

/**
 * Frontend-only preview of the upcoming Planura AI Assistant. No backend,
 * no API calls, no AI integration — this is purely the chat UI shell so it
 * can be wired up to a real conversation service later without reworking
 * the presentation layer.
 *
 * "Sending" a message only echoes it into the local thread as a user
 * bubble; there is no bot reply logic, intentionally, so this never looks
 * like it's actually answering anything yet.
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
  protected readonly open = signal(false);
  protected readonly minimized = signal(false);

  protected readonly messages = signal<ChatMessage[]>([
    { sender: 'bot', text: "👋 Hi! I'm your Planura AI Assistant." },
    {
      sender: 'bot',
      text: 'I can help you find vendors, plan your event, answer questions, and more.',
    },
  ]);

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
    if (!text) {
      return;
    }

    this.messages.update((list) => [...list, { sender: 'user', text }]);
    input.value = '';
    queueMicrotask(() => this.scrollToBottom());
  }

  private scrollToBottom(): void {
    this.scrollAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}
