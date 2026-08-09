const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5273/api/v1";

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

export async function fetchProducts(pageIndex = 1, pageSize = 20, search?: string, categoryId?: number): Promise<{ items: ApiProduct[]; totalCount: number }> {
  try {
    const params = new URLSearchParams({
      pageIndex: pageIndex.toString(),
      pageSize: pageSize.toString(),
    });
    if (search) params.append("search", search);
    if (categoryId) params.append("categoryId", categoryId.toString());

    const res = await fetch(`${API_BASE_URL}/products?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch products");
    const json = await res.json();
    if (json.isSuccess && json.data) {
      return { items: json.data.items || [], totalCount: json.data.totalCount || 0 };
    }
    return { items: [], totalCount: 0 };
  } catch (err) {
    console.error("fetchProducts error:", err);
    return { items: [], totalCount: 0 };
  }
}

export async function fetchProductBySlug(slug: string): Promise<ApiProduct | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/products/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.isSuccess ? json.data : null;
  } catch (err) {
    console.error("fetchProductBySlug error:", err);
    return null;
  }
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/categories`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json)) return json;
    return json.isSuccess ? json.data || [] : [];
  } catch (err) {
    console.error("fetchCategories error:", err);
    return [];
  }
}

export async function fetchWebsiteSettings(): Promise<ApiSettings | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/settings`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.isSuccess ? json.data : null;
  } catch (err) {
    console.error("fetchWebsiteSettings error:", err);
    return null;
  }
}

export async function submitOrder(orderData: OrderSubmissionRequest): Promise<{ success: boolean; data?: unknown; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    const json = await res.json();
    return { success: json.isSuccess, data: json.data, message: json.error };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit order";
    return { success: false, message };
  }
}
