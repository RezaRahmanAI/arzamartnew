import { NextResponse } from "next/server";
import { getWebsiteSettings } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getWebsiteSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
