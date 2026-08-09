import { apiClient, ApiResponse, PagedResponse } from "./api-client";

export interface ProductListDto {
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
}

export interface ProductDetailDto {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  fullDescription: string;
  basePrice: number;
  discountPrice?: number;
  averageRating: number;
  reviewCount: number;
  category: string;
  brand: string;
  images: { imageUrl: string; isMain: boolean }[];
  variants: { id: string; name: string; sku: string; priceOverride?: number; stockQuantity: number }[];
}

export const ProductService = {
  async getProducts(pageIndex = 1, pageSize = 12, search?: string, categoryId?: number): Promise<PagedResponse<ProductListDto>> {
    const params = new URLSearchParams({
      pageIndex: pageIndex.toString(),
      pageSize: pageSize.toString(),
    });

    if (search) params.append("search", search);
    if (categoryId) params.append("categoryId", categoryId.toString());

    const res = await apiClient<PagedResponse<ProductListDto>>(`/products?${params.toString()}`, {
      next: { revalidate: 60, tags: ["products"] },
    });
    return res.data;
  },

  async getProductBySlug(slug: string): Promise<ProductDetailDto> {
    const res = await apiClient<ProductDetailDto>(`/products/${slug}`, {
      next: { revalidate: 60, tags: [`product:${slug}`] },
    });
    return res.data;
  },
};
