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
        isActive: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin/categories");

    return {
      success: true,
      category: {
        slug: row.slug,
        name: row.name,
        image: row.imageUrl || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
        blurb: row.blurb || "",
      },
    };
  } catch (error: unknown) {
    console.error("createCategoryAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create category." };
  }
}

export async function updateCategoryAction(
  slug: string,
  data: Partial<Category>
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

    const updated = await prisma.category.update({
      where: { id: existing.id },
      data: updateData,
    });

    revalidatePath("/");
    revalidatePath("/admin/categories");
    revalidatePath(`/category/${slug}`);

    return {
      success: true,
      category: {
        slug: updated.slug,
        name: updated.name,
        image: updated.imageUrl || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
        blurb: updated.blurb || "",
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

    // Check if products exist in category
    const productCount = await prisma.product.count({
      where: { categoryId: existing.id },
    });

    if (productCount > 0) {
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
