import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ServiceCategoryService } from '../../../../../core/services/service-category.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import { ServiceCategory, ServiceCategoryPayload } from '../../../../../core/interfaces/vendor.model';
import { AdminBadge } from '../../../shared/admin-badge/admin-badge';
import { AdminConfirmDialog } from '../../../shared/admin-confirm-dialog/admin-confirm-dialog';
import { AdminEmptyState } from '../../../shared/admin-empty-state/admin-empty-state';
import { AdminErrorState } from '../../../shared/admin-error-state/admin-error-state';
import { adminNotifyError, adminNotifySuccess } from '../../../shared/admin-notify';
import { AdminSkeletonRows } from '../../../shared/admin-skeleton/admin-skeleton';

interface CategoryFormState {
  id: number | null;
  nameEn: string;
  slug: string;
  isActive: boolean;
  iconFile: File | null;
}

const EMPTY_FORM: CategoryFormState = { id: null, nameEn: '', slug: '', isActive: true, iconFile: null };

/** Service category management (AdminDashboardPlan.md 2.14) — create/edit/deactivate/delete categories. */
@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [FormsModule, DatePipe, AdminBadge, AdminConfirmDialog, AdminEmptyState, AdminErrorState, AdminSkeletonRows],
  templateUrl: './category-list.html',
  styleUrl: './category-list.css',
})
export class CategoryList implements OnInit {
  private readonly categoryService = inject(ServiceCategoryService);

  protected readonly categories = signal<ServiceCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  protected readonly formOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<AppError | null>(null);
  protected form: CategoryFormState = { ...EMPTY_FORM };

  protected readonly deleteTarget = signal<ServiceCategory | null>(null);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<AppError | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.categoryService.getAllCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.form = { ...EMPTY_FORM };
    this.saveError.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(category: ServiceCategory): void {
    this.form = { id: category.id, nameEn: category.nameEn, slug: category.slug, isActive: category.isActive, iconFile: null };
    this.saveError.set(null);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    if (this.saving()) return;
    this.formOpen.set(false);
  }

  protected onIconSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.iconFile = input.files?.[0] ?? null;
  }

  protected get canSubmit(): boolean {
    return this.form.nameEn.trim().length > 0 && this.form.slug.trim().length > 0 && !this.saving();
  }

  protected submitForm(): void {
    if (!this.canSubmit) return;

    this.saving.set(true);
    this.saveError.set(null);

    const payload: ServiceCategoryPayload = {
      nameEn: this.form.nameEn.trim(),
      slug: this.form.slug.trim(),
      isActive: this.form.isActive,
      iconFile: this.form.iconFile ?? undefined,
    };

    const call = this.form.id ? this.categoryService.update(this.form.id, payload) : this.categoryService.create(payload);
    call.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        adminNotifySuccess(this.form.id ? 'Category updated.' : 'Category created.');
        this.load();
      },
      error: (err: AppError) => {
        this.saveError.set(err);
        this.saving.set(false);
      },
    });
  }

  protected openDelete(category: ServiceCategory): void {
    this.deleteError.set(null);
    this.deleteTarget.set(category);
  }

  protected cancelDelete(): void {
    if (this.deleting()) return;
    this.deleteTarget.set(null);
  }

  protected confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.categoryService.delete(target.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        adminNotifySuccess('Category deleted.');
        this.load();
      },
      error: (err: AppError) => {
        this.deleteError.set(err);
        this.deleting.set(false);
        adminNotifyError('Could not delete category', err.message);
      },
    });
  }
}
