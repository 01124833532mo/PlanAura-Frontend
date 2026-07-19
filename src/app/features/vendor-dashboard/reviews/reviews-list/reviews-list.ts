import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertBanner } from '../../../../shared/ui/alert-banner/alert-banner';
import { Button } from '../../../../shared/ui/button/button';
import { AppError } from '../../../../core/interfaces/api-response.model';
import { PagedReviewList, Review, ReviewSummary } from '../../../../core/interfaces/review.model';
import { ReviewService } from '../../../../core/services/review.service';

interface RatingFilter {
  label: string;
  value: number; // 0 = all, otherwise minimum stars
}

@Component({
  selector: 'app-reviews-list',
  standalone: true,
  imports: [AlertBanner, Button, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './reviews-list.html',
  styleUrl: './reviews-list.css',
})
export class ReviewsList implements OnInit {
  private readonly reviewService = inject(ReviewService);

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly breakdownRows = [5, 4, 3, 2, 1];

  protected readonly filters: readonly RatingFilter[] = [
    { label: 'All', value: 0 },
    { label: '5★', value: 5 },
    { label: '4★ & up', value: 4 },
    { label: '3★ & up', value: 3 },
    { label: '2★ & up', value: 2 },
    { label: '1★ & up', value: 1 },
  ];
  protected readonly activeFilter = signal(0);

  protected readonly summary = signal<ReviewSummary | null>(null);
  protected readonly reviews = signal<Review[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);

  // Inline reply state
  protected readonly replyingId = signal<number | null>(null);
  protected replyText = '';
  protected readonly replySaving = signal(false);
  protected readonly replyError = signal<AppError | null>(null);

  private readonly pageSize = 10;
  protected readonly page = signal(1);
  protected readonly totalCount = signal(0);
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / this.pageSize)),
  );

  ngOnInit(): void {
    this.loadSummary();
    this.loadReviews();
  }

  private loadSummary(): void {
    this.reviewService.getMySummary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: (err: AppError) => this.error.set(err),
    });
  }

  private loadReviews(): void {
    this.loading.set(true);
    this.error.set(null);

    const minRating = this.activeFilter();
    this.reviewService
      .getMyReviews({
        minRating: minRating > 0 ? minRating : undefined,
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (result: PagedReviewList) => {
          this.reviews.set(result.items);
          this.totalCount.set(result.totalCount);
          this.loading.set(false);
        },
        error: (err: AppError) => {
          this.error.set(err);
          this.loading.set(false);
        },
      });
  }

  protected selectFilter(value: number): void {
    if (this.activeFilter() === value) {
      return;
    }
    this.activeFilter.set(value);
    this.page.set(1);
    this.loadReviews();
  }

  protected prevPage(): void {
    if (this.page() <= 1) {
      return;
    }
    this.page.update((p) => p - 1);
    this.loadReviews();
  }

  protected nextPage(): void {
    if (this.page() >= this.totalPages()) {
      return;
    }
    this.page.update((p) => p + 1);
    this.loadReviews();
  }

  /** Percentage width for a star-count bar in the breakdown. */
  protected breakdownPercent(star: number): number {
    const s = this.summary();
    if (!s || s.totalReviews === 0) {
      return 0;
    }
    return Math.round((this.countFor(star) / s.totalReviews) * 100);
  }

  /** Whether a star in the average-rating display should appear filled. */
  protected avgFilled(star: number): boolean {
    const s = this.summary();
    return !!s && star <= Math.round(s.avgRating);
  }

  protected countFor(star: number): number {
    const s = this.summary();
    if (!s) {
      return 0;
    }
    switch (star) {
      case 5:
        return s.fiveStar;
      case 4:
        return s.fourStar;
      case 3:
        return s.threeStar;
      case 2:
        return s.twoStar;
      case 1:
        return s.oneStar;
      default:
        return 0;
    }
  }

  protected initial(name: string): string {
    return name?.trim()?.charAt(0)?.toUpperCase() || '?';
  }

  protected openReply(review: Review): void {
    this.replyingId.set(review.id);
    this.replyText = review.vendorResponse ?? '';
    this.replyError.set(null);
  }

  protected cancelReply(): void {
    if (this.replySaving()) {
      return;
    }
    this.replyingId.set(null);
    this.replyText = '';
  }

  protected submitReply(review: Review): void {
    const text = this.replyText.trim();
    if (text.length === 0) {
      return;
    }

    this.replySaving.set(true);
    this.replyError.set(null);

    this.reviewService.respond(review.id, text).subscribe({
      next: (updated) => {
        this.reviews.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
        this.replySaving.set(false);
        this.replyingId.set(null);
        this.replyText = '';
      },
      error: (err: AppError) => {
        this.replyError.set(err);
        this.replySaving.set(false);
      },
    });
  }
}
