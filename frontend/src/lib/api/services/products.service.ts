import { apiClient } from "../client";
import type { Product } from "@/lib/shop-data";

export interface RawApiProduct {
  id?: string;
  slug: string;
  name: string;
  categoryName?: string;
  basePrice?: number;
  discountPrice?: number;
  mainImageUrl?: string;
  shortDescription?: string;
  fullDescription?: string;
  badge?: string;
  purchaseRate?: number;
  isBundle?: boolean;
  bundleProducts?: string[];
  variants?: { name: string; priceOverride?: number; stockQuantity?: number }[];
  images?: string[];
}

export interface PagedProductResponse {
  items?: RawApiProduct[];
  totalCount?: number;
}

class ProductsService {
  private mapApiProductToFrontend(p: RawApiProduct): Product {
    const basePrice = p.basePrice ?? 0;
    const discountPrice = p.discountPrice;
    return {
      slug: p.slug,
      name: p.name,
      category: p.categoryName ? p.categoryName.toLowerCase() : "t-shirts",
      price: discountPrice ?? basePrice,
      compareAt: discountPrice && discountPrice < basePrice ? basePrice : undefined,
      mrp: basePrice,
      image: p.mainImageUrl || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
      sizes: p.variants && p.variants.length > 0 ? p.variants.map((v) => v.name.replace("Size: ", "")) : ["M", "L", "XL", "XXL"],
      colors: ["Black", "White", "Navy", "Olive", "Maroon"],
      description: p.shortDescription || p.fullDescription || "",
      purchaseRate: p.purchaseRate ?? basePrice * 0.7,
      badge: p.badge,
      isBundle: p.isBundle ?? false,
      bundleProducts: p.bundleProducts ?? undefined,
      sizePrices: p.variants && p.variants.length > 0
        ? Object.fromEntries(p.variants.map((v) => [v.name.replace("Size: ", ""), v.priceOverride ?? basePrice]))
        : {},
      sizeStock: p.variants && p.variants.length > 0
        ? Object.fromEntries(p.variants.map((v) => [v.name.replace("Size: ", ""), v.stockQuantity ?? 15]))
        : {},
      images: p.images && p.images.length > 0 ? p.images.filter(Boolean) : [p.mainImageUrl || ""]
    };
  }

  public async getAll(): Promise<Product[]> {
    try {
      // Backend returns Result<PagedResult<ProductDto>> => { isSuccess, value: { items, totalCount, ... } }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await apiClient.get<any>("/products?pageIndex=1&pageSize=50");
      let items: RawApiProduct[] = [];

      if (Array.isArray(response)) {
        items = response;
      } else if (response?.value && Array.isArray(response.value.items)) {
        // Unwrap Result<PagedResult<T>> wrapper
        items = response.value.items;
      } else if (response && Array.isArray(response.items)) {
        items = response.items;
      }
      return items.map((p) => this.mapApiProductToFrontend(p));
    } catch (err) {
      console.error("Failed to fetch products from API:", err);
      return [];
    }
  }

  public async getBySlug(slug: string): Promise<Product | undefined> {
    try {
      const p = await apiClient.get<RawApiProduct>(`/products/${slug}`);
      return p ? this.mapApiProductToFrontend(p) : undefined;
    } catch {
      return undefined;
    }
  }

  public async create(product: Product): Promise<Product> {
    return apiClient.post<Product>("/products", product);
  }

  public async update(slug: string, updated: Product): Promise<Product> {
    return apiClient.put<Product>(`/products/${slug}`, updated);
  }

  public async delete(slug: string): Promise<void> {
    return apiClient.delete<void>(`/products/${slug}`);
  }
}

export const productsService = new ProductsService();
