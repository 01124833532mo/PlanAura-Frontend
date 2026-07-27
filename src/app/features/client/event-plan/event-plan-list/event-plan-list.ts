import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { AppError } from '../../../../core/interfaces/api-response.model';
import { EventPlan } from '../../../../core/interfaces/event-plan.model';
import { EventPlanService } from '../../../../core/services/event-plan.service';
import { notifyError, notifySuccess } from '../../../../shared/utils/notify';

@Component({
  selector: 'app-event-plan-list',
  standalone: true,
  imports: [AlertBanner, Button, ConfirmDialog, DatePipe, DecimalPipe],
  templateUrl: './event-plan-list.html',
  styleUrl: './event-plan-list.css',
})
export class EventPlanList implements OnInit {
  private readonly eventPlanService = inject(EventPlanService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly plans = signal<EventPlan[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly deletingId = signal<number | null>(null);
  protected readonly bookingSuccess = signal(false);
  protected readonly deleteTarget = signal<EventPlan | null>(null);

  // "Upcoming" filter, landed on from the dashboard's Upcoming stat card —
  // same predicate (eventDate >= now) as ClientDashboard.upcomingCount, so
  // the count there and the list here never disagree. Driven off the
  // ?filter=upcoming query param via a live signal (not just route.snapshot)
  // so back/forward and a page refresh all reflect the same state, and
  // toggleUpcomingFilter() below has something to react to when it navigates.
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly upcomingOnly = computed(() => this.queryParamMap().get('filter') === 'upcoming');

  protected readonly displayedPlans = computed(() => {
    if (!this.upcomingOnly()) {
      return this.plans();
    }
    const now = Date.now();
    return this.plans().filter((plan) => new Date(plan.eventDate).getTime() >= now);
  });

  ngOnInit(): void {
    this.bookingSuccess.set(this.route.snapshot.queryParamMap.get('bookingSuccess') === '1');
    this.fetchPlans();
  }

  private fetchPlans(): void {
    this.loading.set(true);
    this.error.set(null);

    this.eventPlanService.getMyEventPlans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });
  }

  protected createPlan(): void {
    this.router.navigateByUrl('/client/event-plans/new');
  }

  protected toggleUpcomingFilter(): void {
    this.router.navigate(['/client/event-plans'], {
      queryParams: this.upcomingOnly() ? {} : { filter: 'upcoming' },
    });
  }

  protected bookVendors(plan: EventPlan): void {
    this.router.navigate(['/client/vendors'], { queryParams: { eventPlanId: plan.id } });
  }

  protected viewPlan(plan: EventPlan): void {
    this.router.navigate(['/client/event-plans', plan.id]);
  }

  protected deletePlan(plan: EventPlan): void {
    this.deleteTarget.set(plan);
  }

  protected cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  protected confirmDelete(): void {
    const plan = this.deleteTarget();
    if (!plan) {
      return;
    }

    this.deletingId.set(plan.id);
    this.error.set(null);

    this.eventPlanService.deleteEventPlan(plan.id).subscribe({
      next: () => {
        this.plans.update((list) => list.filter((p) => p.id !== plan.id));
        this.deletingId.set(null);
        this.deleteTarget.set(null);
        notifySuccess('Event plan deleted.');
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.deletingId.set(null);
        this.deleteTarget.set(null);
        notifyError('Could not delete event plan', err.message);
      },
    });
  }
}
