import { apiClient } from "../client";

export interface CustomLandingPageConfig {
  id?: string;
  productId: string;
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
  basePrice: number;
  discountPrice?: number | null;
  imageUrl: string;
  images: LandingPageProductImage[];
  variants: LandingPageProductVariant[];
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
    name: "টাইটেল + ছবির গ্রিড",
    description: "গ্যালারি বা ফিচার শোকেস। ২-৪টি ছবির ইন্টারেক্টিভ গ্রিড।",
    icon: "LayoutGrid",
    defaultFields: [
      { key: "title", label: "শিরোনাম", type: "text", enabled: true },
      { key: "images", label: "ছবির URL লিস্ট", type: "images", enabled: true },
    ],
  },
  {
    type: "D",
    name: "টাইটেল + ফিচার কার্ড",
    description: "কেন আমাদের থেকে কিনবেন / বিশেষ ফিচার লিস্ট। আইকন ও টেক্সট কার্ড।",
    icon: "LayoutDashboard",
    defaultFields: [
      { key: "title", label: "শিরোনাম", type: "text", enabled: true },
      { key: "features", label: "ফিচার (প্রতিটি নতুন লাইনে)", type: "textarea", enabled: true },
    ],
  },
  {
    type: "E",
    name: "টাইটেল + টেক্সট + ছবি + বাটন",
    description: "ফুল CTA স্প্লিট সেকশন। টেক্সট ও ছবির সমন্বয়ে একটি সম্পূর্ণ কনভার্সন সেকশন।",
    icon: "Image",
    defaultFields: [
      { key: "title", label: "শিরোনাম", type: "text", enabled: true },
      { key: "description", label: "বর্ণনা", type: "textarea", enabled: true },
      { key: "image", label: "ছবির URL", type: "image", enabled: true },
      { key: "button", label: "বাটন লেবেল", type: "button", enabled: true },
    ],
  },
];

export function getLayoutConfig(type: string): LayoutTypeConfig | undefined {
  return LAYOUT_TYPES.find((lt) => lt.type === type);
}

export function getDefaultValue(type: CustomFieldType): CustomFieldValue {
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
    try {
      const data = await apiClient.get<LandingPageData>(`/custom-landing-page/${encodeURIComponent(slug)}`);
      if (data?.config?.sizePricesJson) {
        data.config.sizePrices = JSON.parse(data.config.sizePricesJson);
      }
      return data;
    } catch (err: unknown) {
      return null;
    }
  },

  async getConfig(productId: string): Promise<CustomLandingPageConfig | null> {
    if (!productId) return null;
    try {
      const data = await apiClient.get<CustomLandingPageConfig | null>(`/custom-landing-page/admin/${productId}`);
      if (data?.sizePricesJson) {
        data.sizePrices = JSON.parse(data.sizePricesJson);
      }
      return data;
    } catch (err: unknown) {
      return null;
    }
  },

  async getAll(): Promise<LandingPageListItem[]> {
    return apiClient.get<LandingPageListItem[]>("/custom-landing-page/admin/all");
  },

  async saveConfig(config: Partial<CustomLandingPageConfig>): Promise<CustomLandingPageConfig> {
    const payload = { ...config };
    if (config.sizePrices) {
      payload.sizePricesJson = JSON.stringify(config.sizePrices);
    }
    return apiClient.post<CustomLandingPageConfig>("/custom-landing-page/admin", payload);
  },

  async deleteConfig(productId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/custom-landing-page/admin/${productId}`);
  },
};
