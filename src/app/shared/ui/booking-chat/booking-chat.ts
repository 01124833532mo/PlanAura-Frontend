import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BookingChatMessage } from '../../../core/interfaces/booking-request.model';

/**
 * Presentational message thread for a booking's client/vendor chat — same smart/dumb split already
 * used for BookingTimeline and PaymentBreakdown (both booking-details.ts and booking-request-details.ts
 * import this directly). The parent owns fetching, sending and polling; this only renders `messages`
 * and emits `send` with the composed text, mirroring ChatbotWidget's plain-<input> composer pattern.
 */
@Component({
  selector: 'app-booking-chat',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './booking-chat.html',
  styleUrl: './booking-chat.css',
})
export class BookingChat {
  /**
   * Not a plain @Input(): a setter so a genuinely new message (append, from either sending or
   * polling in the newest one) triggers an auto-scroll, without fighting the user if they've
   * scrolled up to read history — same approach ChatbotWidget uses (scroll only on dispatch/response,
   * never unconditionally on every change-detection pass).
   */
  @Input({ required: true }) set messages(value: BookingChatMessage[]) {
    const grew = value.length > this._messages.length;
    this._messages = value;
    if (grew) {
      queueMicrotask(() => this.scrollToBottom());
    }
  }
  get messages(): BookingChatMessage[] {
    return this._messages;
  }
  private _messages: BookingChatMessage[] = [];

  @Input() sending = false;
  @Output() send = new EventEmitter<string>();

  @ViewChild('scrollAnchor') private scrollAnchor?: ElementRef<HTMLElement>;
  @ViewChild('composer') private composer?: ElementRef<HTMLInputElement>;

  private scrollToBottom(): void {
    this.scrollAnchor?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  protected submit(): void {
    const input = this.composer?.nativeElement;
    if (!input) {
      return;
    }

    const text = input.value.trim();
    if (!text || this.sending) {
      return;
    }

    input.value = '';
    this.send.emit(text);
  }
}
