import { fetchProducts } from "@/lib/api-client";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const categoryIdStr = searchParams.get("categoryId");
  const categoryId = categoryIdStr ? parseInt(categoryIdStr) : undefined;

  const result = await fetchProducts(1, 50, search, categoryId);
  return NextResponse.json(result.items);
}
