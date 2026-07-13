import { DecimalPipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { AppError } from '../../../../core/interfaces/api-response.model';
import {
  CreateVendorPackagePayload,
  UpdateVendorPackagePayload,
  VendorPackage,
} from '../../../../core/interfaces/vendor-package.model';
import { VendorPackageService } from '../../../../core/services/vendor-package.service';
import { VendorProfileStateService } from '../../../../core/services/vendor-profile-state.service';
import { PackageForm } from '../package-form/package-form';

@Component({
  selector: 'app-package-list',
  standalone: true,
  imports: [AlertBanner, Button, PackageForm, DecimalPipe],
  templateUrl: './package-list.html',
  styleUrl: './package-list.css',
})
export class PackageList {
  private readonly packageService = inject(VendorPackageService);
  private readonly vendorProfileState = inject(VendorProfileStateService);

  protected readonly packages = signal<VendorPackage[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly formOpen = signal(false);
  protected readonly editingPackage = signal<VendorPackage | null>(null);
  protected readonly savingId = signal<number | 'new' | null>(null);

  constructor() {
    effect(() => {
      const vendorId = this.vendorProfileState.vendorId();
      if (vendorId !== null) {
        this.fetchPackages(vendorId);
      }
    });
  }

  private fetchPackages(vendorId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.packageService.getByVendor(vendorId).subscribe({
      next: (packages) => {
        this.packages.set(packages);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.editingPackage.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(pkg: VendorPackage): void {
    this.editingPackage.set(pkg);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingPackage.set(null);
  }

  protected handleSave(value: UpdateVendorPackagePayload): void {
    const editing = this.editingPackage();
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

  private saveCreate(payload: CreateVendorPackagePayload): void {
    this.savingId.set('new');
    this.error.set(null);

    this.packageService.create(payload).subscribe({
      next: (created) => {
        this.packages.update((list) => [created, ...list]);
        this.savingId.set(null);
        this.closeForm();
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.savingId.set(null);
      },
    });
  }

  protected saveEdit(id: number, payload: UpdateVendorPackagePayload): void {
    this.savingId.set(id);
    this.error.set(null);

    this.packageService.update(id, payload).subscribe({
      next: (updated) => {
        this.packages.update((list) => list.map((p) => (p.id === id ? updated : p)));
        this.savingId.set(null);
        this.closeForm();
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.savingId.set(null);
      },
    });
  }

  protected toggleActive(pkg: VendorPackage): void {
    this.savingId.set(pkg.id);
    this.error.set(null);

    const payload: UpdateVendorPackagePayload = {
      title: pkg.title,
      description: pkg.description ?? undefined,
      basePrice: pkg.basePrice,
      currency: pkg.currency,
      maxGuests: pkg.maxGuests ?? undefined,
      includes: pkg.includes ?? undefined,
      isActive: !pkg.isActive,
    };

    this.packageService.update(pkg.id, payload).subscribe({
      next: (updated) => {
        this.packages.update((list) => list.map((p) => (p.id === pkg.id ? updated : p)));
        this.savingId.set(null);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.savingId.set(null);
      },
    });
  }

  protected deletePackage(pkg: VendorPackage): void {
    if (!confirm(`Delete "${pkg.title}"? This can't be undone.`)) {
      return;
    }

    this.savingId.set(pkg.id);
    this.error.set(null);

    this.packageService.delete(pkg.id).subscribe({
      next: () => {
        this.packages.update((list) => list.filter((p) => p.id !== pkg.id));
        this.savingId.set(null);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.savingId.set(null);
      },
    });
  }
}
