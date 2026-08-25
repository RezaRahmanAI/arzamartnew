"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { productsService } from "@/lib/api/services/products.service";
import { products as staticProducts, Product } from "@/lib/shop-data";

interface ProductsContextType {
  allProducts: Product[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const prods = await productsService.getAll();
      if (Array.isArray(prods) && prods.length > 0) {
        setAllProducts(prods);
      } else {
        setAllProducts(staticProducts);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch products"));
      setAllProducts(staticProducts);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <ProductsContext.Provider value={{ allProducts, isLoading, error, refetch: fetchProducts }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductsProvider");
  }
  return context;
}