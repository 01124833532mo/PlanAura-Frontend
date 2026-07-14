import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { SelectField, SelectOption } from '../../../../shared/ui/select-field/select-field';
import { TextField } from '../../../../shared/ui/text-field/text-field';
import { AppError } from '../../../../core/interfaces/api-response.model';
import { ServiceCategory } from '../../../../core/interfaces/vendor.model';
import { VendorPackage } from '../../../../core/interfaces/vendor-package.model';
import { ServiceCategoryService } from '../../../../core/services/service-category.service';
import { VendorPackageService } from '../../../../core/services/vendor-package.service';
import { PackageDetails } from '../package-details/package-details';

@Component({
  selector: 'app-package-browser',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TextField,
    SelectField,
    Button,
    AlertBanner,
    DecimalPipe,
    PackageDetails,
  ],
  templateUrl: './package-browser.html',
  styleUrl: './package-browser.css',
})
export class PackageBrowser implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly packageService = inject(VendorPackageService);
  private readonly categoryService = inject(ServiceCategoryService);

  protected readonly packages = signal<VendorPackage[]>([]);
  protected readonly categoryOptions = signal<SelectOption[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  protected readonly selectedPackage = signal<VendorPackage | null>(null);
  protected readonly detailsLoading = signal(false);

  protected readonly filterForm = this.fb.group({
    title: this.fb.nonNullable.control(''),
    categoryId: this.fb.control<number | null>(null),
    activeOnly: this.fb.nonNullable.control(false),
  });

  ngOnInit(): void {
    this.categoryService.getActiveCategories().subscribe({
      next: (categories: ServiceCategory[]) =>
        this.categoryOptions.set(categories.map((c) => ({ value: c.id, label: c.nameEn }))),
    });

    this.runSearch();
  }

  protected runSearch(): void {
    const raw = this.filterForm.getRawValue();
    this.loading.set(true);
    this.error.set(null);

    this.packageService
      .search({
        title: raw.title.trim() || undefined,
        categoryId: raw.categoryId ?? undefined,
        activeOnly: raw.activeOnly,
      })
      .subscribe({
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

  protected resetFilters(): void {
    this.filterForm.reset({ title: '', categoryId: null, activeOnly: false });
    this.runSearch();
  }

  protected viewDetails(pkg: VendorPackage): void {
    this.selectedPackage.set(pkg);
    this.detailsLoading.set(true);

    this.packageService.getById(pkg.id).subscribe({
      next: (fresh) => {
        this.selectedPackage.set(fresh);
        this.detailsLoading.set(false);
      },
      error: () => this.detailsLoading.set(false),
    });
  }

  protected closeDetails(): void {
    this.selectedPackage.set(null);
  }
}
