import { fetchCategories } from "@/lib/api-client";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const categories = await fetchCategories();
  return NextResponse.json(categories);
}
