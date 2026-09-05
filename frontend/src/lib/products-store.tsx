"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type Product, products as staticProducts } from "./shop-data";
import { productsService } from "./api/services/products.service";
import { useAppInit } from "@/context/app-init-context";
import { logSystemAction } from "@/lib/audit-logger";
import { toast } from "sonner";

type ProductsContextValue = {
  products: Product[];
  isLoading: boolean;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (slug: string, updated: Product) => Promise<void>;
  deleteProduct: (slug: string) => Promise<void>;
  deductStock: (items: { slug: string; size?: string; qty: number }[]) => void;
  getProduct: (slug: string) => Product | undefined;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const { initData, isFreshLoaded } = useAppInit();
  const [products, setProducts] = useState<Product[]>(() => initData.products || []);
  const [isLoading, setIsLoading] = useState<boolean>(!isFreshLoaded);

  // Sync when consolidated batch data updates
  useEffect(() => {
    if (initData.products) {
      setProducts(initData.products);
      setIsLoading(false);
    }
  }, [initData.products]);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await productsService.getAll();
      setProducts(data);
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addProduct = useCallback(async (product: Product) => {
    setProducts((prev) => [product, ...prev.filter((p) => p.slug !== product.slug)]);
    logSystemAction({
      category: "PRODUCT",
      action: "Product Created",
      targetId: product.slug,
      targetName: product.name,
      details: `Product "${product.name}" created in category "${product.category}" with price ৳${product.price}.`,
    });
    try {
      const result = await productsService.create(product);
      if (!result || (result as any).success === false) {
        throw new Error((result as any)?.error || "Failed to create product");
      }
      const fresh = await productsService.getAll();
      if (fresh && fresh.length > 0) {
        setProducts(fresh);
      }
    } catch (error) {
      console.error("Failed to sync product creation with API:", error);
      setProducts((prev) => prev.filter((p) => p.slug !== product.slug));
      toast.error("Failed to save product to database", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }, []);

  const updateProduct = useCallback(async (slug: string, updated: Product) => {
    const previous = products.find((p) => p.slug === slug);
    setProducts((prev) => prev.map((p) => (p.slug === slug ? updated : p)));
    logSystemAction({
      category: "PRODUCT",
      action: "Product Updated",
      targetId: slug,
      targetName: updated.name,
      details: `Product "${updated.name}" (${slug}) details/pricing updated. Price: ৳${updated.price}`,
    });
    try {
      const result = await productsService.update(slug, updated);
      if (!result || (result as any).success === false) {
        throw new Error((result as any)?.error || "Failed to update product");
      }
      const fresh = await productsService.getAll();
      if (fresh && fresh.length > 0) {
        setProducts(fresh);
      }
    } catch (error) {
      console.error("Failed to sync product update with API:", error);
      if (previous) {
        setProducts((prev) => prev.map((p) => (p.slug === slug ? previous : p)));
      }
      toast.error("Failed to update product in database", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }, [products]);

  const deleteProduct = useCallback(async (slug: string) => {
    const previous = products.find((p) => p.slug === slug);
    setProducts((prev) => prev.filter((p) => p.slug !== slug));
    logSystemAction({
      category: "PRODUCT",
      action: "Product Deleted",
      targetId: slug,
      details: `Product with slug "${slug}" was deleted from store catalog.`,
    });
    try {
      await productsService.delete(slug);
    } catch (error) {
      console.error("Failed to sync product deletion with API:", error);
      if (previous) {
        setProducts((prev) => [...prev, previous]);
      }
      toast.error("Failed to delete product from database", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }, [products]);

  const deductStock = useCallback((items: { slug: string; size?: string; qty: number }[]) => {
    setProducts((prev) =>
      prev.map((product) => {
        const itemMatches = items.filter(
          (i) => i.slug === product.slug || product.name.toLowerCase().includes(i.slug.toLowerCase())
        );
        if (itemMatches.length === 0) return product;

        const updatedSizeStock = { ...(product.sizeStock || {}) };
        itemMatches.forEach((item) => {
          const sz = item.size || "M";
          const currentStock = updatedSizeStock[sz] ?? 15;
          updatedSizeStock[sz] = Math.max(0, currentStock - item.qty);
        });

        return {
          ...product,
          sizeStock: updatedSizeStock,
        };
      })
    );
  }, []);

  const getProduct = useCallback(
    (slug: string) => {
      const match = products.find((p) => p.slug === slug);
      if (match) return match;
      return staticProducts.find((p) => p.slug === slug);
    },
    [products]
  );

  const value = useMemo<ProductsContextValue>(
    () => ({
      products,
      isLoading,
      addProduct,
      updateProduct,
      deleteProduct,
      deductStock,
      getProduct,
    }),
    [products, isLoading, addProduct, updateProduct, deleteProduct, deductStock, getProduct]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used inside ProductsProvider");
  return ctx;
}
