import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { BookingStatusHistoryEntry } from '../../../core/interfaces/booking-request.model';

interface TimelineRow {
  icon: string;
  title: string;
  notes: string | null;
  by: string;
  at: string;
}

/** Raw BookingStatus string -> a human title, for the "to" side of a transition. */
const STATUS_TITLES: Record<string, string> = {
  Pending: 'Booking request sent',
  Accepted: 'Vendor accepted — payment captured',
  Rejected: 'Booking declined',
  Cancelled: 'Booking cancelled',
  Completed: 'Booking completed',
  Expired: 'Booking expired — vendor did not respond in time',
  AwaitingConfirmation: 'Event ended — awaiting service confirmation',
  CancellationRequested: 'Cancellation requested',
};

/**
 * Renders the permanent "Booking Activity" audit trail (BookingStatusHistoryEntryDto[]) shared by
 * the client and vendor booking-detail views. This is the one place both parties can always come
 * back to for the full, final outcome of a booking — notifications are alerts only, this is the
 * record. A same-status entry (previousStatus === newStatus) is a non-transition event logged
 * against the booking — a dispute raised/resolved, for example — so it's titled from its Notes
 * prefix instead of STATUS_TITLES.
 */
@Component({
  selector: 'app-booking-timeline',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './booking-timeline.html',
  styleUrl: './booking-timeline.css',
})
export class BookingTimeline {
  @Input() set entries(value: BookingStatusHistoryEntry[] | null) {
    this.rows = (value ?? []).map(toRow).reverse(); // newest first
  }
  @Input() loading = false;
  @Input() error: string | null = null;

  protected rows: TimelineRow[] = [];
}

function toRow(entry: BookingStatusHistoryEntry): TimelineRow {
  const isTransition = entry.previousStatus !== entry.newStatus;
  const title = isTransition
    ? (STATUS_TITLES[entry.newStatus] ?? entry.newStatus)
    : titleFromNotes(entry.notes);

  return {
    icon: iconFor(entry.newStatus, entry.notes, isTransition),
    title,
    notes: entry.notes,
    by: entry.changedByName ?? 'System',
    at: entry.changedAt,
  };
}

function titleFromNotes(notes: string | null): string {
  if (!notes) return 'Update';
  if (notes.startsWith('Dispute raised:')) return 'Dispute submitted';
  if (notes.startsWith('Dispute resolved:')) return 'Dispute resolved';
  return 'Update';
}

function iconFor(status: string, notes: string | null, isTransition: boolean): string {
  if (!isTransition) {
    return notes?.startsWith('Dispute resolved:') ? 'task_alt' : 'flag';
  }
  switch (status) {
    case 'Pending':
      return 'send';
    case 'Accepted':
      return 'check_circle';
    case 'Rejected':
      return 'cancel';
    case 'Cancelled':
      return 'event_busy';
    case 'Completed':
      return 'celebration';
    case 'Expired':
      return 'schedule';
    case 'AwaitingConfirmation':
      return 'hourglass_top';
    case 'CancellationRequested':
      return 'front_hand';
    default:
      return 'circle';
  }
}
