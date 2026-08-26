"use client";

import { useSettings } from "@/context/settings-context";

export function ThemeApplier() {
  const { settings, isLoading } = useSettings();

  if (isLoading || !settings?.branding) return null;

  const { primaryColor, secondaryColor, accentColor, borderRadius, buttonColor } = settings.branding;
  const radius = borderRadius || "0.75rem";

  return (
    <style id="dynamic-theme-styles" dangerouslySetInnerHTML={{
      __html: `
        :root {
          ${primaryColor ? `--primary: ${primaryColor};` : ""}
          ${secondaryColor ? `--secondary: ${secondaryColor};` : ""}
          ${accentColor ? `--accent: ${accentColor};` : ""}
          --radius: ${radius};
          --button: ${buttonColor || primaryColor || "var(--primary)"};
        }
      `
    }} />
  );
}
