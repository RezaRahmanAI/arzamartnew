"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Category } from "@/lib/shop-data";
import { Prisma } from "@prisma/client";
import { getCategories, getCategoryBySlug } from "@/lib/data/categories";

export async function getCategoriesAction(): Promise<Category[]> {
  try {
    return await getCategories();
  } catch (error) {
    console.error("getCategoriesAction error:", error);
    return [];
  }
}

export async function getCategoryBySlugAction(slug: string): Promise<Category | null> {
  try {
    return await getCategoryBySlug(slug);
  } catch (error) {
    console.error("getCategoryBySlugAction error:", error);
    return null;
  }
}

export async function createCategoryAction(data: {
  name: string;
  slug?: string;
  image?: string;
  blurb?: string;
  parentCategoryId?: number | null;
  parentSlug?: string | null;
}): Promise<{ success: boolean; category?: Category; error?: string }> {
  try {
    if (!data.name?.trim()) {
      return { success: false, error: "Category name is required." };
    }

    const name = data.name.trim();
    let slug = data.slug?.trim().toLowerCase() || name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");

    if (!slug) {
      slug = `cat-${Date.now().toString().slice(-6)}`;
    }

    const existing = await prisma.category.findFirst({
      where: { slug },
    });

    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    let parentCategoryId = data.parentCategoryId;
    if (!parentCategoryId && data.parentSlug) {
      const parentCat = await prisma.category.findFirst({
        where: { slug: data.parentSlug },
      });
      if (parentCat) {
        parentCategoryId = parentCat.id;
      }
    }

    const maxOrder = await prisma.category.aggregate({
      _max: { displayOrder: true },
    });
    const nextOrder = (maxOrder._max.displayOrder || 0) + 1;

    const row = await prisma.category.create({
      data: {
        name,
        slug,
        imageUrl: data.image || null,
        blurb: data.blurb || null,
        displayOrder: nextOrder,
        parentCategoryId: parentCategoryId || null,
        isActive: true,
      },
      include: {
        parentCategory: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin/categories");

    return {
      success: true,
      category: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        image: row.imageUrl || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
        blurb: row.blurb || "",
        parentCategoryId: row.parentCategoryId,
        parentSlug: row.parentCategory?.slug || null,
        parentName: row.parentCategory?.name || null,
      },
    };
  } catch (error: unknown) {
    console.error("createCategoryAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create category." };
  }
}

export async function updateCategoryAction(
  slug: string,
  data: Partial<Category> & { parentSlug?: string | null; parentCategoryId?: number | null }
): Promise<{ success: boolean; category?: Category; error?: string }> {
  try {
    const existing = await prisma.category.findFirst({
      where: { slug },
    });

    if (!existing) {
      return { success: false, error: "Category not found" };
    }

    const updateData: Prisma.CategoryUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.image !== undefined) updateData.imageUrl = data.image;
    if (data.blurb !== undefined) updateData.blurb = data.blurb;

    if (data.parentCategoryId !== undefined) {
      updateData.parentCategory = data.parentCategoryId
        ? { connect: { id: data.parentCategoryId } }
        : { disconnect: true };
    } else if (data.parentSlug !== undefined) {
      if (data.parentSlug) {
        const parentCat = await prisma.category.findFirst({ where: { slug: data.parentSlug } });
        if (parentCat) {
          updateData.parentCategory = { connect: { id: parentCat.id } };
        }
      } else {
        updateData.parentCategory = { disconnect: true };
      }
    }

    const updated = await prisma.category.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        parentCategory: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin/categories");
    revalidatePath(`/category/${slug}`);

    return {
      success: true,
      category: {
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        image: updated.imageUrl || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
        blurb: updated.blurb || "",
        parentCategoryId: updated.parentCategoryId,
        parentSlug: updated.parentCategory?.slug || null,
        parentName: updated.parentCategory?.name || null,
      },
    };
  } catch (error: unknown) {
    console.error("updateCategoryAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update category." };
  }
}

export async function deleteCategoryAction(slug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.category.findFirst({
      where: { slug },
    });

    if (!existing) {
      return { success: false, error: "Category not found" };
    }

    // Check if products or subcategories exist in category
    const [productCount, subCatCount] = await Promise.all([
      prisma.product.count({ where: { categoryId: existing.id } }),
      prisma.category.count({ where: { parentCategoryId: existing.id } }),
    ]);

    if (productCount > 0 || subCatCount > 0) {
      // Soft-deactivate to avoid foreign key errors
      await prisma.category.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
    } else {
      await prisma.category.delete({
        where: { id: existing.id },
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/categories");

    return { success: true };
  } catch (error: unknown) {
    console.error("deleteCategoryAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete category." };
  }
}

