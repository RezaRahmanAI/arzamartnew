import { apiClient } from "../client";
import type { Category } from "@/lib/shop-data";

export interface RawApiCategory {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string;
}

const initialMockCategories: Category[] = [];

class CategoriesService {
  private mapApiCategoryToFrontend(c: RawApiCategory): Category {
    return {
      slug: c.slug,
      name: c.name,
      image: c.imageUrl || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
      blurb: `Explore our premium ${c.name} collection`
    };
  }

  public async getAll(): Promise<Category[]> {
    try {
      const response = await apiClient.get<RawApiCategory[]>("/categories");
      const list = Array.isArray(response)
        ? response
        : (response as unknown as { data?: RawApiCategory[] })?.data && Array.isArray((response as unknown as { data: RawApiCategory[] }).data)
          ? (response as unknown as { data: RawApiCategory[] }).data
          : [];

      if (list.length > 0) {
        return list.map((c) => this.mapApiCategoryToFrontend(c));
      }
      return initialMockCategories;
    } catch (err) {
      console.warn("Failed to fetch categories from API, using fallback initial categories:", err);
      return initialMockCategories;
    }
  }

  public async getBySlug(slug: string): Promise<Category | undefined> {
    const categories = await this.getAll();
    return categories.find((c) => c.slug === slug);
  }

  public async create(category: Category): Promise<Category> {
    try {
      const created = await apiClient.post<RawApiCategory>("/categories", {
        name: category.name,
        slug: category.slug,
        image: category.image,
        blurb: category.blurb,
      });
      return this.mapApiCategoryToFrontend(created);
    } catch (err) {
      console.warn("Failed to create category via API, applying local fallback:", err);
      return category;
    }
  }

  public async update(slug: string, updated: Category): Promise<Category> {
    try {
      const res = await apiClient.put<RawApiCategory>(`/categories/by-slug/${slug}`, {
        name: updated.name,
        slug: updated.slug,
        image: updated.image,
        blurb: updated.blurb,
      });
      return this.mapApiCategoryToFrontend(res);
    } catch (err) {
      console.warn("Failed to update category via API, applying local fallback:", err);
      return updated;
    }
  }

  public async delete(slug: string): Promise<void> {
    try {
      await apiClient.delete<void>(`/categories/by-slug/${slug}`);
    } catch (err) {
      console.warn("Failed to delete category via API, applying local fallback:", err);
    }
  }
}

export const categoriesService = new CategoriesService();
