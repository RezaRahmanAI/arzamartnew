import type { Review } from "@/lib/reviews";
import { getRecentReviews, getProductReviews } from "@/lib/data/reviews";
import { submitReviewAction } from "@/actions/reviews.actions";

const REVIEWS_KEY = "arza-reviews-v1";
const initialMockReviews: Review[] = [];

class ReviewsService {
  private getLocalReviews(): Review[] {
    if (typeof window === "undefined") return initialMockReviews;
    try {
      const raw = window.localStorage.getItem(REVIEWS_KEY);
      return raw ? JSON.parse(raw) : initialMockReviews;
    } catch {
      return initialMockReviews;
    }
  }

  private saveLocalReviews(reviews: Review[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
    } catch {
      /* ignore */
    }
  }

  public async getAll(): Promise<Review[]> {
    try {
      const reviews = await getRecentReviews(50);
      if (reviews.length > 0) {
        this.saveLocalReviews(reviews);
        return reviews;
      }
      return this.getLocalReviews();
    } catch {
      return this.getLocalReviews();
    }
  }

  public async getByProduct(slug: string): Promise<Review[]> {
    try {
      const reviews = await getProductReviews(slug);
      return reviews;
    } catch {
      return [];
    }
  }

  public async create(review: Review): Promise<Review> {
    const reviews = this.getLocalReviews();
    const updated = [review, ...reviews];
    this.saveLocalReviews(updated);

    try {
      await submitReviewAction({
        productSlug: review.productSlug,
        customerName: review.customerName,
        rating: review.rating,
        comment: review.comment,
      });
      return review;
    } catch {
      return review;
    }
  }

  public async delete(id: string): Promise<void> {
    const reviews = this.getLocalReviews();
    const updated = reviews.filter((r) => r.id !== id);
    this.saveLocalReviews(updated);
  }
}

export const reviewsService = new ReviewsService();
