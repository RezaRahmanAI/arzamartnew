import { type Category, categories as staticCategories } from "@/lib/shop-data";
import {
  getCategoriesAction,
  getCategoryBySlugAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "@/actions/categories.actions";

class CategoriesService {
  public async getAll(): Promise<Category[]> {
    try {
      const data = await getCategoriesAction();
      return data && data.length > 0 ? data : staticCategories;
    } catch {
      return staticCategories;
    }
  }

  public async getBySlug(slug: string): Promise<Category | undefined> {
    try {
      const cat = await getCategoryBySlugAction(slug);
      return cat ?? staticCategories.find((c) => c.slug === slug);
    } catch {
      return staticCategories.find((c) => c.slug === slug);
    }
  }

  public async create(category: Category): Promise<Category> {
    const res = await createCategoryAction({
      name: category.name,
      slug: category.slug,
      image: category.image,
      blurb: category.blurb,
      parentCategoryId: category.parentCategoryId,
      parentSlug: category.parentSlug,
    });
    if (!res.success || !res.category) {
      throw new Error(res.error || "Failed to create category");
    }
    return res.category;
  }

  public async update(slug: string, updated: Category): Promise<Category> {
    const res = await updateCategoryAction(slug, updated);
    if (!res.success || !res.category) {
      throw new Error(res.error || "Failed to update category");
    }
    return res.category;
  }

  public async delete(slug: string): Promise<void> {
    const res = await deleteCategoryAction(slug);
    if (!res.success) {
      throw new Error(res.error || "Failed to delete category");
    }
  }
}

export const categoriesService = new CategoriesService();
