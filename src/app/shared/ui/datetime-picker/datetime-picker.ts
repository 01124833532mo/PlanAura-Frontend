import {
  Component,
  ElementRef,
  HostListener,
  Input,
  computed,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface DayCell {
  date: Date;
  key: string;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function to24(hour12: number, ampm: 'AM' | 'PM'): number {
  if (ampm === 'AM') {
    return hour12 === 12 ? 0 : hour12;
  }
  return hour12 === 12 ? 12 : hour12 + 12;
}

/**
 * A themed, self-contained date + time picker used instead of the native
 * `datetime-local` popup (which browsers render inconsistently and can't be
 * styled). Implements ControlValueAccessor so it drops into reactive forms,
 * and reads/writes the same local `yyyy-MM-ddTHH:mm` string the form used
 * before, so nothing downstream changes.
 */
@Component({
  selector: 'ui-datetime-picker',
  standalone: true,
  imports: [],
  templateUrl: './datetime-picker.html',
  styleUrl: './datetime-picker.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatetimePicker),
      multi: true,
    },
  ],
})
export class DatetimePicker implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input() placeholder = 'Select date & time';
  @Input() invalid = false;

  protected readonly open = signal(false);
  protected readonly disabled = signal(false);

  protected readonly selectedDay = signal<Date | null>(null);
  protected readonly hour = signal(12);
  protected readonly minute = signal(0);
  protected readonly ampm = signal<'AM' | 'PM'>('PM');

  protected readonly viewMonth = signal(startOfMonth(new Date()));

  protected readonly weekdays = WEEKDAYS;
  protected readonly hours = Array.from({ length: 12 }, (_, i) => i + 1);
  protected readonly minutes = Array.from({ length: 60 }, (_, i) => i);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly monthLabel = computed(() =>
    this.viewMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  );

  protected readonly weeks = computed<DayCell[][]>(() => {
    const month = this.viewMonth();
    const monthIndex = month.getMonth();
    const todayKey = dayKey(new Date());
    const selectedKey = this.selectedDay() ? dayKey(this.selectedDay()!) : null;

    const gridStart = new Date(month);
    gridStart.setDate(1 - month.getDay());

    const weeks: DayCell[][] = [];
    const cursor = new Date(gridStart);
    for (let w = 0; w < 6; w++) {
      const week: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const key = dayKey(cursor);
        week.push({
          date: new Date(cursor),
          key,
          dayNum: cursor.getDate(),
          inMonth: cursor.getMonth() === monthIndex,
          isToday: key === todayKey,
          isSelected: key === selectedKey,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  });

  /** Formatted value shown on the trigger, e.g. "Sat, Jul 18, 2026 · 12:30 PM". */
  protected readonly display = computed(() => {
    const composed = this.composed();
    if (!composed) {
      return '';
    }
    return composed.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  });

  // ─── ControlValueAccessor ───────────────────────────────────────────────
  writeValue(value: string | null): void {
    if (!value) {
      this.selectedDay.set(null);
      return;
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      this.selectedDay.set(null);
      return;
    }
    this.selectedDay.set(startOfDay(d));
    const h = d.getHours();
    this.ampm.set(h >= 12 ? 'PM' : 'AM');
    this.hour.set(((h + 11) % 12) + 1);
    this.minute.set(d.getMinutes());
    this.viewMonth.set(startOfMonth(d));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  // ─── Interactions ───────────────────────────────────────────────────────
  protected toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.open.update((o) => !o);
  }

  protected selectDay(cell: DayCell): void {
    this.selectedDay.set(startOfDay(cell.date));
    this.emit();
  }

  protected onHourChange(value: string): void {
    this.hour.set(Number(value));
    this.emit();
  }

  protected onMinuteChange(value: string): void {
    this.minute.set(Number(value));
    this.emit();
  }

  protected setAmpm(value: 'AM' | 'PM'): void {
    this.ampm.set(value);
    this.emit();
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

  protected clear(): void {
    this.selectedDay.set(null);
    this.onChange('');
  }

  protected done(): void {
    this.open.set(false);
    this.onTouched();
  }

  protected pad(n: number): string {
    return pad(n);
  }

  private composed(): Date | null {
    const day = this.selectedDay();
    if (!day) {
      return null;
    }
    const h24 = to24(this.hour(), this.ampm());
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h24, this.minute());
  }

  private emit(): void {
    const composed = this.composed();
    if (!composed) {
      this.onChange('');
      return;
    }
    const value = `${composed.getFullYear()}-${pad(composed.getMonth() + 1)}-${pad(
      composed.getDate(),
    )}T${pad(composed.getHours())}:${pad(composed.getMinutes())}`;
    this.onChange(value);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) {
      return;
    }
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
      this.onTouched();
    }
  }
}
