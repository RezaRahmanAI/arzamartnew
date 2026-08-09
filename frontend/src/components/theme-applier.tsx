"use client";

import { useSettings } from "@/context/settings-context";

export function ThemeApplier() {
  const { settings, isLoading } = useSettings();

  if (isLoading) return null;

  const { primaryColor, secondaryColor, accentColor, borderRadius } = settings.branding;

  return (
    <style dangerouslySetInnerHTML={{
      __html: `
        :root {
          --primary: ${primaryColor};
          --secondary: ${secondaryColor};
          --accent: ${accentColor};
          --radius: ${borderRadius};
          
          /* In case any Tailwind component directly uses buttonColor */
          --button: ${settings.branding.buttonColor || primaryColor};
        }
      `
    }} />
  );
}
