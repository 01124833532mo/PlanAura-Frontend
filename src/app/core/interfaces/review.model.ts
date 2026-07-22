/** Mirrors Planura.Core.Application.Models.ReviewDto. */
export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  clientName: string;
  clientAvatarUrl: string | null;
  createdAt: string;
  vendorResponse: string | null;
  vendorRespondedAt: string | null;
}

/** Mirrors Planura.Core.Application.Models.ReviewSummaryDto. */
export interface ReviewSummary {
  avgRating: number;
  totalReviews: number;
  fiveStar: number;
  fourStar: number;
  threeStar: number;
  twoStar: number;
  oneStar: number;
}

/** Mirrors Planura.Core.Application.Models.ReviewFilterDto. */
export interface ReviewFilter {
  minRating?: number;
  page?: number;
  pageSize?: number;
}

/** Mirrors Planura.Core.Application.Models.PagedResult<ReviewDto>. */
export interface PagedReviewList {
  items: Review[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/** Mirrors Planura.Core.Application.Models.CreateReviewDto. */
export interface CreateReview {
  bookingRequestId: number;
  rating: number;
  comment?: string;
}

/** Mirrors Planura.Core.Application.Models.UpdateReviewDto. */
export interface UpdateReview {
  rating: number;
  comment?: string;
}
