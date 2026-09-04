import { SystemSettings, DEFAULT_SYSTEM_SETTINGS } from "@/types/settings";
import { type HeroSlide, initialMockSlides } from "./banners.service";
import { type Category, type Product, products as staticProducts, categories as staticCategories } from "@/lib/shop-data";
import { type Review } from "@/lib/reviews";
import { getImageUrl } from "@/lib/utils";

export interface RawApiInitProduct {
  id?: string;
  slug: string;
  name: string;
  categoryName?: string;
  category?: string;
  subcategory?: string;
  basePrice?: number;
  price?: number;
  discountPrice?: number;
  mainImageUrl?: string;
  image?: string;
  shortDescription?: string;
  fullDescription?: string;
  description?: string;
  badge?: string;
  isBundle?: boolean;
  bundleProducts?: string[];
  offerRuleIds?: string[];
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
  id?: number;
  slug: string;
  name: string;
  imageUrl?: string;
  image?: string;
  blurb?: string;
  parentCategoryId?: number | null;
  parentSlug?: string | null;
  parentName?: string | null;
  subCategories?: RawApiInitCategory[];
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

export const APP_INIT_STORAGE_KEY = "arzamart_app_init_cache_v4";

class InitService {
  private mapRawProductToFrontend(p: RawApiInitProduct): Product {
    const basePrice = p.basePrice ?? p.price ?? 0;
    const discountPrice = p.discountPrice;
    const mainImg = getImageUrl(p.mainImageUrl || p.image);
    return {
      id: p.id ? String(p.id) : undefined,
      slug: p.slug,
      name: p.name,
      category: p.category ? String(p.category) : p.categoryName ? String(p.categoryName).toLowerCase().replace(/[^a-z0-9-]+/g, "-") : "t-shirts",
      subcategory: p.subcategory ? String(p.subcategory) : undefined,
      price: discountPrice && discountPrice > 0 ? discountPrice : basePrice,
      compareAt: discountPrice && discountPrice < basePrice ? basePrice : undefined,
      mrp: basePrice,
      image: mainImg,
      sizes: p.variants && Array.isArray(p.variants) && p.variants.length > 0
        ? p.variants.map((v) => v.name.replace("Size: ", ""))
        : Array.isArray(p.sizes) && p.sizes.length > 0
        ? p.sizes
        : ["M", "L", "XL", "XXL"],
      description: p.fullDescription || p.description || p.shortDescription || "",
      shortDescription: p.shortDescription || "",
      discountNote: p.shortDescription || undefined,
      badge: p.badge,
      isBundle: p.isBundle ?? false,
      bundleProducts: p.bundleProducts ?? undefined,
      offerRuleIds: p.offerRuleIds ?? undefined,
      sizePrices: p.variants && Array.isArray(p.variants) && p.variants.length > 0
        ? Object.fromEntries(p.variants.map((v) => [v.name.replace("Size: ", ""), v.priceOverride ?? basePrice]))
        : p.sizePrices || {},
      sizeStock: p.variants && Array.isArray(p.variants) && p.variants.length > 0
        ? Object.fromEntries(p.variants.map((v) => [v.name.replace("Size: ", ""), v.stockQuantity ?? 15]))
        : p.sizeStock || {},
      images: Array.isArray(p.images) && p.images.length > 0
        ? p.images.map((img) => getImageUrl(img)).filter(Boolean)
        : [mainImg]
    };
  }

  private mapRawBannerToFrontend(b: RawApiInitBanner): HeroSlide {
    return {
      id: String(b.id),
      title: b.title || "",
      subtitle: b.subtitle || "",
      image: getImageUrl(b.imageUrl || b.image),
      href: b.targetUrl || b.href || "/",
      position: b.position || "slider",
      displayOrder: b.displayOrder ?? 0,
      isActive: b.isActive ?? true,
      eyebrow: b.eyebrow || "New Collection",
    };
  }

  private mapRawCategoryToFrontend(c: RawApiInitCategory): Category {
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      image: getImageUrl(c.imageUrl || c.image),
      blurb: c.blurb || "",
      parentCategoryId: c.parentCategoryId,
      parentSlug: c.parentSlug || null,
      parentName: c.parentName || null,
      subCategories: Array.isArray(c.subCategories)
        ? c.subCategories.map((sub) => this.mapRawCategoryToFrontend(sub))
        : [],
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
   * Synchronous local storage cache read
   */
  public getCachedData(): AppInitData | null {
    if (typeof window === "undefined") return null;
    try {
      // Purge old legacy cache if present
      localStorage.removeItem("arzamart_app_init_cache_v2");
      localStorage.removeItem("arzamart_app_init_cache_v1");

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
   * Static initial empty shell data (prevents flash of fake mock data)
   */
  public getFallbackData(): AppInitData {
    return {
      settings: DEFAULT_SYSTEM_SETTINGS,
      banners: [],
      categories: [],
      products: [],
      reviews: [],
      timestamp: Date.now(),
    };
  }

  /**
   * Direct internal Next.js API call to /api/init (which queries Prisma directly)
   */
  public async fetchFreshData(): Promise<AppInitData> {
    try {
      const res = await fetch("/api/init", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: RawInitResponse = await res.json();

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
      const banners: HeroSlide[] = Array.isArray(raw?.banners)
        ? raw.banners.map((b) => this.mapRawBannerToFrontend(b))
        : [];

      // 3. Map Categories
      const categories: Category[] = Array.isArray(raw?.categories)
        ? raw.categories.map((c) => this.mapRawCategoryToFrontend(c))
        : [];

      // 4. Map Products
      let rawProducts: RawApiInitProduct[] = [];
      if (Array.isArray(raw?.products)) {
        rawProducts = raw.products;
      }
      const products: Product[] = rawProducts.map((p) => this.mapRawProductToFrontend(p));

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

      // Save to localStorage
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(APP_INIT_STORAGE_KEY, JSON.stringify(result));
        } catch {
          /* ignore quota */
        }
      }

      return result;
    } catch (err) {
      console.warn("InitService.fetchFreshData failed, using cached/fallback:", err);
      const cached = this.getCachedData();
      return cached || this.getFallbackData();
    }
  }
}

export const initService = new InitService();
