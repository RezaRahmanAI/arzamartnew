import { apiClient } from "../client";
import { SystemSettings, DEFAULT_SYSTEM_SETTINGS } from "@/types/settings";

export class SettingsService {
  private cachedSettings: SystemSettings | null = null;
  private lastFetchTime = 0;

  public async get(): Promise<SystemSettings> {
    const now = Date.now();
    if (this.cachedSettings && now - this.lastFetchTime < 60000) {
      return this.cachedSettings;
    }
    try {
      const data = await apiClient.get<{ settings?: SystemSettings }>("/settings");
      if (data && data.settings && typeof data.settings === "object" && Object.keys(data.settings).length > 0) {
        this.cachedSettings = {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...data.settings,
        };
        this.lastFetchTime = now;
        return this.cachedSettings;
      }
      return DEFAULT_SYSTEM_SETTINGS;
    } catch (err) {
      console.warn("Failed to fetch settings from API, using default system settings:", err);
      return this.cachedSettings || DEFAULT_SYSTEM_SETTINGS;
    }
  }

  public async update(settings: SystemSettings, user = "Admin"): Promise<boolean> {
    try {
      await apiClient.post<{ isSuccess?: boolean }>("/settings", { settings, user });
      return true;
    } catch (err) {
      console.warn("Failed to update settings to API:", err);
      return false;
    }
  }
}

export const settingsService = new SettingsService();
