import { apiClient } from "../client";
import { apiConfig } from "../config";
import { type Review } from "@/lib/reviews";

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
    if (apiConfig.useMockData) {
      return this.getLocalReviews();
    }
    try {
      const res = await apiClient.get<Review[]>("/reviews");
      return Array.isArray(res) ? res : this.getLocalReviews();
    } catch {
      return this.getLocalReviews();
    }
  }

  public async create(review: Review): Promise<Review> {
    const reviews = this.getLocalReviews();
    const updated = [review, ...reviews];
    this.saveLocalReviews(updated);

    try {
      return await apiClient.post<Review>("/reviews", review);
    } catch {
      return review;
    }
  }

  public async delete(id: string): Promise<void> {
    const reviews = this.getLocalReviews();
    const updated = reviews.filter((r) => r.id !== id);
    this.saveLocalReviews(updated);

    try {
      await apiClient.delete<void>(`/reviews/${id}`);
    } catch {
      /* fallback */
    }
  }
}

export const reviewsService = new ReviewsService();
