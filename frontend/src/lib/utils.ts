import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { apiConfig } from "@/lib/api/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";

export function getImageUrl(url?: string | null): string {
  if (!url || typeof url !== "string" || !url.trim()) {
    return FALLBACK_IMAGE;
  }
  const clean = url.trim();
  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:")) {
    return clean;
  }
  if (clean.startsWith("/")) {
    if (clean.startsWith("/src/assets") || clean.startsWith("/assets")) {
      return FALLBACK_IMAGE;
    }
    const apiBase = apiConfig.baseUrl.replace(/\/api\/v1\/?$/, "");
    return `${apiBase}${clean}`;
  }
  return clean;
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FALLBACK_IMAGE;
}
