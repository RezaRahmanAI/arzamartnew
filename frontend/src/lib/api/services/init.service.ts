import { apiClient } from "../client";
import { SystemSettings, DEFAULT_SYSTEM_SETTINGS } from "@/types/settings";
import { type HeroSlide, initialMockSlides } from "./banners.service";
import { type Category, type Product, products as staticProducts, categories as staticCategories } from "@/lib/shop-data";
import { type Review } from "@/lib/reviews";

export interface RawApiInitProduct {
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
  variants?: { id?: string; name: string; sku?: string; priceOverride?: number; stockQuantity?: number }[];
  sizes?: string[];
  sizePrices?: Record<string, number>;
  sizeStock?: Record<string, number>;
  images?: string[];
}

export interface RawApiInitBanner {
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
}

export interface RawApiInitCategory {
  slug: string;
  name: string;
  imageUrl?: string;
  image?: string;
  blurb?: string;
}

export interface RawApiInitReview {
  id: string | number;
  productSlug?: string;
  productName?: string;
  customerName?: string;
  rating?: number;
  comment?: string;
  date?: string;
}

export interface RawInitResponse {
  settings?: Partial<SystemSettings>;
  banners?: RawApiInitBanner[];
  categories?: RawApiInitCategory[];
  products?: RawApiInitProduct[];
  reviews?: RawApiInitReview[];
}

export interface AppInitData {
  settings: SystemSettings;
  banners: HeroSlide[];
  categories: Category[];
  products: Product[];
  reviews: Review[];
  timestamp: number;
}

export const APP_INIT_STORAGE_KEY = "arzamart_app_init_cache_v2";

class InitService {
  private mapRawProductToFrontend(p: RawApiInitProduct): Product {
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
        : [p.mainImageUrl || p.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"]
    };
  }

  private mapRawBannerToFrontend(b: RawApiInitBanner): HeroSlide {
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

  private mapRawCategoryToFrontend(c: RawApiInitCategory): Category {
    return {
      slug: c.slug,
      name: c.name,
      image: c.imageUrl || c.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
      blurb: c.blurb || "",
    };
  }

  private mapRawReviewToFrontend(r: RawApiInitReview): Review {
    return {
      id: String(r.id),
      productSlug: r.productSlug || "",
      productName: r.productName || "",
      customerName: r.customerName || "Customer",
      rating: r.rating || 5,
      comment: r.comment || "",
      date: r.date || new Date().toISOString().slice(0, 10),
    };
  }

  /**
   * Synchronous 0ms local storage cache read for instant hydration
   */
  public getCachedData(): AppInitData | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(APP_INIT_STORAGE_KEY);
      if (!stored) return null;
      const parsed: AppInitData = JSON.parse(stored);
      // Validate schema
      if (parsed && Array.isArray(parsed.products) && parsed.settings) {
        return parsed;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  /**
   * Static fallback data if no network and no cache
   */
  public getFallbackData(): AppInitData {
    return {
      settings: DEFAULT_SYSTEM_SETTINGS,
      banners: initialMockSlides,
      categories: staticCategories,
      products: staticProducts,
      reviews: [],
      timestamp: Date.now(),
    };
  }

  /**
   * Single round-trip API call to GET /api/v1/init
   */
  public async fetchFreshData(): Promise<AppInitData> {
    try {
      const raw = await apiClient.get<RawInitResponse>("/init");

      // 1. Map Settings
      let parsedSettings: SystemSettings = DEFAULT_SYSTEM_SETTINGS;
      if (raw?.settings && typeof raw.settings === "object") {
        const incoming = raw.settings as Partial<SystemSettings>;
        parsedSettings = {
          general: { ...DEFAULT_SYSTEM_SETTINGS.general, ...(incoming.general || {}) },
          branding: { ...DEFAULT_SYSTEM_SETTINGS.branding, ...(incoming.branding || {}) },
          contact: { ...DEFAULT_SYSTEM_SETTINGS.contact, ...(incoming.contact || {}) },
          shipping: { ...DEFAULT_SYSTEM_SETTINGS.shipping, ...(incoming.shipping || {}) },
          socialMedia: { ...DEFAULT_SYSTEM_SETTINGS.socialMedia, ...(incoming.socialMedia || {}) },
          business: { ...DEFAULT_SYSTEM_SETTINGS.business, ...(incoming.business || {}) },
          seo: { ...DEFAULT_SYSTEM_SETTINGS.seo, ...(incoming.seo || {}) },
          footer: { ...DEFAULT_SYSTEM_SETTINGS.footer, ...(incoming.footer || {}) },
          navigation: { ...DEFAULT_SYSTEM_SETTINGS.navigation, ...(incoming.navigation || {}) },
          orders: { ...DEFAULT_SYSTEM_SETTINGS.orders, ...(incoming.orders || {}) },
          notifications: { ...DEFAULT_SYSTEM_SETTINGS.notifications, ...(incoming.notifications || {}) },
          advanced: { ...DEFAULT_SYSTEM_SETTINGS.advanced, ...(incoming.advanced || {}) },
        };
      }

      // 2. Map Banners
      const banners: HeroSlide[] = Array.isArray(raw?.banners) && raw.banners.length > 0
        ? raw.banners.map((b) => this.mapRawBannerToFrontend(b))
        : initialMockSlides;

      // 3. Map Categories
      const categories: Category[] = Array.isArray(raw?.categories) && raw.categories.length > 0
        ? raw.categories.map((c) => this.mapRawCategoryToFrontend(c))
        : staticCategories;

      // 4. Map Products
      let rawProducts: RawApiInitProduct[] = [];
      if (Array.isArray(raw?.products)) {
        rawProducts = raw.products;
      }
      const products: Product[] = rawProducts.length > 0
        ? rawProducts.map((p) => this.mapRawProductToFrontend(p))
        : staticProducts;

      // 5. Map Reviews
      const reviews: Review[] = Array.isArray(raw?.reviews)
        ? raw.reviews.map((r) => this.mapRawReviewToFrontend(r))
        : [];

      const result: AppInitData = {
        settings: parsedSettings,
        banners,
        categories,
        products,
        reviews,
        timestamp: Date.now(),
      };

      // Save to localStorage for instant 0ms hydration on subsequent visits
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(APP_INIT_STORAGE_KEY, JSON.stringify(result));
        } catch {
          /* ignore quota */
        }
      }

      return result;
    } catch (err) {
      console.warn("InitService.fetchFreshData failed:", err);
      const cached = this.getCachedData();
      return cached || this.getFallbackData();
    }
  }
}

export const initService = new InitService();
