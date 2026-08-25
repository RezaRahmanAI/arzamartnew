import { NextResponse } from "next/server";
import { getProducts } from "@/lib/data/products";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const categorySlug = searchParams.get("category") || undefined;
    const categoryIdStr = searchParams.get("categoryId");
    const categoryId = categoryIdStr ? parseInt(categoryIdStr) : undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const result = await getProducts({
      page,
      limit,
      search,
      categoryId,
      categorySlug,
    });

    return NextResponse.json({
      isSuccess: true,
      data: {
        items: result.products,
        totalCount: result.totalCount,
      },
    });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ isSuccess: false, data: { items: [], totalCount: 0 } }, { status: 500 });
  }
}
