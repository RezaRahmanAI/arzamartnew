"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface SubmitReviewInput {
  productSlug: string;
  customerName: string;
  rating: number;
  comment: string;
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
        averageRating: stats._avg.rating || input.rating,
        reviewCount: stats._count.id,
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
