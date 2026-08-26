import prisma from "@/lib/prisma";
import type { Product } from "@/lib/shop-data";
import { Prisma } from "@prisma/client";
import { sortSizes } from "@/lib/utils";

export function mapPrismaProduct(p: {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  fullDescription: string;
  basePrice: Prisma.Decimal | number | string;
  discountPrice: Prisma.Decimal | number | string | null;
  isFeatured: boolean;
  isActive: boolean;
  isBundle: boolean;
  bundleProducts: string | null;
  averageRating: Prisma.Decimal | number | string;
  reviewCount: number;
  purchaseRate: Prisma.Decimal | number | string;
  badge: string | null;
  category?: { id: number; name: string; slug: string } | null;
  images?: { id: number; imageUrl: string; isMain: boolean; displayOrder: number }[];
  variants?: { id: string; name: string; sku: string; priceOverride: Prisma.Decimal | number | string | null; stockQuantity: number; isActive: boolean }[];
}): Product {
  const basePrice = Number(p.basePrice) || 0;
  const discountPrice = p.discountPrice !== null && p.discountPrice !== undefined ? Number(p.discountPrice) : null;
  const hasDiscount = discountPrice !== null && discountPrice > 0 && discountPrice < basePrice;
  const activePrice = hasDiscount ? discountPrice : basePrice;
  const compareAt = hasDiscount ? basePrice : undefined;

  const sortedImages = p.images ? [...p.images].sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0) || a.displayOrder - b.displayOrder) : [];
  const mainImage = sortedImages.find((img) => img.isMain)?.imageUrl || sortedImages[0]?.imageUrl || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";
  const allImages = sortedImages.map((img) => img.imageUrl);

  const cleanSizeLabel = (name: string) => {
    return name
      .replace(/^Size:\s*/i, "")
      .replace(/^(?:Pack\s+of\s+\d+|Combo\s+Pack|Set\s+Pack)\s*\(([^)]+)\)$/i, "$1")
      .trim();
  };

  const variants = p.variants || [];
  const rawSizes = variants.length > 0
    ? variants.map((v) => cleanSizeLabel(v.name))
    : ["M", "L", "XL", "XXL"];
  const sizes = sortSizes(Array.from(new Set(rawSizes)));

  const sizePrices: Record<string, number> = {};
  const sizeStock: Record<string, number> = {};

  variants.forEach((v) => {
    const cleanSize = cleanSizeLabel(v.name);
    sizePrices[cleanSize] = v.priceOverride !== null && v.priceOverride !== undefined ? Number(v.priceOverride) : activePrice;
    sizeStock[cleanSize] = v.stockQuantity;
  });

  let parsedBundleProducts: string[] | undefined = undefined;
  if (p.bundleProducts) {
    try {
      parsedBundleProducts = JSON.parse(p.bundleProducts);
    } catch {
      parsedBundleProducts = p.bundleProducts.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category?.slug || "t-shirts",
    price: activePrice,
    compareAt: compareAt,
    mrp: basePrice,
    image: mainImage,
    images: allImages.length > 0 ? allImages : [mainImage],
    sizes: sizes.length > 0 ? sizes : ["M", "L", "XL", "XXL"],
    sizePrices,
    sizeStock,
    description: p.shortDescription || p.fullDescription || "",
    purchaseRate: Number(p.purchaseRate) || basePrice * 0.7,
    badge: p.badge || undefined,
    isBundle: p.isBundle,
    bundleProducts: parsedBundleProducts,
    isActive: p.isActive,
    acceptPreOrder: p.badge?.includes("PREORDER_ENABLED") ?? false,
  };
}

export async function getProducts(options?: {
  page?: number;
  limit?: number;
  search?: string;
  categorySlug?: string;
  categoryId?: number;
  isFeatured?: boolean;
  activeOnly?: boolean;
  isActive?: boolean;
}): Promise<{ products: Product[]; totalCount: number }> {
  try {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    } else if (options?.activeOnly === true) {
      where.isActive = true;
    }

    if (options?.isFeatured) {
      where.isFeatured = true;
    }

    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    } else if (options?.categorySlug) {
      where.category = { slug: options.categorySlug.toLowerCase() };
    }

    if (options?.search) {
      const search = options.search.trim();
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { sku: { contains: search } },
        { shortDescription: { contains: search } },
      ];
    }

    const [rows, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: true,
          variants: true,
        },
        orderBy: { createdAtUtc: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products: rows.map(mapPrismaProduct),
      totalCount,
    };
  } catch (error) {
    console.error("getProducts database query failed:", error);
    return { products: [], totalCount: 0 };
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const cleanSlug = slug.trim().toLowerCase();
    const row = await prisma.product.findFirst({
      where: {
        OR: [
          { slug: cleanSlug },
          { slug: cleanSlug.replace(/-/g, "") },
        ],
      },
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });

    if (!row) return null;
    return mapPrismaProduct(row);
  } catch (error) {
    console.error(`getProductBySlug query failed for ${slug}:`, error);
    return null;
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const row = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });

    if (!row) return null;
    return mapPrismaProduct(row);
  } catch (error) {
    console.error(`getProductById query failed for ${id}:`, error);
    return null;
  }
}

export async function getRelatedProducts(productId: string, categoryId: number, limit = 8): Promise<Product[]> {
  try {
    const rows = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: productId },
        categoryId: categoryId,
      },
      include: {
        category: true,
        images: true,
        variants: true,
      },
      take: limit,
      orderBy: { createdAtUtc: "desc" },
    });

    if (rows.length < limit) {
      const remainingLimit = limit - rows.length;
      const otherRows = await prisma.product.findMany({
        where: {
          isActive: true,
          id: { notIn: [productId, ...rows.map((r) => r.id)] },
        },
        include: {
          category: true,
          images: true,
          variants: true,
        },
        take: remainingLimit,
        orderBy: { createdAtUtc: "desc" },
      });
      return [...rows, ...otherRows].map(mapPrismaProduct);
    }

    return rows.map(mapPrismaProduct);
  } catch (error) {
    console.error("getRelatedProducts query failed:", error);
    return [];
  }
}
