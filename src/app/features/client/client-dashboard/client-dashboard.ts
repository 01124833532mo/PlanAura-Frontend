import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AlertBanner } from '../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../shared/ui/button/button';
import { AppError } from '../../../core/interfaces/api-response.model';
import {
  BookingPaymentStatus,
  BookingRequest,
  BookingStatus,
} from '../../../core/interfaces/booking-request.model';
import { EventPlan } from '../../../core/interfaces/event-plan.model';
import { VendorListItem } from '../../../core/interfaces/vendor-browse.model';
import { AuthService } from '../../../core/services/auth.service';
import { BookingRequestService } from '../../../core/services/booking-request.service';
import { EventPlanService } from '../../../core/services/event-plan.service';
import { NotificationService } from '../../../core/services/notification.service';
import { VendorBrowseService } from '../../../core/services/vendor-browse.service';

/** One row in the "Needs your attention" panel — the whole reason this dashboard was rebuilt: the old
 * version never looked at booking/payment state at all, so a client with a failed remainder charge had
 * no way to discover that from the page they land on after every login. */
interface AttentionItem {
  bookingId: number;
  tone: 'error' | 'pending';
  icon: string;
  title: string;
  detail: string;
  cta: string;
}

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [AlertBanner, Button, DatePipe, DecimalPipe, RouterLink],
  templateUrl: './client-dashboard.html',
  styleUrl: './client-dashboard.css',
})
export class ClientDashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly eventPlanService = inject(EventPlanService);
  private readonly bookingService = inject(BookingRequestService);
  private readonly notificationService = inject(NotificationService);
  private readonly vendorBrowseService = inject(VendorBrowseService);
  private readonly router = inject(Router);

  protected readonly BookingStatus = BookingStatus;

  protected readonly currentUser = this.authService.currentUser;
  protected readonly firstName = computed(() => {
    const name = this.currentUser()?.fullName?.trim();
    return name ? name.split(/\s+/)[0] : null;
  });

  protected readonly plans = signal<EventPlan[]>([]);
  protected readonly bookings = signal<BookingRequest[]>([]);

  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  // ---- Notifications (compact panel — the bell dropdown already owns the full read/mark-read UI,
  // this just surfaces the freshest few so a client doesn't have to open it to notice anything). ----
  protected readonly notifications = this.notificationService.notifications;
  protected readonly notificationsLoading = this.notificationService.loading;
  protected readonly recentNotifications = computed(() => this.notifications().slice(0, 4));

  // ---- Recommended vendors — real data (top-rated, via the existing browse endpoint's own
  // sortBy=rating), not an invented recommendation engine. ----
  protected readonly recommendedVendors = signal<VendorListItem[]>([]);
  protected readonly recommendedLoading = signal(false);

  // ---- Pure display-only aggregates, derived from already-fetched signals — no extra requests. ----
  protected readonly totalPlans = computed(() => this.plans().length);
  protected readonly upcomingCount = computed(() => {
    const now = Date.now();
    return this.plans().filter((plan) => new Date(plan.eventDate).getTime() >= now).length;
  });
  protected readonly activeBookingsCount = computed(
    () => this.bookings().filter((b) => b.status === BookingStatus.Accepted).length,
  );

  /** Bookings that genuinely need the client to act — a failed remainder charge or a past event
   * waiting on delivery confirmation. Deliberately excludes Pending (nothing for the client to do
   * but wait) and CancellationRequested (already submitted, waiting on admin). */
  protected readonly attentionItems = computed<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    for (const b of this.bookings()) {
      if (b.paymentStatus === BookingPaymentStatus.RemainderFailed) {
        items.push({
          bookingId: b.id,
          tone: 'error',
          icon: 'error',
          title: 'A payment needs your attention',
          detail: `We couldn't charge the remaining balance on your ${this.eventDateLabel(b)} booking.`,
          cta: 'Pay remainder',
        });
      } else if (b.status === BookingStatus.AwaitingConfirmation) {
        items.push({
          bookingId: b.id,
          tone: 'pending',
          icon: 'task_alt',
          title: 'Confirm your event happened',
          detail: `Let us know your ${this.eventDateLabel(b)} booking was delivered as planned.`,
          cta: 'Confirm now',
        });
      }
    }
    return items;
  });

  /** The soonest confirmed (Accepted), not-yet-happened booking — the single most useful "what's next"
   * fact for a client who already has plans in motion. */
  protected readonly nextBooking = computed<BookingRequest | null>(() => {
    const now = Date.now();
    const upcoming = this.bookings()
      .filter((b) => b.status === BookingStatus.Accepted && new Date(b.eventDate).getTime() >= now)
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
    return upcoming[0] ?? null;
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.notificationService.loadOnce();

    forkJoin({
      plans: this.eventPlanService.getMyEventPlans(),
      bookings: this.bookingService.listMyBookings({ pageSize: 100 }),
    }).subscribe({
      next: ({ plans, bookings }) => {
        this.plans.set(plans);
        this.bookings.set(bookings.items);
        this.loading.set(false);
      },
      error: (err: AppError) => {
        this.error.set(err);
        this.loading.set(false);
      },
    });

    this.recommendedLoading.set(true);
    this.vendorBrowseService.list({ sortBy: 'rating', pageSize: 3, page: 1 }).subscribe({
      next: (result) => {
        this.recommendedVendors.set(result.items);
        this.recommendedLoading.set(false);
      },
      error: () => {
        this.recommendedVendors.set([]);
        this.recommendedLoading.set(false);
      },
    });
  }

  protected eventDateLabel(booking: BookingRequest): string {
    return new Date(booking.eventDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  protected goToPlans(): void {
    this.router.navigateByUrl('/client/event-plans');
  }

  protected goToUpcoming(): void {
    this.router.navigate(['/client/event-plans'], { queryParams: { filter: 'upcoming' } });
  }

  protected goToBookings(): void {
    this.router.navigateByUrl('/client/bookings');
  }

  protected viewPlan(plan: EventPlan): void {
    this.router.navigate(['/client/event-plans', plan.id]);
  }

  protected viewBooking(bookingId: number): void {
    this.router.navigate(['/client/bookings', bookingId]);
  }

  protected goToNewPlan(): void {
    this.router.navigateByUrl('/client/event-plans/new');
  }

  protected onNotificationClick(notificationId: number, isRead: boolean): void {
    if (!isRead) {
      this.notificationService.markAsRead(notificationId).subscribe();
    }
  }
}
