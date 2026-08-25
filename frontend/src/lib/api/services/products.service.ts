import type { Product } from "@/lib/shop-data";
import { getProducts, getProductBySlug } from "@/lib/data/products";
import { createProductAction, updateProductAction, deleteProductAction } from "@/actions/products.actions";

class ProductsService {
  public async getAll(): Promise<Product[]> {
    try {
      const result = await getProducts({ limit: 100 });
      return result.products;
    } catch (err) {
      console.error("Failed to fetch products:", err);
      return [];
    }
  }

  public async getBySlug(slug: string): Promise<Product | undefined> {
    try {
      const prod = await getProductBySlug(slug);
      return prod ?? undefined;
    } catch {
      return undefined;
    }
  }

  public async create(product: Product): Promise<Product> {
    const res = await createProductAction({
      name: product.name,
      slug: product.slug,
      category: product.category,
      price: product.price,
      compareAt: product.compareAt,
      mrp: product.mrp,
      image: product.image,
      images: product.images,
      sizes: product.sizes,
      sizePrices: product.sizePrices,
      sizeStock: product.sizeStock,
      description: product.description,
      badge: product.badge,
      purchaseRate: product.purchaseRate,
      isBundle: product.isBundle,
      bundleProducts: product.bundleProducts,
      isActive: product.isActive,
    });

    if (!res.success) {
      throw new Error(res.error || "Failed to create product");
    }
    return product;
  }

  public async update(slug: string, updated: Product): Promise<Product> {
    const res = await updateProductAction(slug, {
      name: updated.name,
      category: updated.category,
      price: updated.price,
      compareAt: updated.compareAt,
      mrp: updated.mrp,
      image: updated.image,
      images: updated.images,
      sizes: updated.sizes,
      sizePrices: updated.sizePrices,
      sizeStock: updated.sizeStock,
      description: updated.description,
      badge: updated.badge,
      purchaseRate: updated.purchaseRate,
      isBundle: updated.isBundle,
      bundleProducts: updated.bundleProducts,
      isActive: updated.isActive,
    });

    if (!res.success) {
      throw new Error(res.error || "Failed to update product");
    }
    return updated;
  }

  public async delete(slug: string): Promise<void> {
    const res = await deleteProductAction(slug);
    if (!res.success) {
      throw new Error(res.error || "Failed to delete product");
    }
  }
}

export const productsService = new ProductsService();
