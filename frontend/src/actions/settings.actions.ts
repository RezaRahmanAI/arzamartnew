"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { SystemSettings } from "@/types/settings";

export async function updateSettingsAction(newSettings: SystemSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.websiteSettings.findFirst();
    const settingsJson = JSON.stringify(newSettings);

    const siteName = newSettings.general?.websiteName || "Arza Fashion";
    const logoUrl = newSettings.branding?.headerLogo || newSettings.branding?.lightLogo || "/images/logo.png";
    const supportEmail = newSettings.contact?.supportEmail || newSettings.contact?.emailAddress || "support@arza.com";
    const supportPhone = newSettings.contact?.supportPhone || "01700000000";
    const currencySymbol = newSettings.general?.currencySymbol || "TK";
    const metaTitle = newSettings.seo?.defaultMetaTitle || "Arza Fashion";
    const metaDescription = newSettings.seo?.defaultMetaDescription || "Arza Fashion Store";
    const keywords = newSettings.seo?.metaKeywords || "fashion, apparel";

    const fbPlatform = newSettings.socialMedia?.platforms?.find((p) => p.platform.toLowerCase().includes("facebook"));
    const instaPlatform = newSettings.socialMedia?.platforms?.find((p) => p.platform.toLowerCase().includes("instagram"));
    const ytPlatform = newSettings.socialMedia?.platforms?.find((p) => p.platform.toLowerCase().includes("youtube"));

    const facebookUrl = fbPlatform?.url || "";
    const instagramUrl = instaPlatform?.url || "";
    const youtubeUrl = ytPlatform?.url || "";
    const footerCopyright = newSettings.footer?.copyrightText || "© 2026 Arza Fashion";

    const insideRule = newSettings.shipping?.rules?.find((r) => r.name.toLowerCase().includes("inside") || r.name.includes("ঢাকা"));
    const outsideRule = newSettings.shipping?.rules?.find((r) => r.name.toLowerCase().includes("outside") || r.name.includes("বাইরে"));
    const deliveryInsideDhaka = String(insideRule?.charge || 60);
    const deliveryOutsideDhaka = String(outsideRule?.charge || 120);

    if (existing) {
      await prisma.websiteSettings.update({
        where: { id: existing.id },
        data: {
          siteName,
          logoUrl,
          supportEmail,
          supportPhone,
          currencySymbol,
          metaTitle,
          metaDescription,
          keywords,
          facebookUrl,
          instagramUrl,
          youtubeUrl,
          footerCopyright,
          deliveryInsideDhaka,
          deliveryOutsideDhaka,
          settingsJson,
        },
      });
    } else {
      await prisma.websiteSettings.create({
        data: {
          siteName,
          logoUrl,
          supportEmail,
          supportPhone,
          currencySymbol,
          metaTitle,
          metaDescription,
          keywords,
          facebookUrl,
          instagramUrl,
          youtubeUrl,
          footerCopyright,
          deliveryInsideDhaka,
          deliveryOutsideDhaka,
          settingsJson,
        },
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/settings");

    return { success: true };
  } catch (error: unknown) {
    console.error("updateSettingsAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update settings." };
  }
}
