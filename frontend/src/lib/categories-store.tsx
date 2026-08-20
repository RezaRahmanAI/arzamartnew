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
import { type Category } from "./shop-data";
import { categoriesService } from "./api/services/categories.service";
import { useAppInit } from "@/context/app-init-context";

type CategoriesContextValue = {
  categories: Category[];
  isLoading: boolean;
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (slug: string, updated: Category) => Promise<void>;
  deleteCategory: (slug: string) => Promise<void>;
  getCategory: (slug: string) => Category | undefined;
};

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { initData, isFreshLoaded } = useAppInit();
  const [categories, setCategories] = useState<Category[]>(() => initData.categories || []);
  const [isLoading, setIsLoading] = useState<boolean>(!isFreshLoaded);

  // Sync when consolidated batch data updates
  useEffect(() => {
    if (initData.categories) {
      setCategories(initData.categories);
      setIsLoading(false);
    }
  }, [initData.categories]);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await categoriesService.getAll();
      setCategories(data);
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addCategory = useCallback(async (category: Category) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.slug === category.slug);
      if (idx >= 0) return prev;
      return [...prev, category];
    });
    try {
      await categoriesService.create(category);
    } catch (err) {
      console.error("Failed to sync category creation with API:", err);
    }
  }, []);

  const updateCategory = useCallback(async (slug: string, updated: Category) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.slug === slug);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return prev;
    });
    try {
      await categoriesService.update(slug, updated);
    } catch (err) {
      console.error("Failed to sync category update with API:", err);
    }
  }, []);

  const deleteCategory = useCallback(async (slug: string) => {
    setCategories((prev) => prev.filter((c) => c.slug !== slug));
    try {
      await categoriesService.delete(slug);
    } catch (err) {
      console.error("Failed to sync category deletion with API:", err);
    }
  }, []);

  const getCategory = useCallback(
    (slug: string) => categories.find((c) => c.slug === slug),
    [categories]
  );

  const value = useMemo<CategoriesContextValue>(
    () => ({
      categories,
      isLoading,
      addCategory,
      updateCategory,
      deleteCategory,
      getCategory,
    }),
    [categories, isLoading, addCategory, updateCategory, deleteCategory, getCategory]
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategories must be used inside CategoriesProvider");
  return ctx;
}
