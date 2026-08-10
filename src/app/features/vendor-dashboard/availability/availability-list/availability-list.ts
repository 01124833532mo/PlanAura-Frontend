import { Component, computed, effect, inject, signal } from '@angular/core';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { AppError } from '../../../../core/interfaces/api-response.model';
import { BookingRequest } from '../../../../core/interfaces/booking-request.model';
import {
  AvailabilityStatus,
  CreateRecurringAvailabilityPayload,
  CreateVendorAvailabilityPayload,
  UpdateVendorAvailabilityPayload,
  VendorAvailability,
} from '../../../../core/interfaces/vendor-availability.model';
import { VendorAvailabilityService } from '../../../../core/services/vendor-availability.service';
import { VendorBookingRequestService } from '../../../../core/services/vendor-booking-request.service';
import { VendorProfileStateService } from '../../../../core/services/vendor-profile-state.service';
import { AvailabilityForm } from '../availability-form/availability-form';
import { BookingRequestDetails } from '../../booking-requests/booking-request-details/booking-request-details';
import { confirmAcceptBooking } from '../../../../shared/utils/confirm-accept-booking';
import { notifyError, notifySuccess } from '../../../../shared/utils/notify';

/** One slot as it appears on a single day cell (a multi-day slot yields one per covered day). */
interface DaySlot {
  slot: VendorAvailability;
  segment: 'single' | 'start' | 'middle' | 'end';
  label: string;
  rangeTitle: string;
}

interface CalendarDay {
  date: Date;
  key: string;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  slots: DaySlot[];
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local (not UTC) yyyy-MM-dd key so slots group under the day the vendor sees. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

@Component({
  selector: 'app-availability-list',
  standalone: true,
  imports: [AlertBanner, Button, AvailabilityForm, BookingRequestDetails],
  templateUrl: './availability-list.html',
  styleUrl: './availability-list.css',
})
export class AvailabilityList {
  private readonly availabilityService = inject(VendorAvailabilityService);
  private readonly vendorBookingRequestService = inject(VendorBookingRequestService);
  private readonly vendorProfileState = inject(VendorProfileStateService);

  protected readonly AvailabilityStatus = AvailabilityStatus;
  protected readonly weekdayLabels = WEEKDAY_LABELS;

  protected readonly slots = signal<VendorAvailability[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly formOpen = signal(false);
  protected readonly editingSlot = signal<VendorAvailability | null>(null);
  protected readonly initialDate = signal<string | null>(null);
  protected readonly savingId = signal<number | 'new' | null>(null);

  // Recurring-availability modal: generate slots from a weekly pattern instead of one at a time.
  protected readonly recurringOpen = signal(false);
  protected readonly recurringSaving = signal(false);
  protected readonly recurringError = signal<AppError | null>(null);
  protected readonly weekdayCheckboxes = WEEKDAY_LABELS.map((label, index) => ({ index, label }));
  protected readonly recurringDays = signal<Set<number>>(new Set());
  protected readonly recurringStartTime = signal('12:00');
  protected readonly recurringEndTime = signal('13:00');
  protected readonly recurringStartDate = signal(toDateInputValue(new Date()));
  protected readonly recurringRepeatMonths = signal(3);

  // Read-only booking view opened when the vendor clicks a Booked slot. Errors
  // (load/accept/reject) surface through the page-level `error` alert banner.
  protected readonly bookingDetails = signal<BookingRequest | null>(null);
  protected readonly bookingActioning = signal(false);

  // First day of the month currently shown in the calendar.
  protected readonly viewMonth = signal(startOfMonth(new Date()));

  protected readonly monthLabel = computed(() =>
    this.viewMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  );

  protected readonly weeks = computed<CalendarDay[][]>(() => {
    const month = this.viewMonth();
    const slotsByDay = this.buildDaySlots(this.slots());

    const today = new Date();
    const todayKey = dayKey(today);
    const todayMidnight = startOfDay(today);

    // Grid starts on the Sunday on/before the 1st, ends on the Saturday on/after the last day.
    const gridStart = new Date(month);
    gridStart.setDate(1 - month.getDay());
    const monthIndex = month.getMonth();

    const weeks: CalendarDay[][] = [];
    const cursor = new Date(gridStart);
    for (let w = 0; w < 6; w++) {
      const week: CalendarDay[] = [];
      for (let d = 0; d < 7; d++) {
        const key = dayKey(cursor);
        week.push({
          date: new Date(cursor),
          key,
          dayNum: cursor.getDate(),
          inMonth: cursor.getMonth() === monthIndex,
          isToday: key === todayKey,
          isPast: startOfDay(cursor) < todayMidnight,
          slots: slotsByDay.get(key) ?? [],
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
      // Stop after the week that contains the last day of the month.
      if (cursor.getMonth() !== monthIndex && week[6].date >= lastOfMonth(month)) {
        break;
      }
    }
    return weeks;
  });

  constructor() {
    effect(() => {
      const vendorId = this.vendorProfileState.vendorId();
      if (vendorId !== null) {
        this.fetchSlots(vendorId);
      }
    });
  }

  /**
   * Spreads every slot across all the calendar days its start→end range covers,
   * labelling each segment so the vendor sees the full range on the calendar.
   */
  private buildDaySlots(slots: VendorAvailability[]): Map<string, DaySlot[]> {
    const byDay = new Map<string, DaySlot[]>();

    for (const slot of slots) {
      const start = new Date(slot.startAt);
      const end = new Date(slot.endAt);
      const startDay = startOfDay(start);

      // A slot ending exactly at midnight belongs to the previous day, not the next.
      let endDay = startOfDay(end);
      if (end.getHours() === 0 && end.getMinutes() === 0 && endDay > startDay) {
        endDay = new Date(endDay);
        endDay.setDate(endDay.getDate() - 1);
      }
      if (endDay < startDay) {
        endDay = startDay;
      }

      const rangeTitle = `${formatDateTime(start)} → ${formatDateTime(end)}`;
      const cursor = new Date(startDay);
      while (cursor <= endDay) {
        const isStart = cursor.getTime() === startDay.getTime();
        const isEnd = cursor.getTime() === endDay.getTime();

        let segment: DaySlot['segment'];
        let label: string;
        if (isStart && isEnd) {
          segment = 'single';
          label = `${formatTime(start)} – ${formatTime(end)}`;
        } else if (isStart) {
          segment = 'start';
          label = `${formatTime(start)} →`;
        } else if (isEnd) {
          segment = 'end';
          label = `→ ${formatTime(end)}`;
        } else {
          segment = 'middle';
          label = 'All day';
        }

        const key = dayKey(cursor);
        const daySlot: DaySlot = { slot, segment, label, rangeTitle };
        const list = byDay.get(key);
        if (list) {
          list.push(daySlot);
        } else {
          byDay.set(key, [daySlot]);
        }

        cursor.setDate(cursor.getDate() + 1);
      }
    }

    for (const list of byDay.values()) {
      list.sort((a, b) => new Date(a.slot.startAt).getTime() - new Date(b.slot.startAt).getTime());
    }
    return byDay;
  }

  protected statusLabel(status: AvailabilityStatus): string {
    switch (status) {
      case AvailabilityStatus.Available:
        return 'Available';
      case AvailabilityStatus.Booked:
        return 'Booked';
      case AvailabilityStatus.Blocked:
        return 'Blocked';
      case AvailabilityStatus.Held:
        return 'Pending';
    }
  }

  protected prevMonth(): void {
    this.viewMonth.update((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  protected nextMonth(): void {
    this.viewMonth.update((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  protected goToday(): void {
    this.viewMonth.set(startOfMonth(new Date()));
  }

  private fetchSlots(vendorId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.availabilityService.getByVendor(vendorId).subscribe({
      next: (slots) => {
        this.slots.set(slots);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.editingSlot.set(null);
    this.initialDate.set(null);
    this.formOpen.set(true);
  }

  /** Opens the create form pre-filled to a specific day clicked in the calendar. */
  protected openCreateOnDay(day: CalendarDay): void {
    if (day.isPast) {
      return;
    }
    this.editingSlot.set(null);
    this.initialDate.set(day.key);
    this.formOpen.set(true);
  }

  protected openEdit(slot: VendorAvailability): void {
    this.editingSlot.set(slot);
    this.initialDate.set(null);
    this.formOpen.set(true);
  }

  /**
   * Routes a slot click to the right view: a Held or Booked slot has no editable
   * fields of its own (the vendor doesn't own the booking), so it opens the linked
   * booking's details instead of the availability edit form. A Blocked slot only
   * ever exists here because its start time has passed (there's no vendor-facing
   * "block a date" action), so it's purely informational and does nothing on click.
   */
  protected openSlot(slot: VendorAvailability): void {
    // Held = a fresh request awaiting this vendor's own accept/reject; Booked =
    // already confirmed. Both are tied to a real booking, so both open the same
    // read-only (or, while still Held, actionable) details view.
    if (slot.status === AvailabilityStatus.Booked || slot.status === AvailabilityStatus.Held) {
      if (slot.bookingRequestId !== null) {
        this.loadBookingDetails(slot.bookingRequestId);
      }
      return;
    }
    if (slot.status === AvailabilityStatus.Available) {
      this.openEdit(slot);
    }
  }

  private loadBookingDetails(bookingRequestId: number): void {
    this.error.set(null);
    this.bookingDetails.set(null);
    this.vendorBookingRequestService.getIncoming(bookingRequestId).subscribe({
      next: (booking) => this.bookingDetails.set(booking),
      error: (err: AppError) => this.error.set(err),
    });
  }

  protected closeBookingDetails(): void {
    this.bookingDetails.set(null);
  }

  protected async acceptBooking(booking: BookingRequest): Promise<void> {
    if (!(await confirmAcceptBooking())) {
      return;
    }

    this.bookingActioning.set(true);
    this.error.set(null);

    this.vendorBookingRequestService.accept(booking.id).subscribe({
      next: () => this.finishBookingAction(),
      error: (err: AppError) => {
        this.error.set(err);
        // A capture failure auto-declines the request server-side, so the slot's
        // status may have already changed — close the (now stale) modal and refresh.
        this.finishBookingAction();
      },
    });
  }

  protected rejectBooking(booking: BookingRequest): void {
    this.bookingActioning.set(true);
    this.error.set(null);

    this.vendorBookingRequestService.reject(booking.id).subscribe({
      next: () => this.finishBookingAction(),
      error: (err: AppError) => {
        this.error.set(err);
        this.finishBookingAction();
      },
    });
  }

  /** Refreshes the calendar so any slot status change from the accept/reject is reflected. */
  private finishBookingAction(): void {
    this.bookingActioning.set(false);
    this.closeBookingDetails();
    const vendorId = this.vendorProfileState.vendorId();
    if (vendorId !== null) {
      this.fetchSlots(vendorId);
    }
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingSlot.set(null);
    this.initialDate.set(null);
  }

  protected handleSave(value: UpdateVendorAvailabilityPayload): void {
    const editing = this.editingSlot();
    if (editing) {
      this.saveEdit(editing.id, value);
      return;
    }

    if (this.vendorProfileState.vendorId() === null) {
      return;
    }
    this.saveCreate(value);
  }

  private saveCreate(payload: CreateVendorAvailabilityPayload): void {
    this.savingId.set('new');
    this.error.set(null);

    this.availabilityService.create(payload).subscribe({
      next: (created) => {
        this.slots.update((list) => [...list, created]);
        this.savingId.set(null);
        this.closeForm();
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.savingId.set(null);
      },
    });
  }

  private saveEdit(id: number, payload: UpdateVendorAvailabilityPayload): void {
    this.savingId.set(id);
    this.error.set(null);

    this.availabilityService.update(id, payload).subscribe({
      next: (updated) => {
        this.slots.update((list) => list.map((s) => (s.id === id ? updated : s)));
        this.savingId.set(null);
        this.closeForm();
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.savingId.set(null);
      },
    });
  }

  protected openRecurring(): void {
    this.recurringError.set(null);
    this.recurringDays.set(new Set());
    this.recurringOpen.set(true);
  }

  protected closeRecurring(): void {
    this.recurringOpen.set(false);
  }

  protected toggleRecurringDay(dayIndex: number): void {
    this.recurringDays.update((days) => {
      const next = new Set(days);
      if (next.has(dayIndex)) {
        next.delete(dayIndex);
      } else {
        next.add(dayIndex);
      }
      return next;
    });
  }

  protected submitRecurring(): void {
    const daysOfWeek = [...this.recurringDays()];
    if (daysOfWeek.length === 0) {
      this.recurringError.set({
        status: 400,
        message: 'Select at least one day of the week.',
        fieldErrors: [],
      });
      return;
    }

    const payload: CreateRecurringAvailabilityPayload = {
      daysOfWeek,
      startTime: this.recurringStartTime(),
      endTime: this.recurringEndTime(),
      startDate: this.recurringStartDate(),
      repeatMonths: this.recurringRepeatMonths(),
    };

    this.recurringSaving.set(true);
    this.recurringError.set(null);

    this.availabilityService.generateRecurring(payload).subscribe({
      next: (result) => {
        this.recurringSaving.set(false);
        this.recurringOpen.set(false);
        notifySuccess(
          `Created ${result.createdCount} slot(s)` +
            (result.skippedCount > 0 ? ` (${result.skippedCount} skipped — already had a slot then).` : '.'),
        );
        const vendorId = this.vendorProfileState.vendorId();
        if (vendorId !== null) {
          this.fetchSlots(vendorId);
        }
      },
      error: (err: AppError) => {
        this.recurringError.set(err);
        this.recurringSaving.set(false);
        notifyError('Could not generate recurring availability', err.message);
      },
    });
  }

  protected deleteSlot(slot: VendorAvailability): void {
    if (!confirm('Delete this availability slot?')) {
      return;
    }

    this.savingId.set(slot.id);
    this.error.set(null);

    this.availabilityService.delete(slot.id).subscribe({
      next: () => {
        this.slots.update((list) => list.filter((s) => s.id !== slot.id));
        this.savingId.set(null);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.savingId.set(null);
      },
    });
  }
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function lastOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
