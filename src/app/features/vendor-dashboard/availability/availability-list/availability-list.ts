import { DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
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

@Component({
  selector: 'app-availability-list',
  standalone: true,
  imports: [AlertBanner, Button, AvailabilityForm, DatePipe],
  templateUrl: './availability-list.html',
  styleUrl: './availability-list.css',
})
export class AvailabilityList {
  private readonly availabilityService = inject(VendorAvailabilityService);
  private readonly vendorProfileState = inject(VendorProfileStateService);

  protected readonly AvailabilityStatus = AvailabilityStatus;

  protected readonly slots = signal<VendorAvailability[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly formOpen = signal(false);
  protected readonly editingSlot = signal<VendorAvailability | null>(null);
  protected readonly savingId = signal<number | 'new' | null>(null);

  constructor() {
    effect(() => {
      const vendorId = this.vendorProfileState.vendorId();
      if (vendorId !== null) {
        this.fetchSlots(vendorId);
      }
    });
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

  private fetchSlots(vendorId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.availabilityService.getByVendor(vendorId).subscribe({
      next: (slots) => {
        this.slots.set(
          [...slots].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
        );
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
    this.formOpen.set(true);
  }

  protected openEdit(slot: VendorAvailability): void {
    this.editingSlot.set(slot);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingSlot.set(null);
  }

  protected handleSave(value: UpdateVendorAvailabilityPayload): void {
    const editing = this.editingSlot();
    if (editing) {
      this.saveEdit(editing.id, value);
      return;
    }

    const vendorId = this.vendorProfileState.vendorId();
    if (vendorId === null) {
      return;
    }
    this.saveCreate({ ...value, vendorId });
  }

  private saveCreate(payload: CreateVendorAvailabilityPayload): void {
    this.savingId.set('new');
    this.error.set(null);

    this.availabilityService.create(payload).subscribe({
      next: (created) => {
        this.slots.update((list) =>
          [...list, created].sort(
            (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
          ),
        );
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
        this.slots.update((list) =>
          list
            .map((s) => (s.id === id ? updated : s))
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
        );
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
