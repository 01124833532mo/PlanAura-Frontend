import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { AppError } from '../../../core/interfaces/api-response.model';
import { VendorPackage } from '../../../core/interfaces/vendor-package.model';
import { VendorProfile } from '../../../core/interfaces/vendor-profile.model';
import { VendorPackageService } from '../../../core/services/vendor-package.service';
import { VendorService } from '../../../core/services/vendor.service';

@Component({
  selector: 'app-vendor-details',
  standalone: true,
  imports: [AlertBanner, DecimalPipe],
  templateUrl: './vendor-details.html',
  styleUrl: './vendor-details.css',
})
export class VendorDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vendorService = inject(VendorService);
  private readonly packageService = inject(VendorPackageService);

  protected readonly vendor = signal<VendorProfile | null>(null);
  protected readonly packages = signal<VendorPackage[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  private vendorId = 0;
  private eventPlanId: number | null = null;

  ngOnInit(): void {
    this.vendorId = Number(this.route.snapshot.paramMap.get('id'));
    const eventPlanIdParam = this.route.snapshot.queryParamMap.get('eventPlanId');
    this.eventPlanId = eventPlanIdParam ? Number(eventPlanIdParam) : null;

    this.loading.set(true);
    this.error.set(null);

    this.vendorService.getById(this.vendorId).subscribe({
      next: (vendor) => {
        this.vendor.set(vendor);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });

    this.packageService.getByVendor(this.vendorId, true).subscribe({
      next: (packages) => this.packages.set(packages),
      error: () => this.packages.set([]),
    });
  }

  /** VendorDto's status comes through raw/lowercase ("verified"/"trusted"), unlike VendorListItemDto's capitalized form. */
  protected formatStatus(status: string): string {
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : status;
  }

  protected bookPackage(pkg: VendorPackage): void {
    this.router.navigate(['/client/booking/new'], {
      queryParams: {
        vendorId: this.vendorId,
        packageId: pkg.id,
        eventPlanId: this.eventPlanId ?? undefined,
      },
    });
  }
}
