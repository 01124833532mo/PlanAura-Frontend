import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { AppError } from '../../../../core/interfaces/api-response.model';
import { EventPlan } from '../../../../core/interfaces/event-plan.model';
import { EventPlanService } from '../../../../core/services/event-plan.service';

@Component({
  selector: 'app-event-plan-list',
  standalone: true,
  imports: [AlertBanner, Button, DatePipe, DecimalPipe],
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

  protected bookVendors(plan: EventPlan): void {
    this.router.navigate(['/client/vendors'], { queryParams: { eventPlanId: plan.id } });
  }

  protected viewPlan(plan: EventPlan): void {
    this.router.navigate(['/client/event-plans', plan.id]);
  }

  protected deletePlan(plan: EventPlan): void {
    if (!confirm(`Delete "${plan.title}"? This can't be undone.`)) {
      return;
    }

    this.deletingId.set(plan.id);
    this.error.set(null);

    this.eventPlanService.deleteEventPlan(plan.id).subscribe({
      next: () => {
        this.plans.update((list) => list.filter((p) => p.id !== plan.id));
        this.deletingId.set(null);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.deletingId.set(null);
      },
    });
  }
}
