import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminClientService } from '../../../../../core/services/admin-client.service';
import { AppError } from '../../../../../core/interfaces/api-response.model';
import { AdminClientFilter, AdminClientListItem } from '../../../../../core/interfaces/admin-client.model';
import { AdminBadge } from '../../../shared/admin-badge/admin-badge';
import { AdminEmptyState } from '../../../shared/admin-empty-state/admin-empty-state';
import { AdminErrorState } from '../../../shared/admin-error-state/admin-error-state';
import { AdminPagination } from '../../../shared/admin-pagination/admin-pagination';
import { AdminSearchBar } from '../../../shared/admin-search-bar/admin-search-bar';
import { AdminSkeletonRows } from '../../../shared/admin-skeleton/admin-skeleton';
import { mapAccountActive } from '../../../shared/status-maps';

/** Client Management list (AdminDashboardPlan.md 2.5). */
@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [RouterLink, DatePipe, AdminBadge, AdminEmptyState, AdminErrorState, AdminPagination, AdminSearchBar, AdminSkeletonRows],
  templateUrl: './client-list.html',
  styleUrl: './client-list.css',
})
export class ClientList implements OnInit {
  private readonly adminClientService = inject(AdminClientService);

  protected readonly mapAccountActive = mapAccountActive;

  protected readonly clients = signal<AdminClientListItem[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<AppError | null>(null);

  protected readonly filter = signal<AdminClientFilter>({ page: 1, pageSize: 20 });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminClientService.list(this.filter()).subscribe({
      next: (result) => {
        this.clients.set(result.items);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  protected onSearch(term: string): void {
    this.filter.update((f) => ({ ...f, search: term || undefined, page: 1 }));
    this.load();
  }

  protected onActiveFilter(isAccountActive: boolean | undefined): void {
    this.filter.update((f) => ({ ...f, isAccountActive, page: 1 }));
    this.load();
  }

  protected onPageChange(page: number): void {
    this.filter.update((f) => ({ ...f, page }));
    this.load();
  }
}
