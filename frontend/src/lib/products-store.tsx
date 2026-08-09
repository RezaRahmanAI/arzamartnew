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
import { type Product } from "./shop-data";
import { productsService } from "./api/services/products.service";

type ProductsContextValue = {
  products: Product[];
  isLoading: boolean;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (slug: string, updated: Product) => Promise<void>;
  deleteProduct: (slug: string) => Promise<void>;
  getProduct: (slug: string) => Product | undefined;
};

const ProductsContext = createContext<ProductsContextValue | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await productsService.getAll();
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = useCallback(async (product: Product) => {
    setProducts((prev) => [product, ...prev.filter((p) => p.slug !== product.slug)]);
    try {
      await productsService.create(product);
    } catch (error) {
      console.error("Failed to sync product creation with API:", error);
    }
  }, []);

  const updateProduct = useCallback(async (slug: string, updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.slug === slug ? updated : p)));
    try {
      await productsService.update(slug, updated);
    } catch (error) {
      console.error("Failed to sync product update with API:", error);
    }
  }, []);

  const deleteProduct = useCallback(async (slug: string) => {
    setProducts((prev) => prev.filter((p) => p.slug !== slug));
    try {
      await productsService.delete(slug);
    } catch (error) {
      console.error("Failed to sync product deletion with API:", error);
    }
  }, []);

  const getProduct = useCallback(
    (slug: string) => products.find((p) => p.slug === slug),
    [products]
  );

  const value = useMemo<ProductsContextValue>(
    () => ({
      products,
      isLoading,
      addProduct,
      updateProduct,
      deleteProduct,
      getProduct,
    }),
    [products, isLoading, addProduct, updateProduct, deleteProduct, getProduct]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used inside ProductsProvider");
  return ctx;
}
