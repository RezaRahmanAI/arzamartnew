import { getProducts, getProductBySlug } from "@/lib/data/products";
import { getWebsiteSettings } from "@/lib/data/settings";
import { createOrderAction } from "@/actions/orders.actions";
import prisma from "@/lib/prisma";
import type { Product } from "@/lib/shop-data";

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  basePrice: number;
  discountPrice?: number;
  mainImageUrl?: string;
  categoryName: string;
  brandName: string;
  averageRating: number;
  reviewCount: number;
  shortDescription?: string;
  fullDescription?: string;
  images?: { imageUrl: string; isMain: boolean }[];
  variants?: { id: string; name: string; sku: string; priceOverride?: number; stockQuantity: number }[];
}

export interface ApiCategory {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string;
  subCategories: ApiCategory[];
}

export interface ApiSettings {
  siteName: string;
  logoUrl: string;
  supportEmail: string;
  supportPhone: string;
  metaTitle: string;
  metaDescription: string;
  facebookUrl: string;
  instagramUrl: string;
  deliveryInsideDhaka: string;
  deliveryOutsideDhaka: string;
}

export interface OrderItemRequest {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface OrderSubmissionRequest {
  items: OrderItemRequest[];
  shippingAddressJson: string;
  couponCode?: string;
}

export async function fetchProducts(pageIndex = 1, pageSize = 20, search?: string, categoryId?: number): Promise<{ items: Product[]; totalCount: number }> {
  try {
    const res = await getProducts({
      page: pageIndex,
      limit: pageSize,
      search,
      categoryId,
    });
    return { items: res.products, totalCount: res.totalCount };
  } catch (err) {
    console.error("fetchProducts error:", err);
    return { items: [], totalCount: 0 };
  }
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  try {
    return await getProductBySlug(slug);
  } catch (err) {
    console.error("fetchProductBySlug error:", err);
    return null;
  }
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  try {
    const raw = await prisma.category.findMany({
      where: { isActive: true },
      include: { subCategories: true },
    });

    return raw.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl || undefined,
      subCategories: c.subCategories.map((sub) => ({
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        imageUrl: sub.imageUrl || undefined,
        subCategories: [],
      })),
    }));
  } catch (err) {
    console.error("fetchCategories error:", err);
    return [];
  }
}

export async function fetchWebsiteSettings(): Promise<ApiSettings | null> {
  try {
    const s = await getWebsiteSettings();
    const fbUrl = s.socialMedia?.platforms?.find((p) => p.platform.toLowerCase().includes("facebook"))?.url || "";
    const instaUrl = s.socialMedia?.platforms?.find((p) => p.platform.toLowerCase().includes("instagram"))?.url || "";

    return {
      siteName: s.general?.websiteName || "Arza Fashion",
      logoUrl: s.branding?.headerLogo || s.branding?.lightLogo || "/images/logo.png",
      supportEmail: s.contact?.supportEmail || s.contact?.emailAddress || "support@arza.com",
      supportPhone: s.contact?.supportPhone || "01700000000",
      metaTitle: s.seo?.defaultMetaTitle || "Arza Fashion",
      metaDescription: s.seo?.defaultMetaDescription || "Arza Fashion Store",
      facebookUrl: fbUrl,
      instagramUrl: instaUrl,
      deliveryInsideDhaka: String(s.shipping?.rules?.find((r) => r.name.toLowerCase().includes("inside"))?.charge || 60),
      deliveryOutsideDhaka: String(s.shipping?.rules?.find((r) => r.name.toLowerCase().includes("outside"))?.charge || 120),
    };
  } catch (err) {
    console.error("fetchWebsiteSettings error:", err);
    return null;
  }
}

export async function submitOrder(orderData: OrderSubmissionRequest): Promise<{ success: boolean; data?: unknown; message?: string }> {
  try {
    const res = await createOrderAction({
      customer: "Customer",
      phone: "01700000000",
      address: orderData.shippingAddressJson,
      city: "Dhaka",
      items: orderData.items.map((i) => ({
        slug: i.productId,
        name: "Product",
        qty: i.quantity,
        price: 0,
      })),
      total: 0,
      delivery: 60,
    });
    return { success: res.success, data: { orderNumber: res.orderNumber }, message: res.error };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit order";
    return { success: false, message };
  }
}
