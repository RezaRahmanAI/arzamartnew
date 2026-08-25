import prisma from "@/lib/prisma";
import type { Review } from "@/lib/reviews";

export async function getProductReviews(productIdOrSlug: string): Promise<Review[]> {
  try {
    const isUuid = productIdOrSlug.length === 36 && productIdOrSlug.includes("-");

    const rows = await prisma.review.findMany({
      where: {
        isApproved: true,
        product: isUuid ? { id: productIdOrSlug } : { slug: productIdOrSlug.toLowerCase() },
      },
      include: {
        user: true,
        product: true,
      },
      orderBy: { createdAtUtc: "desc" },
    });

    return rows.map((r) => ({
      id: `rev-${r.id}`,
      productSlug: r.product.slug,
      productName: r.product.name,
      customerName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : "Customer",
      rating: r.rating,
      comment: r.comment,
      date: r.createdAtUtc.toISOString().slice(0, 10),
    }));
  } catch (error) {
    console.error(`getProductReviews query failed for ${productIdOrSlug}:`, error);
    return [];
  }
}

export async function getRecentReviews(limit = 20): Promise<Review[]> {
  try {
    const rows = await prisma.review.findMany({
      where: { isApproved: true },
      include: {
        user: true,
        product: true,
      },
      orderBy: { createdAtUtc: "desc" },
      take: limit,
    });

    return rows.map((r) => ({
      id: `rev-${r.id}`,
      productSlug: r.product.slug,
      productName: r.product.name,
      customerName: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : "Customer",
      rating: r.rating,
      comment: r.comment,
      date: r.createdAtUtc.toISOString().slice(0, 10),
    }));
  } catch (error) {
    console.error("getRecentReviews query failed:", error);
    return [];
  }
}
