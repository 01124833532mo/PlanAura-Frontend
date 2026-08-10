import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject, signal } from '@angular/core';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
import { AgreementReview } from '../../../../shared/ui/agreement-review/agreement-review';
import { BookingChat } from '../../../../shared/ui/booking-chat/booking-chat';
import { Button } from '../../../../shared/ui/button/button';
import { DocumentDownload } from '../../../../shared/ui/document-download/document-download';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { BookingTimeline } from '../../../../shared/ui/booking-timeline/booking-timeline';
import { PaymentBreakdown } from '../../../../shared/ui/payment-breakdown/payment-breakdown';
import {
  BookingChatMessage,
  BookingRequest,
  BookingStatus,
  BookingStatusHistoryEntry,
} from '../../../../core/interfaces/booking-request.model';
import { AppError } from '../../../../core/interfaces/api-response.model';
import { VendorProfileStateService } from '../../../../core/services/vendor-profile-state.service';
import { VendorBookingRequestService } from '../../../../core/services/vendor-booking-request.service';
import { notifyError } from '../../../../shared/utils/notify';
import { simplePaymentStatusLabel } from '../../../../shared/utils/simple-payment-status';

/**
 * Read-only detail view of a single incoming booking request, shown in a modal
 * when the vendor clicks a request row. Accept/Decline are surfaced here too
 * (only while the request is Pending) so the vendor can act after reviewing.
 * Once accepted, also surfaces the AI-generated Event Booking Contract for
 * this booking and, if this is the vendor's first-ever accepted booking, the
 * one-time Partnership Agreement with Planura (read from the cached vendor
 * profile — see VendorProfileStateService).
 */
@Component({
  selector: 'app-booking-request-details',
  standalone: true,
  imports: [
    Button,
    BookingChat,
    DocumentDownload,
    StatusBadge,
    AgreementReview,
    BookingTimeline,
    PaymentBreakdown,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './booking-request-details.html',
  styleUrl: './booking-request-details.css',
})
export class BookingRequestDetails implements OnInit, OnDestroy {
  protected readonly vendorProfileState = inject(VendorProfileStateService);
  private readonly bookingService = inject(VendorBookingRequestService);

  /**
   * The vendor's consent to the Booking Agreement, gating "Accept request". A fresh instance is
   * created each time the modal opens (parent uses @if), so this always starts unchecked.
   */
  protected readonly agreed = signal(false);

  @Input({ required: true }) booking!: BookingRequest;
  @Input() packageTitle: string | null = null;
  @Input() currency = 'EGP';
  @Input() actioning = false;
  /** Owned by the parent, which knows the server's Accepted/Completed + no-open-dispute rule. */
  @Input() canDispute = false;

  @Output() accept = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();
  @Output() dispute = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  protected readonly BookingStatus = BookingStatus;
  protected readonly simplePaymentStatus = simplePaymentStatusLabel;

  protected readonly timelineEntries = signal<BookingStatusHistoryEntry[] | null>(null);
  protected readonly timelineLoading = signal(false);
  protected readonly timelineError = signal<string | null>(null);

  // Chat (unlocked once vendorAgreedAt is set) — polled, not push, see BookingChat/VendorBookingRequestService.
  protected readonly chatMessages = signal<BookingChatMessage[]>([]);
  protected readonly chatSending = signal(false);
  private chatPollSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.timelineLoading.set(true);
    this.bookingService.getTimeline(this.booking.id).subscribe({
      next: (entries) => {
        this.timelineEntries.set(entries);
        this.timelineLoading.set(false);
      },
      error: (err: AppError) => {
        this.timelineError.set(err.message || 'Could not load booking activity.');
        this.timelineLoading.set(false);
      },
    });

    if (this.booking.vendorAgreedAt) {
      this.startChatPolling();
    }
  }

  ngOnDestroy(): void {
    this.chatPollSubscription?.unsubscribe();
  }

  /** Polls every 6s for messages newer than the last one already held — see BookingChat's header comment. */
  private startChatPolling(): void {
    this.chatPollSubscription = interval(6000)
      .pipe(
        startWith(0),
        switchMap(() => {
          const lastId = this.chatMessages().at(-1)?.id;
          return this.bookingService.getChatMessages(this.booking.id, lastId);
        }),
      )
      .subscribe({
        next: (newMessages) => {
          if (newMessages.length > 0) {
            this.chatMessages.update((list) => [...list, ...newMessages]);
          }
        },
        // A poll hiccup shouldn't surface as a dialog-level error or stop future polls.
        error: () => undefined,
      });
  }

  protected sendChatMessage(content: string): void {
    this.chatSending.set(true);
    this.bookingService.sendChatMessage(this.booking.id, content).subscribe({
      next: (message) => {
        this.chatMessages.update((list) => [...list, message]);
        this.chatSending.set(false);
      },
      error: (err: AppError) => {
        this.chatSending.set(false);
        notifyError('Could not send message', err.message);
      },
    });
  }

  protected handleBackdropClick(): void {
    if (!this.actioning) {
      this.closed.emit();
    }
  }
}
