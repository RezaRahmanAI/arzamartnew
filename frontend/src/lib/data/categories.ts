import prisma from "@/lib/prisma";
import type { Category } from "@/lib/shop-data";

export function mapPrismaCategory(c: {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  blurb: string | null;
  displayOrder: number;
  isActive: boolean;
  parentCategoryId?: number | null;
  parentCategory?: { id: number; name: string; slug: string } | null;
  subCategories?: Array<{ id: number; name: string; slug: string; imageUrl: string | null; blurb: string | null; displayOrder: number; isActive: boolean; parentCategoryId?: number | null }>;
}): Category {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    image: c.imageUrl || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
    blurb: c.blurb || `Explore our ${c.name} collection`,
    parentCategoryId: c.parentCategoryId,
    parentSlug: c.parentCategory?.slug || null,
    parentName: c.parentCategory?.name || null,
    subCategories: c.subCategories ? c.subCategories.map(mapPrismaCategory) : [],
  };
}

export async function getCategories(options?: { activeOnly?: boolean; includeSubCategories?: boolean }): Promise<Category[]> {
  try {
    const where = options?.activeOnly !== false ? { isActive: true } : {};
    const rows = await prisma.category.findMany({
      where,
      include: {
        parentCategory: true,
        subCategories: {
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    return rows.map(mapPrismaCategory);
  } catch (error) {
    console.error("getCategories query failed:", error);
    return [];
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const cleanSlug = slug.trim().toLowerCase();
    const row = await prisma.category.findFirst({
      where: {
        OR: [
          { slug: cleanSlug },
          { slug: cleanSlug.replace(/-/g, "") },
        ],
      },
      include: {
        parentCategory: true,
        subCategories: true,
      },
    });

    if (!row) return null;
    return mapPrismaCategory(row);
  } catch (error) {
    console.error(`getCategoryBySlug query failed for ${slug}:`, error);
    return null;
  }
}

