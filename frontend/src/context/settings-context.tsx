"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DEFAULT_SYSTEM_SETTINGS, SystemSettings, AuditLogEntry } from "@/types/settings";
import { settingsService } from "@/lib/api/services/settings.service";
import { useAppInit } from "@/context/app-init-context";
import { logSystemAction } from "@/lib/audit-logger";
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
  resetSectionDraft: (section: keyof SystemSettings) => void;
  resetSectionToDefaults: (section: keyof SystemSettings, persistToDb?: boolean) => Promise<void>;
  resetToFactoryDefaults: (persistToDb?: boolean) => Promise<void>;
  clearSystemCache: () => Promise<void>;
}

const SETTINGS_STORAGE_KEY = "arzamart_system_settings_v2";

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { initData, isFreshLoaded, updateInitSettings, refetchInit } = useAppInit();

  // Primary source of truth is initData.settings from AppInitContext
  const [settings, setSettings] = useState<SystemSettings>(() => {
    return initData.settings || DEFAULT_SYSTEM_SETTINGS;
  });
  const [draftSettings, setDraftSettings] = useState<SystemSettings>(() => {
    return initData.settings || DEFAULT_SYSTEM_SETTINGS;
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(!isFreshLoaded);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync settings whenever consolidated server init data loads / updates
  useEffect(() => {
    if (initData.settings) {
      setSettings(initData.settings);
      setDraftSettings((prev) => {
        // If there are unsaved changes currently being typed, don't clobber them; otherwise sync fresh
        const isDirty = hasUnsavedChanges && JSON.stringify(prev) !== JSON.stringify(settings);
        return isDirty ? prev : initData.settings;
      });
      setIsLoading(false);
    }
  }, [initData.settings, hasUnsavedChanges, settings]);

  // Sync draft settings comparison
  useEffect(() => {
    const isDifferent = JSON.stringify(settings) !== JSON.stringify(draftSettings);
    setHasUnsavedChanges(isDifferent);
  }, [settings, draftSettings]);

  // Update specific section values in draft state
  const updateSection = useCallback(<K extends keyof SystemSettings>(section: K, values: Partial<SystemSettings[K]>) => {
    setDraftSettings((prev) => {
      const currentSection = prev[section] || {};
      const updatedSection = {
        ...currentSection,
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
      updateInitSettings(draftSettings);
      setHasUnsavedChanges(false);

      // Trigger background refetch so server cache and app state stay completely aligned
      refetchInit();

      // Immutable audit log
      logSystemAction({
        category: "SETTINGS",
        action: "Settings Updated",
        details: "Store and website configurations were updated and saved.",
      });

      if (!options?.silent) {
        if (success) {
          toast.success("Settings Saved Successfully!", {
            description: "All website configurations have been updated globally in the database.",
          });
        } else {
          toast.success("Settings Saved Locally!", {
            description: "Saved to local cache.",
          });
        }
      }
      setIsSaving(false);
      return true;
    } catch (err) {
      console.warn("Saving to API failed, applying local persist:", err);
      setSettings(draftSettings);
      updateInitSettings(draftSettings);
      setHasUnsavedChanges(false);
      if (!options?.silent) {
        toast.success("Settings Saved Locally!", {
          description: "Configuration saved to local cache.",
        });
      }
      setIsSaving(false);
      return true;
    }
  }, [draftSettings, updateInitSettings, refetchInit]);

  // Reset all draft changes back to saved settings
  const resetDrafts = useCallback(() => {
    setDraftSettings(settings);
    toast.info("Draft Changes Discarded", {
      description: "Restored to last saved settings configuration.",
    });
  }, [settings]);

  // Reset a specific section's draft back to last saved settings
  const resetSectionDraft = useCallback((section: keyof SystemSettings) => {
    setDraftSettings((prev) => ({
      ...prev,
      [section]: settings[section],
    }));
    toast.info("Section Changes Discarded", {
      description: `Restored ${String(section)} to last saved state.`,
    });
  }, [settings]);

  // Reset a specific section to factory defaults (either draft or persist directly to DB)
  const resetSectionToDefaults = useCallback(async (section: keyof SystemSettings, persistToDb = false) => {
    const defaultSection = DEFAULT_SYSTEM_SETTINGS[section];
    if (!persistToDb) {
      setDraftSettings((prev) => ({
        ...prev,
        [section]: defaultSection,
      }));
      toast.success("Reset Section to Defaults (Draft)", {
        description: `${String(section)} reverted to factory defaults. Click 'Save Changes' to apply.`,
      });
      return;
    }

    try {
      setIsSaving(true);
      const res = await settingsService.reset(section);
      if (res.success && res.settings) {
        setSettings(res.settings);
        setDraftSettings(res.settings);
        updateInitSettings(res.settings);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(res.settings));
        refetchInit();
        toast.success("Section Reset Successfully", {
          description: `${String(section)} settings restored to factory defaults in the database.`,
        });
      } else {
        toast.error("Failed to Reset Section", {
          description: res.error || "An unexpected error occurred.",
        });
      }
    } catch (err) {
      toast.error("Failed to Reset Section", {
        description: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setIsSaving(false);
    }
  }, [updateInitSettings, refetchInit]);

  // Reset all settings to factory defaults (either draft or direct DB flush)
  const resetToFactoryDefaults = useCallback(async (persistToDb = true) => {
    if (!persistToDb) {
      setDraftSettings(DEFAULT_SYSTEM_SETTINGS);
      toast.success("All Sections Reverted to Defaults (Draft)", {
        description: "All tabs loaded with factory defaults. Click 'Save Changes' to apply.",
      });
      return;
    }

    try {
      setIsSaving(true);
      const res = await settingsService.reset("all");
      if (res.success && res.settings) {
        setSettings(res.settings);
        setDraftSettings(res.settings);
        updateInitSettings(res.settings);
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(res.settings));
        refetchInit();
        toast.success("Full System Reset Completed", {
          description: "All database settings restored to production factory defaults.",
        });
      } else {
        toast.error("Reset Failed", {
          description: res.error || "Could not reset system settings.",
        });
      }
    } catch (err) {
      toast.error("Reset Failed", {
        description: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setIsSaving(false);
    }
  }, [updateInitSettings, refetchInit]);

  // Clear system cache & refetch from database
  const clearSystemCache = useCallback(async () => {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      await refetchInit();
      toast.success("Cache Cleared & Settings Refreshed", {
        description: "All system cache and application states have been refreshed from the database.",
      });
    } catch (err) {
      toast.error("Cache Clear Failed", {
        description: err instanceof Error ? err.message : "Failed to clear cache",
      });
    }
  }, [refetchInit]);

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
        resetSectionDraft,
        resetSectionToDefaults,
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
