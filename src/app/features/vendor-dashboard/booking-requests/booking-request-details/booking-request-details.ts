import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Button } from '../../../../shared/ui/button/button';
import { DocumentDownload } from '../../../../shared/ui/document-download/document-download';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import {
  BookingRequest,
  BookingStatus,
} from '../../../../core/interfaces/booking-request.model';
import { VendorProfileStateService } from '../../../../core/services/vendor-profile-state.service';

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
  imports: [Button, DocumentDownload, StatusBadge, DatePipe, DecimalPipe],
  templateUrl: './booking-request-details.html',
  styleUrl: './booking-request-details.css',
})
export class BookingRequestDetails {
  protected readonly vendorProfileState = inject(VendorProfileStateService);

  @Input({ required: true }) booking!: BookingRequest;
  @Input() packageTitle: string | null = null;
  @Input() currency = 'EGP';
  @Input() actioning = false;

  @Output() accept = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  protected readonly BookingStatus = BookingStatus;

  protected handleBackdropClick(): void {
    if (!this.actioning) {
      this.closed.emit();
    }
  }
}
