import { NextResponse } from "next/server";
import { getCategories } from "@/lib/data/categories";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
