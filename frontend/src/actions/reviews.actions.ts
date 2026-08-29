"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getProductReviews, getRecentReviews } from "@/lib/data/reviews";
import type { Review } from "@/lib/reviews";

export interface SubmitReviewInput {
  productSlug: string;
  customerName: string;
  rating: number;
  comment: string;
}

export async function getReviewsAction(productSlug?: string): Promise<Review[]> {
  try {
    if (productSlug) {
      return await getProductReviews(productSlug);
    }
    return await getRecentReviews();
  } catch (error) {
    console.error("getReviewsAction error:", error);
    return [];
  }
}

export async function submitReviewAction(input: SubmitReviewInput): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanSlug = input.productSlug.trim().toLowerCase();
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug: cleanSlug }, { slug: cleanSlug.replace(/-/g, "") }],
      },
    });

    if (!product) {
      return { success: false, error: "Product not found." };
    }

    // Find or create a user for review author
    let user = await prisma.user.findFirst({
      where: { email: `${input.customerName.toLowerCase().replace(/\s+/g, ".")}@customer.local` },
    });

    if (!user) {
      const parts = input.customerName.trim().split(" ");
      const firstName = parts[0] || "Customer";
      const lastName = parts.slice(1).join(" ") || "User";

      user = await prisma.user.create({
        data: {
          email: `${input.customerName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${Date.now()}@customer.local`,
          passwordHash: "NOPASSWORD",
          firstName,
          lastName,
          role: 1,
          isActive: true,
        },
      });
    }

    await prisma.review.create({
      data: {
        productId: product.id,
        userId: user.id,
        rating: Math.min(5, Math.max(1, input.rating)),
        comment: input.comment.trim(),
        isApproved: true,
      },
    });

    // Update product rating and review count
    const stats = await prisma.review.aggregate({
      where: { productId: product.id, isApproved: true },
      _avg: { rating: true },
      _count: { id: true },
    });

    await prisma.product.update({
      where: { id: product.id },
      data: {
        averageRating: stats._avg.rating || 5.0,
        reviewCount: stats._count.id || 1,
      },
    });

    revalidatePath(`/product/${product.slug}`);
    revalidatePath("/admin/reviews");

    return { success: true };
  } catch (error: unknown) {
    console.error("submitReviewAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to submit review." };
  }
}

export async function deleteReviewAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const numericId = parseInt(id.replace(/\D/g, ""), 10);

    let review = null;
    if (!isNaN(numericId) && numericId > 0) {
      review = await prisma.review.findFirst({
        where: { id: numericId },
      });
    }

    if (!review) {
      review = await prisma.review.findFirst({
        where: { comment: { contains: id } },
      });
    }

    if (review) {
      await prisma.review.delete({
        where: { id: review.id },
      });

      // Update product rating and review count
      const stats = await prisma.review.aggregate({
        where: { productId: review.productId, isApproved: true },
        _avg: { rating: true },
        _count: { id: true },
      });

      await prisma.product.update({
        where: { id: review.productId },
        data: {
          averageRating: stats._avg.rating || 5.0,
          reviewCount: stats._count.id || 0,
        },
      });
    }

    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteReviewAction error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete review." };
  }
}

