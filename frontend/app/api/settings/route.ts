import { fetchWebsiteSettings } from "@/lib/api-client";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const settings = await fetchWebsiteSettings();
  return NextResponse.json(settings || {});
}
