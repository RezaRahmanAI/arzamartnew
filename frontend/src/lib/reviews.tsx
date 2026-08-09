"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { reviewsService } from "./api/services/reviews.service";

export type Review = {
  id: string;
  productSlug: string;
  productName: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
};

type ReviewsContextValue = {
  reviews: Review[];
  isLoading: boolean;
  addReview: (review: Review) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
};

const ReviewsContext = createContext<ReviewsContextValue | null>(null);

export function ReviewsProvider({ children }: { children: ReactNode }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchReviewsData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await reviewsService.getAll();
      setReviews(data);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewsData();
  }, [fetchReviewsData]);

  const addReview = useCallback(async (review: Review) => {
    setReviews((prev) => [review, ...prev]);
    try {
      await reviewsService.create(review);
    } catch (err) {
      console.error("Failed to sync review creation with API:", err);
    }
  }, []);

  const deleteReview = useCallback(async (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    try {
      await reviewsService.delete(id);
    } catch (err) {
      console.error("Failed to sync review deletion with API:", err);
    }
  }, []);

  const value = useMemo<ReviewsContextValue>(
    () => ({
      reviews,
      isLoading,
      addReview,
      deleteReview,
    }),
    [reviews, isLoading, addReview, deleteReview]
  );

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
}

export function useReviews() {
  const ctx = useContext(ReviewsContext);
  if (!ctx) throw new Error("useReviews must be used inside ReviewsProvider");
  return ctx;
}
