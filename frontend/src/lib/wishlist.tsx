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
import { products as staticProducts, type Product } from "./shop-data";
import { useProducts } from "./products-store";
import { toast } from "sonner";

type WishlistContextValue = {
  wishlistSlugs: string[];
  wishlistProducts: Product[];
  isInWishlist: (slug: string) => boolean;
  toggleWishlist: (product: Product) => void;
  removeFromWishlist: (slug: string) => void;
  clearWishlist: () => void;
};

const STORAGE_KEY = "alzeena-wishlist-v1";
const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlistSlugs, setWishlistSlugs] = useState<string[]>([]);
  const { products } = useProducts();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setWishlistSlugs(JSON.parse(raw) as string[]);
      } else {
        // Default initial items
        const initialSlugs = staticProducts.slice(0, 4).map((p) => p.slug);
        setWishlistSlugs(initialSlugs);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlistSlugs));
    } catch {
      /* ignore quota errors */
    }
  }, [wishlistSlugs]);

  const isInWishlist = useCallback(
    (slug: string) => wishlistSlugs.includes(slug),
    [wishlistSlugs]
  );

  const toggleWishlist = useCallback(
    (product: Product) => {
      setWishlistSlugs((prev) => {
        const exists = prev.includes(product.slug);
        if (exists) {
          toast.info(`Removed ${product.name} from wishlist`);
          return prev.filter((s) => s !== product.slug);
        } else {
          toast.success(`Added ${product.name} to wishlist`);
          return [...prev, product.slug];
        }
      });
    },
    []
  );

  const removeFromWishlist = useCallback((slug: string) => {
    setWishlistSlugs((prev) => prev.filter((s) => s !== slug));
    toast.info("Item removed from wishlist");
  }, []);

  const clearWishlist = useCallback(() => {
    setWishlistSlugs([]);
  }, []);

  const wishlistProducts = useMemo(() => {
    const all = products.length > 0 ? products : staticProducts;
    return wishlistSlugs
      .map((slug) => all.find((p) => p.slug === slug))
      .filter((p): p is Product => Boolean(p));
  }, [wishlistSlugs, products]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlistSlugs,
      wishlistProducts,
      isInWishlist,
      toggleWishlist,
      removeFromWishlist,
      clearWishlist,
    }),
    [
      wishlistSlugs,
      wishlistProducts,
      isInWishlist,
      toggleWishlist,
      removeFromWishlist,
      clearWishlist,
    ]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
