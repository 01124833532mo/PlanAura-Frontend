import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/app-config';
import {
  CreateReview,
  PagedReviewList,
  Review,
  ReviewFilter,
  ReviewSummary,
} from '../interfaces/review.model';

/** Wraps ReviewsController (api/reviews). */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  private buildParams(filter: ReviewFilter): HttpParams {
    let params = new HttpParams();
    if (filter.minRating !== undefined) {
      params = params.set('minRating', filter.minRating);
    }
    if (filter.page !== undefined) {
      params = params.set('page', filter.page);
    }
    if (filter.pageSize !== undefined) {
      params = params.set('pageSize', filter.pageSize);
    }
    return params;
  }

  /** GET /api/reviews/incoming — reviews clients left for the logged-in vendor (VendorOnly). */
  getMyReviews(filter: ReviewFilter = {}): Observable<PagedReviewList> {
    return this.http.get<PagedReviewList>(`${API_BASE_URL}/reviews/incoming`, {
      params: this.buildParams(filter),
    });
  }

  /** GET /api/reviews/incoming/summary — the logged-in vendor's rating summary. */
  getMySummary(): Observable<ReviewSummary> {
    return this.http.get<ReviewSummary>(`${API_BASE_URL}/reviews/incoming/summary`);
  }

  /** POST /api/reviews/{reviewId}/response — vendor replies to a review. */
  respond(reviewId: number, response: string): Observable<Review> {
    return this.http.post<Review>(`${API_BASE_URL}/reviews/${reviewId}/response`, { response });
  }

  /** GET /api/reviews/vendor/{vendorId} — public list of a vendor's reviews. */
  getVendorReviews(vendorId: number, filter: ReviewFilter = {}): Observable<PagedReviewList> {
    return this.http.get<PagedReviewList>(`${API_BASE_URL}/reviews/vendor/${vendorId}`, {
      params: this.buildParams(filter),
    });
  }

  /** GET /api/reviews/vendor/{vendorId}/summary — public rating summary. */
  getVendorSummary(vendorId: number): Observable<ReviewSummary> {
    return this.http.get<ReviewSummary>(`${API_BASE_URL}/reviews/vendor/${vendorId}/summary`);
  }

  /** POST /api/reviews — a client leaves a review for a booking. */
  createReview(dto: CreateReview): Observable<Review> {
    return this.http.post<Review>(`${API_BASE_URL}/reviews`, dto);
  }
}
