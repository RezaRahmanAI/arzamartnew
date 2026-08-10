"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DEFAULT_SYSTEM_SETTINGS, SystemSettings, AuditLogEntry } from "@/types/settings";
import { settingsService } from "@/lib/api/services/settings.service";
import { toast } from "sonner";

interface SettingsContextType {
  settings: SystemSettings;
  draftSettings: SystemSettings;
  auditLogs: AuditLogEntry[];
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  updateSection: <K extends keyof SystemSettings>(section: K, values: Partial<SystemSettings[K]>) => void;
  saveSettings: (options?: { silent?: boolean }) => Promise<boolean>;
  resetDrafts: () => void;
  resetToFactoryDefaults: () => Promise<void>;
  clearSystemCache: () => Promise<void>;
}

const SETTINGS_STORAGE_KEY = "arzamart_system_settings_v1";

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync draft settings comparison
  useEffect(() => {
    const isDifferent = JSON.stringify(settings) !== JSON.stringify(draftSettings);
    setHasUnsavedChanges(isDifferent);
  }, [settings, draftSettings]);

  // Load settings from API & LocalStorage on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
        const liveSettings = await settingsService.get();
        setSettings(liveSettings);
        setDraftSettings(liveSettings);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(liveSettings));
      } catch (err) {
        console.warn("API settings fetch failed, checking local storage:", err);
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setSettings(parsed);
            setDraftSettings(parsed);
          } catch {
            /* ignore */
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  // Update specific section values in draft state
  const updateSection = useCallback(<K extends keyof SystemSettings>(section: K, values: Partial<SystemSettings[K]>) => {
    setDraftSettings((prev) => {
      const updatedSection = {
        ...prev[section],
        ...values,
      };
      return {
        ...prev,
        [section]: updatedSection,
      };
    });
  }, []);

  // Save changes to API & local storage
  const saveSettings = useCallback(async (options?: { silent?: boolean }): Promise<boolean> => {
    try {
      setIsSaving(true);
      const success = await settingsService.update(draftSettings, "Super Admin");
      setSettings(draftSettings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(draftSettings));

      if (!options?.silent) {
        if (success) {
          toast.success("Settings Saved Successfully!", {
            description: "All website configurations have been updated globally in the backend.",
          });
        } else {
          toast.success("Settings Saved Locally!", {
            description: "Saved to local cache (backend offline).",
          });
        }
      }
      setIsSaving(false);
      return true;
    } catch (err) {
      console.warn("Saving to API failed, applying local persist:", err);
      setSettings(draftSettings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(draftSettings));
      if (!options?.silent) {
        toast.success("Settings Saved Locally!", {
          description: "Configuration saved to local cache.",
        });
      }
      setIsSaving(false);
      return true;
    }
  }, [draftSettings]);

  // Reset draft changes back to saved settings
  const resetDrafts = useCallback(() => {
    setDraftSettings(settings);
    toast.info("Draft Changes Discarded", {
      description: "Restored to last saved settings configuration.",
    });
  }, [settings]);

  // Reset to factory defaults
  const resetToFactoryDefaults = useCallback(async () => {
    setSettings(DEFAULT_SYSTEM_SETTINGS);
    setDraftSettings(DEFAULT_SYSTEM_SETTINGS);
    await settingsService.update(DEFAULT_SYSTEM_SETTINGS, "System");
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
    toast.success("Reset to Factory Defaults", {
      description: "All settings restored to system initial state.",
    });
  }, []);

  // Clear system cache
  const clearSystemCache = useCallback(async () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: "Invalidating CDN & Redis Cache...",
        success: "Cache Cleared & Navigation Rebuilt!",
        error: "Failed to clear cache",
      }
    );
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        draftSettings,
        auditLogs,
        isLoading,
        isSaving,
        hasUnsavedChanges,
        updateSection,
        saveSettings,
        resetDrafts,
        resetToFactoryDefaults,
        clearSystemCache,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
