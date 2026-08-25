import { apiConfig } from "@/lib/api/config";
import type { Product, Category } from "@/lib/shop-data";
import { products as staticProducts, categories as staticCategories, offerBanner as staticOfferBanner } from "@/lib/shop-data";
import { initialMockSlides, type HeroSlide } from "@/lib/api/services/banners.service";

/**
 * Server-side fetch for homepage ISR data.
 * Calls GET /api/v1/init at build-time / revalidation time from the Next.js server.
 * This never runs in the browser — only during `next build` or ISR revalidation.
 */

interface ServerInitResponse {
  settings?: Record<string, unknown>;
  banners?: Array<{
    id: string | number;
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    image?: string;
    targetUrl?: string;
    href?: string;
    position?: string;
    displayOrder?: number;
    isActive?: boolean;
    eyebrow?: string;
  }>;
  categories?: Array<{
    slug: string;
    name: string;
    imageUrl?: string;
    image?: string;
    blurb?: string;
  }>;
  products?: Array<{
    id?: string;
    slug: string;
    name: string;
    categoryName?: string;
    category?: string;
    basePrice?: number;
    price?: number;
    discountPrice?: number;
    mainImageUrl?: string;
    image?: string;
    shortDescription?: string;
    fullDescription?: string;
    description?: string;
    badge?: string;
    purchaseRate?: number;
    isBundle?: boolean;
    bundleProducts?: string[];
    variants?: { name: string; priceOverride?: number; stockQuantity?: number }[];
    sizes?: string[];
    sizePrices?: Record<string, number>;
    sizeStock?: Record<string, number>;
    images?: string[];
  }>;
  reviews?: unknown[];
}

export interface HomePageData {
  banners: HeroSlide[];
  categories: Category[];
  products: Product[];
  settings: {
    brandName: string;
    currencySymbol: string;
    freeShippingThreshold: number;
    enableFreeShipping: boolean;
    enableCOD: boolean;
  };
  offerBanner: {
    image: string;
    title: string;
    subtitle: string;
    href: string;
    eyebrow: string;
  };
}

function mapProduct(p: NonNullable<ServerInitResponse["products"]>[number]): Product {
  const basePrice = p.basePrice ?? p.price ?? 0;
  const discountPrice = p.discountPrice;
  return {
    id: p.id ? String(p.id) : undefined,
    slug: p.slug,
    name: p.name,
    category: p.categoryName ? String(p.categoryName).toLowerCase() : p.category ? String(p.category).toLowerCase() : "t-shirts",
    price: discountPrice && discountPrice > 0 ? discountPrice : basePrice,
    compareAt: discountPrice && discountPrice < basePrice ? basePrice : undefined,
    mrp: basePrice,
    image: p.mainImageUrl || p.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
    sizes: p.variants && Array.isArray(p.variants) && p.variants.length > 0
      ? p.variants.map((v) => v.name.replace("Size: ", ""))
      : Array.isArray(p.sizes) && p.sizes.length > 0
      ? p.sizes
      : ["M", "L", "XL", "XXL"],
    description: p.shortDescription || p.fullDescription || p.description || "",
    purchaseRate: p.purchaseRate ?? basePrice * 0.7,
    badge: p.badge,
    isBundle: p.isBundle ?? false,
    bundleProducts: p.bundleProducts ?? undefined,
    sizePrices: p.variants && Array.isArray(p.variants) && p.variants.length > 0
      ? Object.fromEntries(p.variants.map((v) => [v.name.replace("Size: ", ""), v.priceOverride ?? basePrice]))
      : p.sizePrices || {},
    sizeStock: p.variants && Array.isArray(p.variants) && p.variants.length > 0
      ? Object.fromEntries(p.variants.map((v) => [v.name.replace("Size: ", ""), v.stockQuantity ?? 15]))
      : p.sizeStock || {},
    images: Array.isArray(p.images) && p.images.length > 0
      ? p.images.filter(Boolean)
      : [p.mainImageUrl || p.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"],
  };
}

function mapBanner(b: NonNullable<ServerInitResponse["banners"]>[number]): HeroSlide {
  return {
    id: String(b.id),
    title: b.title || "",
    subtitle: b.subtitle || "",
    image: b.imageUrl || b.image || "",
    href: b.targetUrl || b.href || "/",
    position: b.position || "slider",
    displayOrder: b.displayOrder ?? 0,
    isActive: b.isActive ?? true,
    eyebrow: b.eyebrow || "New Collection",
  };
}

function mapCategory(c: NonNullable<ServerInitResponse["categories"]>[number]): Category {
  return {
    slug: c.slug,
    name: c.name,
    image: c.imageUrl || c.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
    blurb: c.blurb || "",
  };
}

export async function fetchHomePageData(): Promise<HomePageData> {
  const apiBase = apiConfig.baseUrl;

  try {
    const res = await fetch(`${apiBase}/init`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`Init API returned ${res.status}`);

    const raw: ServerInitResponse = await res.json();

    // Banners
    const banners: HeroSlide[] = Array.isArray(raw.banners) && raw.banners.length > 0
      ? raw.banners.map(mapBanner)
      : initialMockSlides;

    // Categories
    const categories: Category[] = Array.isArray(raw.categories) && raw.categories.length > 0
      ? raw.categories.map(mapCategory)
      : staticCategories;

    // Products
    const products: Product[] = Array.isArray(raw.products) && raw.products.length > 0
      ? raw.products.map(mapProduct)
      : staticProducts;

    // Settings
    const settingsObj = raw.settings ?? {};
    const general = (settingsObj as Record<string, Record<string, unknown>>).general ?? {};
    const shipping = (settingsObj as Record<string, Record<string, unknown>>).shipping ?? {};

    const brandName = (general.websiteName as string) || "Arza";
    const currencySymbol = (general.currencySymbol as string) || "৳";
    const freeShippingThreshold = (shipping.freeShippingThreshold as number) ?? 5000;
    const enableFreeShipping = (shipping.enableFreeShipping as boolean) ?? true;
    const enableCOD = (shipping.cashOnDeliveryAvailable as boolean) ?? true;

    // Offer banner
    const offerSlide = banners.find((s) => s.position === "offer" || s.href === "/offers");
    const offerBanner = offerSlide
      ? {
          image: offerSlide.image,
          title: offerSlide.title,
          subtitle: offerSlide.subtitle,
          href: offerSlide.href || "/offers",
          eyebrow: offerSlide.eyebrow || "Limited time",
        }
      : {
          image: staticOfferBanner.image,
          title: staticOfferBanner.title,
          subtitle: staticOfferBanner.subtitle,
          href: "/offers",
          eyebrow: "Limited time",
        };

    return {
      banners,
      categories,
      products,
      settings: {
        brandName,
        currencySymbol,
        freeShippingThreshold,
        enableFreeShipping,
        enableCOD,
      },
      offerBanner,
    };
  } catch (err) {
    console.error("fetchHomePageData error:", err);
    // Graceful fallback to static data
    return {
      banners: initialMockSlides,
      categories: staticCategories,
      products: staticProducts,
      settings: {
        brandName: "Arza",
        currencySymbol: "৳",
        freeShippingThreshold: 5000,
        enableFreeShipping: true,
        enableCOD: true,
      },
      offerBanner: {
        image: staticOfferBanner.image,
        title: staticOfferBanner.title,
        subtitle: staticOfferBanner.subtitle,
        href: "/offers",
        eyebrow: "Limited time",
      },
    };
  }
}
