import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../shared/ui/button/button';
import { AppError } from '../../../core/interfaces/api-response.model';
import { EventPlan } from '../../../core/interfaces/event-plan.model';
import { EventPlanService } from '../../../core/services/event-plan.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [AlertBanner, Button, DatePipe, RouterLink],
  templateUrl: './client-dashboard.html',
  styleUrl: './client-dashboard.css',
})
export class ClientDashboard implements OnInit {
  private readonly eventPlanService = inject(EventPlanService);
  private readonly router = inject(Router);

  protected readonly plans = signal<EventPlan[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  // Pure display-only aggregates for the dashboard's summary stat cards —
  // derived from the already-fetched `plans` signal, no extra requests.
  protected readonly totalPlans = computed(() => this.plans().length);
  protected readonly upcomingCount = computed(() => {
    const now = Date.now();
    return this.plans().filter((plan) => new Date(plan.eventDate).getTime() >= now).length;
  });

  ngOnInit(): void {
    this.loading.set(true);
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

  protected goToPlans(): void {
    this.router.navigateByUrl('/client/event-plans');
  }

  protected viewPlan(plan: EventPlan): void {
    this.router.navigate(['/client/event-plans', plan.id]);
  }

  protected goToNewPlan(): void {
    this.router.navigateByUrl('/client/event-plans/new');
  }
}
