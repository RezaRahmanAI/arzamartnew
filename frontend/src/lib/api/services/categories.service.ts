import type { Category } from "@/lib/shop-data";
import { getCategories, getCategoryBySlug } from "@/lib/data/categories";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "@/actions/categories.actions";

class CategoriesService {
  public async getAll(): Promise<Category[]> {
    try {
      const categories = await getCategories();
      return categories;
    } catch (err) {
      console.error("CategoriesService.getAll failed:", err);
      return [];
    }
  }

  public async getBySlug(slug: string): Promise<Category | undefined> {
    try {
      const cat = await getCategoryBySlug(slug);
      return cat ?? undefined;
    } catch {
      return undefined;
    }
  }

  public async create(category: Category): Promise<Category> {
    const res = await createCategoryAction({
      name: category.name,
      slug: category.slug,
      image: category.image,
      blurb: category.blurb,
    });

    if (!res.success) {
      throw new Error(res.error || "Failed to create category");
    }
    return res.category || category;
  }

  public async update(slug: string, updated: Category): Promise<Category> {
    const res = await updateCategoryAction(slug, {
      name: updated.name,
      slug: updated.slug,
      image: updated.image,
      blurb: updated.blurb,
    });

    if (!res.success) {
      throw new Error(res.error || "Failed to update category");
    }
    return res.category || updated;
  }

  public async delete(slug: string): Promise<void> {
    const res = await deleteCategoryAction(slug);
    if (!res.success) {
      throw new Error(res.error || "Failed to delete category");
    }
  }
}

export const categoriesService = new CategoriesService();
