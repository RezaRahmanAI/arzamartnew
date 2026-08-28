"use client";

import { useEffect } from "react";
import { useSettings } from "@/context/settings-context";
import { getImageUrl } from "@/lib/utils";

export function ThemeApplier() {
  const { settings, isLoading } = useSettings();

  const branding = settings?.branding;
  const favicon = branding?.favicon;

  useEffect(() => {
    if (!favicon || typeof window === "undefined") return;
    try {
      const iconUrl = getImageUrl(favicon);
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = iconUrl;
    } catch {
      /* ignore */
    }
  }, [favicon]);

  if (isLoading || !branding) return null;

  const {
    primaryColor,
    secondaryColor,
    accentColor,
    borderRadius,
    buttonColor,
    fontFamily,
    toastSuccessColor,
    toastErrorColor,
    toastInfoColor,
  } = branding;

  const radius = borderRadius || "0.75rem";
  const btnColor = buttonColor || primaryColor || "#c23a22";
  const successColor = toastSuccessColor || "#10b981";
  const errorColor = toastErrorColor || "#ef4444";
  const infoColor = toastInfoColor || "#3b82f6";

  return (
    <style
      id="dynamic-theme-styles"
      dangerouslySetInnerHTML={{
        __html: `
          :root {
            ${primaryColor ? `--primary: ${primaryColor} !important; --ring: ${primaryColor} !important; --price: ${primaryColor} !important; --color-primary: ${primaryColor} !important;` : ""}
            ${secondaryColor ? `--secondary: ${secondaryColor} !important; --color-secondary: ${secondaryColor} !important;` : ""}
            ${accentColor ? `--accent: ${accentColor} !important; --color-accent: ${accentColor} !important;` : ""}
            --radius: ${radius} !important;
            --button: ${btnColor} !important;
            --toast-success: ${successColor};
            --toast-error: ${errorColor};
            --toast-info: ${infoColor};
            ${fontFamily ? `--font-body: ${fontFamily};` : ""}
          }
          [data-sonner-toast][data-type="success"] {
            background-color: ${successColor} !important;
            color: #ffffff !important;
            border-color: ${successColor} !important;
          }
          [data-sonner-toast][data-type="error"] {
            background-color: ${errorColor} !important;
            color: #ffffff !important;
            border-color: ${errorColor} !important;
          }
        `,
      }}
    />
  );
}

