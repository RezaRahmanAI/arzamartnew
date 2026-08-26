import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";

export function getImageUrl(
  url?: string | null,
  size?: "thumb" | "medium" | "large"
): string {
  if (!url || typeof url !== "string" || !url.trim()) {
    return FALLBACK_IMAGE;
  }
  let clean = url.trim();

  // Guard against invalid Vite/source paths stored in old records
  if (clean.includes("/src/assets/") || clean.startsWith("src/assets/")) {
    return FALLBACK_IMAGE;
  }

  // Clean any old legacy API URLs stored in localStorage
  if (clean.includes("api.arzamart.com/_next/")) {
    clean = clean.replace(/https?:\/\/api\.arzamart\.com\/?/, "/");
  }
  if (clean.includes("testapi.arzamart.com/_next/")) {
    clean = clean.replace(/https?:\/\/testapi\.arzamart\.com\/?/, "/");
  }

  // If a specific responsive variant is requested and the URL follows our optimized variant pattern
  if (size) {
    if (clean.includes("-large.webp") || clean.includes("-medium.webp") || clean.includes("-thumb.webp")) {
      clean = clean
        .replace(/-large\.webp/g, `-${size}.webp`)
        .replace(/-medium\.webp/g, `-${size}.webp`)
        .replace(/-thumb\.webp/g, `-${size}.webp`);
    }
  }

  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:")) {
    return clean;
  }
  if (clean.startsWith("/")) {
    return clean;
  }
  return `/${clean}`;
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  e.currentTarget.onerror = null;
  e.currentTarget.src = FALLBACK_IMAGE;
}

/**
 * Standard Clothing & Numeric Size Order (Smallest to Largest)
 */
const SIZE_ORDER_MAP: Record<string, number> = {
  "3xs": 1,
  "xxxs": 1,
  "2xs": 2,
  "xxs": 2,
  "xs": 3,
  "s": 4,
  "small": 4,
  "m": 5,
  "medium": 5,
  "l": 6,
  "large": 6,
  "xl": 7,
  "1xl": 7,
  "2xl": 8,
  "xxl": 8,
  "3xl": 9,
  "xxxl": 9,
  "4xl": 10,
  "xxxxl": 10,
  "5xl": 11,
  "6xl": 12,
  "standard": 20,
  "free": 21,
  "freesize": 21,
};

export function sortSizes(sizes: string[]): string[] {
  if (!sizes || !Array.isArray(sizes)) return [];
  return [...sizes].sort((a, b) => {
    const aClean = a.toLowerCase().trim();
    const bClean = b.toLowerCase().trim();

    // Check size map
    const aRank = SIZE_ORDER_MAP[aClean];
    const bRank = SIZE_ORDER_MAP[bClean];

    if (aRank !== undefined && bRank !== undefined) {
      return aRank - bRank;
    }
    if (aRank !== undefined) return -1;
    if (bRank !== undefined) return 1;

    // Check numeric sizes (e.g. 38, 40, 42, 44 or 28, 30, 32)
    const aNum = parseFloat(aClean);
    const bNum = parseFloat(bClean);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }

    return aClean.localeCompare(bClean);
  });
}
