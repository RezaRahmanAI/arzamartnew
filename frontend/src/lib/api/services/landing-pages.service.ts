import { apiClient } from "../client";

export interface LandingPageItem {
  id: number;
  productId?: string;
  title: string;
  subtitle?: string;
  slug: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  videoUrl?: string;
  contentJson: string;
  sectionsJson?: string;
  reviewsJson?: string;
  specialPrice: number;
  oldPrice: number;
  deliveryCharge: number;
  callButtonText: string;
  isActive: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string;
}

export interface LandingPageResponse {
  landingPage: LandingPageItem;
  product?: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    discountPrice?: number;
    images: { imageUrl: string; isMain: boolean }[];
    variants: { id: string; name: string; sku: string; priceOverride?: number; stockQuantity: number }[];
    category?: { name: string };
  };
}

export const landingPagesService = {
  async getAll(): Promise<LandingPageItem[]> {
    return apiClient.get<LandingPageItem[]>("/landingpages");
  },

  async getBySlug(slug: string): Promise<LandingPageResponse> {
    return apiClient.get<LandingPageResponse>(`/landingpages/${slug}`);
  },

  async getByProductId(productId: string): Promise<LandingPageItem> {
    return apiClient.get<LandingPageItem>(`/landingpages/product/${productId}`);
  },

  async upsert(data: Partial<LandingPageItem>): Promise<LandingPageItem> {
    return apiClient.post<LandingPageItem>("/landingpages", data);
  },

  async delete(id: number): Promise<{ message: string }> {
    try {
      return await apiClient.delete<{ message: string }>(`/landingpages/${id}`);
    } catch {
      // Fallback in case IIS / WebDAV server blocks HTTP DELETE method
      return await apiClient.post<{ message: string }>(`/landingpages/delete/${id}`);
    }
  },
};
