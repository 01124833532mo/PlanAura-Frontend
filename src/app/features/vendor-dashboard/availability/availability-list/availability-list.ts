import { Component, computed, effect, inject, signal } from '@angular/core';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  AvailabilityStatus,
  CreateVendorAvailabilityPayload,
  UpdateVendorAvailabilityPayload,
  VendorAvailability,
} from '../../../../core/interfaces/vendor-availability.model';
import { VendorAvailabilityService } from '../../../../core/services/vendor-availability.service';
import { VendorProfileStateService } from '../../../../core/services/vendor-profile-state.service';
import { AvailabilityForm } from '../availability-form/availability-form';

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
  imports: [AlertBanner, Button, AvailabilityForm],
  templateUrl: './availability-list.html',
  styleUrl: './availability-list.css',
})
export class AvailabilityList {
  private readonly availabilityService = inject(VendorAvailabilityService);
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

function formatDateTime(d: Date): string {
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
