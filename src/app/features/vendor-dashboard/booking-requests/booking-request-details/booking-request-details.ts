import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { AgreementReview } from '../../../../shared/ui/agreement-review/agreement-review';
import { Button } from '../../../../shared/ui/button/button';
import { DocumentDownload } from '../../../../shared/ui/document-download/document-download';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { BookingTimeline } from '../../../../shared/ui/booking-timeline/booking-timeline';
import {
  BookingRequest,
  BookingStatus,
  BookingStatusHistoryEntry,
} from '../../../../core/interfaces/booking-request.model';
import { AppError } from '../../../../core/interfaces/api-response.model';
import { VendorProfileStateService } from '../../../../core/services/vendor-profile-state.service';
import { VendorBookingRequestService } from '../../../../core/services/vendor-booking-request.service';

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
    DocumentDownload,
    StatusBadge,
    AgreementReview,
    BookingTimeline,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './booking-request-details.html',
  styleUrl: './booking-request-details.css',
})
export class BookingRequestDetails implements OnInit {
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

  protected readonly timelineEntries = signal<BookingStatusHistoryEntry[] | null>(null);
  protected readonly timelineLoading = signal(false);
  protected readonly timelineError = signal<string | null>(null);

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
  }

  protected handleBackdropClick(): void {
    if (!this.actioning) {
      this.closed.emit();
    }
  }
}
