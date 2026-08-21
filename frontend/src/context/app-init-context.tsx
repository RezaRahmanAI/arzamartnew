"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { initService, AppInitData, APP_INIT_STORAGE_KEY } from "@/lib/api/services/init.service";

interface AppInitContextType {
  initData: AppInitData;
  isFreshLoaded: boolean;
  refetchInit: () => Promise<void>;
  updateInitSettings: (newSettings: AppInitData["settings"]) => void;
}

const AppInitContext = createContext<AppInitContextType | undefined>(undefined);

export function AppInitProvider({ children }: { children: React.ReactNode }) {
  // 0ms Instant Hydration: Synchronously initialize state from cached data or static fallback
  const [initData, setInitData] = useState<AppInitData>(() => {
    if (typeof window !== "undefined") {
      const cached = initService.getCachedData();
      if (cached) return cached;
    }
    return initService.getFallbackData();
  });

  const [isFreshLoaded, setIsFreshLoaded] = useState<boolean>(false);

  // Background SWR (Stale-While-Revalidate): Single Consolidated Network Request
  const refetchInit = useCallback(async () => {
    try {
      const fresh = await initService.fetchFreshData();
      setInitData(fresh);
      setIsFreshLoaded(true);
    } catch (err) {
      console.warn("Background init refresh error:", err);
    }
  }, []);

  const updateInitSettings = useCallback((newSettings: AppInitData["settings"]) => {
    setInitData((prev) => {
      const updated = {
        ...prev,
        settings: newSettings,
        timestamp: Date.now(),
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(APP_INIT_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          /* ignore quota */
        }
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    // If we only had fallback data or on mount, fetch fresh data once
    refetchInit();
  }, [refetchInit]);

  const value = useMemo(
    () => ({
      initData,
      isFreshLoaded,
      refetchInit,
      updateInitSettings,
    }),
    [initData, isFreshLoaded, refetchInit, updateInitSettings]
  );

  return <AppInitContext.Provider value={value}>{children}</AppInitContext.Provider>;
}

export function useAppInit() {
  const ctx = useContext(AppInitContext);
  if (!ctx) {
    throw new Error("useAppInit must be used within an AppInitProvider");
  }
  return ctx;
}
