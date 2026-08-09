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
import { bannersService, type HeroSlide } from "./api/services/banners.service";

type BannersContextValue = {
  slides: HeroSlide[];
  isLoading: boolean;
  addSlide: (slide: Omit<HeroSlide, "id">) => Promise<void>;
  updateSlide: (id: string, updated: Partial<HeroSlide>) => Promise<void>;
  deleteSlide: (id: string) => Promise<void>;
  refetchSlides: () => Promise<void>;
};

const BannersContext = createContext<BannersContextValue | null>(null);

export function BannersProvider({ children }: { children: ReactNode }) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSlides = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await bannersService.getAll();
      setSlides(data);
    } catch {
      setSlides([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const addSlide = useCallback(async (slide: Omit<HeroSlide, "id">) => {
    const created = await bannersService.create(slide);
    setSlides((prev) => [created, ...prev]);
  }, []);

  const updateSlide = useCallback(async (id: string, updated: Partial<HeroSlide>) => {
    const res = await bannersService.update(id, updated);
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...res } : s)));
  }, []);

  const deleteSlide = useCallback(async (id: string) => {
    setSlides((prev) => prev.filter((s) => s.id !== id));
    await bannersService.delete(id);
  }, []);

  const value = useMemo<BannersContextValue>(
    () => ({
      slides,
      isLoading,
      addSlide,
      updateSlide,
      deleteSlide,
      refetchSlides: fetchSlides,
    }),
    [slides, isLoading, addSlide, updateSlide, deleteSlide, fetchSlides]
  );

  return <BannersContext.Provider value={value}>{children}</BannersContext.Provider>;
}

export function useBanners() {
  const ctx = useContext(BannersContext);
  if (!ctx) throw new Error("useBanners must be used inside BannersProvider");
  return ctx;
}
