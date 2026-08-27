import { SystemSettings, DEFAULT_SYSTEM_SETTINGS } from "@/types/settings";
import { getSettingsAction, updateSettingsAction, resetSettingsAction } from "@/actions/settings.actions";

export class SettingsService {
  private cachedSettings: SystemSettings | null = null;
  private lastFetchTime = 0;

  public async get(): Promise<SystemSettings> {
    const now = Date.now();
    if (this.cachedSettings && now - this.lastFetchTime < 60000) {
      return this.cachedSettings;
    }
    try {
      const settings = await getSettingsAction();
      this.cachedSettings = settings;
      this.lastFetchTime = now;
      return settings;
    } catch (err) {
      console.warn("Failed to fetch settings, using default system settings:", err);
      return this.cachedSettings || DEFAULT_SYSTEM_SETTINGS;
    }
  }

  public async update(settings: SystemSettings, _user = "Admin"): Promise<boolean> {
    try {
      this.cachedSettings = settings;
      this.lastFetchTime = Date.now();
      const res = await updateSettingsAction(settings);
      return res.success;
    } catch (err) {
      console.warn("Failed to update settings:", err);
      return false;
    }
  }

  public async reset(
    scope: "all" | keyof SystemSettings = "all"
  ): Promise<{ success: boolean; settings?: SystemSettings; error?: string }> {
    try {
      const res = await resetSettingsAction(scope);
      if (res.success && res.settings) {
        this.cachedSettings = res.settings;
        this.lastFetchTime = Date.now();
      }
      return res;
    } catch (err) {
      console.warn("Failed to reset settings:", err);
      return { success: false, error: err instanceof Error ? err.message : "Failed to reset settings" };
    }
  }
}

export const settingsService = new SettingsService();
