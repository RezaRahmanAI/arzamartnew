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
  offerRuleIds: string | null;
  averageRating: Prisma.Decimal | number | string;
  reviewCount: number;
  badge: string | null;
  sizeTemplateId?: string | null;
  category?: { id: number; name: string; slug: string; parentCategoryId?: number | null; parentCategory?: { id: number; name: string; slug: string } | null } | null;
  images?: { id: number; imageUrl: string; isMain: boolean; displayOrder: number }[];
  variants?: {
    id: string;
    name: string;
    sku: string;
    priceOverride: Prisma.Decimal | number | string | null;
    stockQuantity: number;
    chest?: string | null;
    length?: string | null;
    waist?: string | null;
    sleeve?: string | null;
    extrasJson?: string | null;
    isActive: boolean;
  }[];
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
  const sizeMeasurements: Record<string, { chest?: string | null; length?: string | null; waist?: string | null; sleeve?: string | null; extras?: Record<string, string> }> = {};

  variants.forEach((v) => {
    const cleanSize = cleanSizeLabel(v.name);
    sizePrices[cleanSize] = v.priceOverride !== null && v.priceOverride !== undefined ? Number(v.priceOverride) : activePrice;
    sizeStock[cleanSize] = v.stockQuantity;

    let parsedExtras: Record<string, string> | undefined;
    if (v.extrasJson) {
      try {
        const parsed = JSON.parse(v.extrasJson);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          parsedExtras = {};
          for (const [k, val] of Object.entries(parsed)) {
            parsedExtras[k] = val === null || val === undefined ? "" : String(val);
          }
        }
      } catch {
        parsedExtras = undefined;
      }
    }

    if (v.chest || v.length || v.waist || v.sleeve || (parsedExtras && Object.keys(parsedExtras).length > 0)) {
      sizeMeasurements[cleanSize] = {
        chest: v.chest || null,
        length: v.length || null,
        waist: v.waist || null,
        sleeve: v.sleeve || null,
        extras: parsedExtras,
      };
    }
  });

  let parsedBundleProducts: string[] | undefined = undefined;
  if (p.bundleProducts) {
    try {
      parsedBundleProducts = JSON.parse(p.bundleProducts);
    } catch {
      parsedBundleProducts = p.bundleProducts.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  let parsedOfferRuleIds: string[] | undefined = undefined;
  if (p.offerRuleIds) {
    try {
      const parsed = JSON.parse(p.offerRuleIds);
      if (Array.isArray(parsed)) {
        parsedOfferRuleIds = parsed.filter((x) => typeof x === "string");
      }
    } catch {
      parsedOfferRuleIds = p.offerRuleIds.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // Determine main category and subcategory from DB hierarchy
  let mainCategorySlug = "t-shirts";
  let subCategorySlug: string | undefined = undefined;
  let mainCategoryId: number | undefined = undefined;
  let subCategoryId: number | undefined = undefined;
  let mainCategoryName: string | undefined = undefined;
  let subCategoryName: string | undefined = undefined;

  if (p.category) {
    if (p.category.parentCategory) {
      // Current category in DB is a sub-category!
      mainCategorySlug = p.category.parentCategory.slug;
      mainCategoryId = p.category.parentCategory.id;
      mainCategoryName = p.category.parentCategory.name;

      subCategorySlug = p.category.slug;
      subCategoryId = p.category.id;
      subCategoryName = p.category.name;
    } else {
      // Current category in DB is a main category
      mainCategorySlug = p.category.slug;
      mainCategoryId = p.category.id;
      mainCategoryName = p.category.name;
    }
  }

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: mainCategorySlug,
    subcategory: subCategorySlug,
    categoryId: mainCategoryId,
    subcategoryId: subCategoryId,
    categoryName: mainCategoryName,
    subcategoryName: subCategoryName,
    price: activePrice,
    compareAt: compareAt,
    mrp: basePrice,
    image: mainImage,
    images: allImages.length > 0 ? allImages : [mainImage],
    sizes: sizes.length > 0 ? sizes : ["M", "L", "XL", "XXL"],
    sizePrices,
    sizeStock,
    sizeMeasurements: Object.keys(sizeMeasurements).length > 0 ? sizeMeasurements : undefined,
    sizeTemplateId: p.sizeTemplateId ?? undefined,
    description: p.fullDescription || p.shortDescription || "",
    shortDescription: p.shortDescription || "",
    discountNote: p.shortDescription || undefined,
    badge: p.badge || undefined,
    isBundle: p.isBundle,
    bundleProducts: parsedBundleProducts,
    offerRuleIds: parsedOfferRuleIds,
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
      const cleanSlug = options.categorySlug.toLowerCase();
      where.OR = [
        { category: { slug: cleanSlug } },
        { category: { parentCategory: { slug: cleanSlug } } },
      ];
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
          category: {
            include: {
              parentCategory: true,
            },
          },
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
        category: {
          include: {
            parentCategory: true,
          },
        },
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
        category: {
          include: {
            parentCategory: true,
          },
        },
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
        category: {
          include: {
            parentCategory: true,
          },
        },
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
          category: {
            include: {
              parentCategory: true,
            },
          },
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
