import { NextResponse } from "next/server";
import { getBanners } from "@/lib/data/banners";
import { getCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { getWebsiteSettings } from "@/lib/data/settings";
import { getRecentReviews } from "@/lib/data/reviews";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [banners, categories, productsResult, settings, reviews] = await Promise.all([
      getBanners(),
      getCategories(),
      getProducts({ limit: 50 }),
      getWebsiteSettings(),
      getRecentReviews(20),
    ]);

    return NextResponse.json({
      settings,
      banners,
      categories,
      products: productsResult.products,
      reviews,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("GET /api/init error:", error);
    return NextResponse.json({ error: "Failed to load init data" }, { status: 500 });
  }
}
