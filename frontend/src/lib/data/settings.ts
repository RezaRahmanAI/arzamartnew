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
          branding: { ...DEFAULT_SYSTEM_SETTINGS.branding, ...(parsed.branding || {}) },
          contact: { ...DEFAULT_SYSTEM_SETTINGS.contact, ...(parsed.contact || {}) },
          shipping: {
            ...DEFAULT_SYSTEM_SETTINGS.shipping,
            ...(parsed.shipping || {}),
            rules:
              Array.isArray(parsed.shipping?.rules) && parsed.shipping.rules.length > 0
                ? parsed.shipping.rules
                : DEFAULT_SYSTEM_SETTINGS.shipping.rules,
          },
          socialMedia: {
            ...DEFAULT_SYSTEM_SETTINGS.socialMedia,
            ...(parsed.socialMedia || {}),
            platforms:
              Array.isArray(parsed.socialMedia?.platforms) && parsed.socialMedia.platforms.length > 0
                ? parsed.socialMedia.platforms
                : DEFAULT_SYSTEM_SETTINGS.socialMedia.platforms,
            sources: { ...DEFAULT_SYSTEM_SETTINGS.socialMedia.sources, ...(parsed.socialMedia?.sources || {}) },
          },
          business: { ...DEFAULT_SYSTEM_SETTINGS.business, ...(parsed.business || {}) },
          seo: { ...DEFAULT_SYSTEM_SETTINGS.seo, ...(parsed.seo || {}) },
          footer: {
            ...DEFAULT_SYSTEM_SETTINGS.footer,
            ...(parsed.footer || {}),
            footerMenuLinks:
              Array.isArray(parsed.footer?.footerMenuLinks) && parsed.footer.footerMenuLinks.length > 0
                ? parsed.footer.footerMenuLinks
                : DEFAULT_SYSTEM_SETTINGS.footer.footerMenuLinks,
            paymentMethodsBadges:
              Array.isArray(parsed.footer?.paymentMethodsBadges) && parsed.footer.paymentMethodsBadges.length > 0
                ? parsed.footer.paymentMethodsBadges
                : DEFAULT_SYSTEM_SETTINGS.footer.paymentMethodsBadges,
            trustBadges:
              Array.isArray(parsed.footer?.trustBadges) && parsed.footer.trustBadges.length > 0
                ? parsed.footer.trustBadges
                : DEFAULT_SYSTEM_SETTINGS.footer.trustBadges,
          },
          navigation: {
            ...DEFAULT_SYSTEM_SETTINGS.navigation,
            ...(parsed.navigation || {}),
            headerMenu:
              Array.isArray(parsed.navigation?.headerMenu) && parsed.navigation.headerMenu.length > 0
                ? parsed.navigation.headerMenu
                : DEFAULT_SYSTEM_SETTINGS.navigation.headerMenu,
          },
          orders: { ...DEFAULT_SYSTEM_SETTINGS.orders, ...(parsed.orders || {}) },
          notifications: { ...DEFAULT_SYSTEM_SETTINGS.notifications, ...(parsed.notifications || {}) },
          advanced: { ...DEFAULT_SYSTEM_SETTINGS.advanced, ...(parsed.advanced || {}) },
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
            { id: "inside-dhaka", name: "Inside Dhaka (ঢাকার ভিতরে)", charge: insideRate, estimatedDeliveryTime: "24-48 Hours", status: "active", displayOrder: 1 },
            { id: "outside-dhaka", name: "Outside Dhaka (ঢাকার বাইরে)", charge: outsideRate, estimatedDeliveryTime: "2-3 Days", status: "active", displayOrder: 2 },
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
            { id: "fb", platform: "Facebook", url: row.facebookUrl || "https://facebook.com/arzamart", iconName: "Facebook", displayOrder: 1, active: true },
            { id: "insta", platform: "Instagram", url: row.instagramUrl || "https://instagram.com/arzamart", iconName: "Instagram", displayOrder: 2, active: true },
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
