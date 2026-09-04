import {
  getLandingPageBySlugAction,
  getAllLandingPagesAction,
  getLandingPageConfigAction,
  saveLandingPageConfigAction,
  deleteLandingPageConfigAction,
} from "@/actions/landing-pages.actions";

export interface CLPReview {
  id: string;
  name: string;
  rating: number;
  comment: string;
  imageUrl?: string;
  date?: string;
  verified?: boolean;
}

export interface CustomLandingPageConfig {
  id?: string;
  productId: string;
  productSlug?: string;
  isActive?: boolean;
  isCustomHeroDescriptionVisible?: boolean;
  discountCtaText?: string;
  freeDeliveryCtaText?: string;
  customHeroImagesJson?: string;
  customHeroImages?: string[];
  reviewsJson?: string;
  reviews?: CLPReview[];
  relativeTimerTotalMinutes?: number | null;
  isTimerVisible: boolean;
  headerTitle?: string;
  isProductDetailsVisible?: boolean;
  productDetailsTitle?: string;
  isFabricVisible?: boolean;
  isDesignVisible?: boolean;
  isTrustBannerVisible: boolean;
  trustBannerText?: string;
  trustBannerDescription?: string;
  isFeaturedOrderVisible?: boolean;
  featuredProductName?: string;
  promoPrice?: number;
  originalPrice?: number;
  sizePrices?: Record<string, number>;
  sizePricesJson?: string;
  promoText?: string;
  freeShippingThresholdQuantity?: number | null;
  isMarqueeVisible?: boolean;
  marqueeText?: string;
  customHeroImageUrl?: string;
  customHeroDescription?: string;
  customHeroBgColor?: string;
  customHeroTextColor?: string;
  sectionsJson?: string;
  createdAtUtc?: string;
  updatedAtUtc?: string;
}

export interface LandingPageProductVariant {
  id: string;
  name: string;
  sku?: string;
  priceOverride?: number;
  stockQuantity: number;
}

export interface LandingPageProductImage {
  imageUrl: string;
  isMain: boolean;
}

export interface LandingPageProduct {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  description: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number | null;
  basePrice?: number;
  discountPrice?: number | null;
  imageUrl: string;
  images?: LandingPageProductImage[];
  variants?: LandingPageProductVariant[];
  category?: { id: number; name: string; slug: string } | null;
}

export interface RelatedProductItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  imageUrl: string;
  isFeatured?: boolean;
  variants?: { id: string; name: string; priceOverride?: number; stockQuantity: number }[];
}

export interface LandingPageData {
  product: LandingPageProduct;
  config: CustomLandingPageConfig | null;
  relatedProducts?: RelatedProductItem[];
}

export interface LandingPageListItem {
  productId: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  imageUrl: string;
  hasCustomConfig: boolean;
  config: CustomLandingPageConfig | null;
}

// ─── Dynamic Section System ───────────────────────────────────────────

export type CustomFieldType = "text" | "textarea" | "richtext" | "image" | "images" | "button";

export type CustomFieldValue = string | string[] | boolean | number | null;

export interface CustomField {
  key: string;
  label: string;
  type: CustomFieldType;
  value: CustomFieldValue;
  enabled: boolean;
}

export interface LandingSection {
  id: string;
  type: string;
  label: string;
  visible: boolean;
  icon?: string;
  settings?: Record<string, unknown>;
  customFields?: CustomField[];
}

// ─── Layout Types ────────────────────────────────────────────────────

export type LayoutType = "A" | "B" | "C" | "D" | "E";

export interface LayoutTypeConfig {
  type: LayoutType;
  name: string;
  description: string;
  icon: string;
  defaultFields: Omit<CustomField, "value">[];
}

export const LAYOUT_TYPES: LayoutTypeConfig[] = [
  {
    type: "A",
    name: "টাইটেল + সাবটাইটেল + ছবি",
    description: "হিরো-স্টাইল ব্যানার। কেন্দ্রীয় শিরোনাম, বর্ণনা এবং একটি বড় ছবি।",
    icon: "Image",
    defaultFields: [
      { key: "title", label: "শিরোনাম", type: "text", enabled: true },
      { key: "subtitle", label: "বর্ণনা", type: "textarea", enabled: true },
      { key: "image", label: "ছবির URL", type: "image", enabled: true },
      { key: "button", label: "বাটন লেবেল", type: "button", enabled: true },
    ],
  },
  {
    type: "B",
    name: "টাইটেল + রিচ টেক্সট + বাটন",
    description: "কনটেন্ট সেকশন। শিরোনাম, বিস্তারিত বর্ণনা এবং একটি কল-টু-অ্যাকশন বাটন।",
    icon: "FileText",
    defaultFields: [
      { key: "title", label: "শিরোনাম", type: "text", enabled: true },
      { key: "richtext", label: "বিস্তারিত লেখা", type: "richtext", enabled: true },
      { key: "button", label: "বাটন লেবেল", type: "button", enabled: true },
    ],
  },
  {
    type: "C",
    name: "ছবি গ্যালারি / গ্রিড",
    description: "একাধিক পণ্যের ছবি প্রদর্শনের জন্য গ্রিড লেআউট।",
    icon: "LayoutGrid",
    defaultFields: [
      { key: "title", label: "গ্যালারি শিরোনাম", type: "text", enabled: true },
      { key: "images", label: "ছবিসমূহ", type: "images", enabled: true },
      { key: "caption", label: "ক্যাপশন", type: "text", enabled: false },
    ],
  },
  {
    type: "D",
    name: "ফিচার লিস্ট (আইকন সহ)",
    description: "পণ্যের বিশেষ সুবিধাসমূহ তালিকা আকারে দেখানোর জন্য।",
    icon: "CheckSquare",
    defaultFields: [
      { key: "title", label: "সেকশন শিরোনাম", type: "text", enabled: true },
      { key: "features", label: "বৈশিষ্ট্যসমূহ (কমা দিয়ে আলাদা করুন)", type: "textarea", enabled: true },
      { key: "image", label: "সাইড ছবি", type: "image", enabled: false },
    ],
  },
  {
    type: "E",
    name: "স্পেশাল অফার / ব্যানার",
    description: "জরুরি কল-টু-অ্যাকশন সহ বিশেষ ডিসকাউন্ট ব্যানার।",
    icon: "Sparkles",
    defaultFields: [
      { key: "badge", label: "অফার ব্যাজ", type: "text", enabled: true },
      { key: "title", label: "অফার শিরোনাম", type: "text", enabled: true },
      { key: "discount_text", label: "ডিসকাউন্ট পরিমাণ", type: "text", enabled: true },
      { key: "button", label: "অর্ডার বাটন টেক্সট", type: "button", enabled: true },
    ],
  },
];

export function getLayoutConfig(layoutType: string): LayoutTypeConfig | undefined {
  return LAYOUT_TYPES.find((l) => l.type === layoutType);
}

function getDefaultValue(type: CustomFieldType): CustomFieldValue {
  switch (type) {
    case "text":
      return "";
    case "textarea":
      return "";
    case "richtext":
      return "";
    case "image":
      return "";
    case "images":
      return [""];
    case "button":
      return "অর্ডার করুন এখনই";
    default:
      return "";
  }
}

export function createDefaultFields(layoutType: string): CustomField[] {
  const config = getLayoutConfig(layoutType);
  if (!config) return [];

  return config.defaultFields.map((f) => ({
    ...f,
    value: getDefaultValue(f.type),
  }));
}

export const DEFAULT_LANDING_SECTIONS: LandingSection[] = [
  { id: "marquee", type: "marquee", label: "💬 Marquee Bar", visible: true, icon: "MessageSquare" },
  { id: "countdown", type: "countdown", label: "⏱ Countdown Bar", visible: true, icon: "Clock" },
  { id: "product-hero", type: "product-hero", label: "🛍 Product Hero", visible: true, icon: "ShoppingBag" },
  { id: "discount-cta", type: "discount-cta", label: "💚 Discount CTA", visible: true, icon: "Percent" },
  { id: "info-banner", type: "info-banner", label: "🟡 Info Banner", visible: true, icon: "Info" },
  { id: "trust-banner", type: "trust-banner", label: "🛡️ Trust Banner", visible: true, icon: "ShieldCheck" },
  { id: "product-select", type: "product-select", label: "📦 Product Selection", visible: true, icon: "Boxes" },
  { id: "reviews", type: "reviews", label: "⭐ Customer Reviews", visible: true, icon: "Star" },
  { id: "order-form", type: "order-form", label: "📝 Order Form", visible: true, icon: "CheckCircle2" },
];

export const customLandingPageService = {
  async getBySlug(slug: string): Promise<LandingPageData | null> {
    return getLandingPageBySlugAction(slug);
  },

  async getConfig(productId: string): Promise<CustomLandingPageConfig | null> {
    if (!productId) return null;
    return getLandingPageConfigAction(productId);
  },

  async getAll(): Promise<LandingPageListItem[]> {
    return getAllLandingPagesAction();
  },

  async saveConfig(config: Partial<CustomLandingPageConfig>): Promise<CustomLandingPageConfig> {
    const res = await saveLandingPageConfigAction(config);
    if (!res.success || !res.config) {
      throw new Error(res.error || "Failed to save config");
    }
    return res.config;
  },

  async deleteConfig(productId: string): Promise<{ message: string }> {
    const res = await deleteLandingPageConfigAction(productId);
    if (!res.success) {
      throw new Error(res.error || "Failed to delete config");
    }
    return { message: "Config deleted" };
  },

  async toggleActive(productId: string, isActive: boolean): Promise<boolean> {
    const { toggleLandingPageActiveAction } = await import("@/actions/landing-pages.actions");
    const res = await toggleLandingPageActiveAction(productId, isActive);
    if (!res.success) {
      throw new Error(res.error || "Failed to toggle active status");
    }
    return true;
  },
};
