import prisma from "@/lib/prisma";
import { SystemSettings, DEFAULT_SYSTEM_SETTINGS } from "@/types/settings";

export async function getWebsiteSettings(): Promise<SystemSettings> {
  try {
    const row = await prisma.websiteSettings.findFirst();

    if (row && row.settingsJson) {
      try {
        const parsed = JSON.parse(row.settingsJson);
        return {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...parsed,
          general: { ...DEFAULT_SYSTEM_SETTINGS.general, ...(parsed.general || {}) },
          shipping: { ...DEFAULT_SYSTEM_SETTINGS.shipping, ...(parsed.shipping || {}) },
          branding: { ...DEFAULT_SYSTEM_SETTINGS.branding, ...(parsed.branding || {}) },
          contact: { ...DEFAULT_SYSTEM_SETTINGS.contact, ...(parsed.contact || {}) },
          orders: { ...DEFAULT_SYSTEM_SETTINGS.orders, ...(parsed.orders || {}) },
        };
      } catch {
        /* fallback to columns */
      }
    }

    if (row) {
      const insideRate = parseFloat(row.deliveryInsideDhaka) || 60;
      const outsideRate = parseFloat(row.deliveryOutsideDhaka) || 120;

      return {
        ...DEFAULT_SYSTEM_SETTINGS,
        general: {
          ...DEFAULT_SYSTEM_SETTINGS.general,
          websiteName: row.siteName || DEFAULT_SYSTEM_SETTINGS.general.websiteName,
          currencySymbol: row.currencySymbol || DEFAULT_SYSTEM_SETTINGS.general.currencySymbol,
        },
        branding: {
          ...DEFAULT_SYSTEM_SETTINGS.branding,
          headerLogo: row.logoUrl || DEFAULT_SYSTEM_SETTINGS.branding.headerLogo,
        },
        contact: {
          ...DEFAULT_SYSTEM_SETTINGS.contact,
          supportEmail: row.supportEmail || DEFAULT_SYSTEM_SETTINGS.contact.supportEmail,
          supportPhone: row.supportPhone || DEFAULT_SYSTEM_SETTINGS.contact.supportPhone,
        },
        shipping: {
          ...DEFAULT_SYSTEM_SETTINGS.shipping,
          rules: [
            { id: "inside-dhaka", name: "Inside Dhaka", charge: insideRate, estimatedDeliveryTime: "1-3 days", status: "active", displayOrder: 1 },
            { id: "outside-dhaka", name: "Outside Dhaka", charge: outsideRate, estimatedDeliveryTime: "3-5 days", status: "active", displayOrder: 2 },
          ],
        },
        seo: {
          ...DEFAULT_SYSTEM_SETTINGS.seo,
          defaultMetaTitle: row.metaTitle || DEFAULT_SYSTEM_SETTINGS.seo.defaultMetaTitle,
          defaultMetaDescription: row.metaDescription || DEFAULT_SYSTEM_SETTINGS.seo.defaultMetaDescription,
          metaKeywords: row.keywords || DEFAULT_SYSTEM_SETTINGS.seo.metaKeywords,
        },
        socialMedia: {
          ...DEFAULT_SYSTEM_SETTINGS.socialMedia,
          platforms: [
            { id: "fb", platform: "Facebook", url: row.facebookUrl || "", iconName: "Facebook", displayOrder: 1, active: !!row.facebookUrl },
            { id: "insta", platform: "Instagram", url: row.instagramUrl || "", iconName: "Instagram", displayOrder: 2, active: !!row.instagramUrl },
            { id: "yt", platform: "YouTube", url: row.youtubeUrl || "", iconName: "Youtube", displayOrder: 3, active: !!row.youtubeUrl },
          ].filter((p) => p.url),
        },
        footer: {
          ...DEFAULT_SYSTEM_SETTINGS.footer,
          copyrightText: row.footerCopyright || DEFAULT_SYSTEM_SETTINGS.footer.copyrightText,
        },
      };
    }

    return DEFAULT_SYSTEM_SETTINGS;
  } catch (error) {
    console.error("getWebsiteSettings query failed:", error);
    return DEFAULT_SYSTEM_SETTINGS;
  }
}
