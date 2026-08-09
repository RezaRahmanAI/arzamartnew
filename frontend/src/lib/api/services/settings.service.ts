import { apiClient } from "../client";
import { SystemSettings, DEFAULT_SYSTEM_SETTINGS } from "@/types/settings";

export class SettingsService {
  public async get(): Promise<SystemSettings> {
    try {
      const data = await apiClient.get<{ settings?: SystemSettings }>("/settings");
      if (data && data.settings && typeof data.settings === "object" && Object.keys(data.settings).length > 0) {
        return {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...data.settings,
        };
      }
      return DEFAULT_SYSTEM_SETTINGS;
    } catch (err) {
      console.warn("Failed to fetch settings from API, using default system settings:", err);
      return DEFAULT_SYSTEM_SETTINGS;
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
