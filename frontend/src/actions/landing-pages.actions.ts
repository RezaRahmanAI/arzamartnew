"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { CustomLandingPageConfig } from "@/lib/api/services/custom-landing-page.service";
import { Prisma } from "@prisma/client";

export async function saveLandingPageConfigAction(
  config: Partial<CustomLandingPageConfig>
): Promise<{ success: boolean; config?: CustomLandingPageConfig; error?: string }> {
  try {
    if (!config.productId) {
      return { success: false, error: "Product ID is required." };
    }

    const productId = config.productId;
    const existing = await prisma.customLandingPageConfig.findUnique({
      where: { productId },
    });

    const sizePricesJson = config.sizePrices ? JSON.stringify(config.sizePrices) : config.sizePricesJson || null;

    const data: Prisma.CustomLandingPageConfigUpdateInput = {
      relativeTimerTotalMinutes: config.relativeTimerTotalMinutes ?? 120,
      isTimerVisible: config.isTimerVisible ?? true,
      headerTitle: config.headerTitle ?? null,
      isProductDetailsVisible: config.isProductDetailsVisible ?? true,
      productDetailsTitle: config.productDetailsTitle ?? null,
      isFabricVisible: config.isFabricVisible ?? true,
      isDesignVisible: config.isDesignVisible ?? true,
      isTrustBannerVisible: config.isTrustBannerVisible ?? true,
      trustBannerText: config.trustBannerText ?? null,
      trustBannerDescription: config.trustBannerDescription ?? null,
      isFeaturedOrderVisible: config.isFeaturedOrderVisible ?? true,
      featuredProductName: config.featuredProductName ?? null,
      promoPrice: config.promoPrice !== undefined && config.promoPrice !== null ? Number(config.promoPrice) : null,
      originalPrice: config.originalPrice !== undefined && config.originalPrice !== null ? Number(config.originalPrice) : null,
      sizePricesJson,
      promoText: config.promoText ?? null,
      freeShippingThresholdQuantity: config.freeShippingThresholdQuantity ?? null,
      isMarqueeVisible: config.isMarqueeVisible ?? true,
      marqueeText: config.marqueeText ?? null,
      customHeroImageUrl: config.customHeroImageUrl ?? null,
      customHeroDescription: config.customHeroDescription ?? null,
      customHeroBgColor: config.customHeroBgColor ?? "#9333ea",
      customHeroTextColor: config.customHeroTextColor ?? "#ffffff",
      sectionsJson: config.sectionsJson ?? null,
    };

    let row;
    if (existing) {
      row = await prisma.customLandingPageConfig.update({
        where: { id: existing.id },
        data,
      });
    } else {
      row = await prisma.customLandingPageConfig.create({
        data: {
          productId,
          relativeTimerTotalMinutes: config.relativeTimerTotalMinutes ?? 120,
          isTimerVisible: config.isTimerVisible ?? true,
          headerTitle: config.headerTitle ?? null,
          isProductDetailsVisible: config.isProductDetailsVisible ?? true,
          productDetailsTitle: config.productDetailsTitle ?? null,
          isFabricVisible: config.isFabricVisible ?? true,
          isDesignVisible: config.isDesignVisible ?? true,
          isTrustBannerVisible: config.isTrustBannerVisible ?? true,
          trustBannerText: config.trustBannerText ?? null,
          trustBannerDescription: config.trustBannerDescription ?? null,
          isFeaturedOrderVisible: config.isFeaturedOrderVisible ?? true,
          featuredProductName: config.featuredProductName ?? null,
          promoPrice: config.promoPrice !== undefined && config.promoPrice !== null ? Number(config.promoPrice) : null,
          originalPrice: config.originalPrice !== undefined && config.originalPrice !== null ? Number(config.originalPrice) : null,
          sizePricesJson,
          promoText: config.promoText ?? null,
          freeShippingThresholdQuantity: config.freeShippingThresholdQuantity ?? null,
          isMarqueeVisible: config.isMarqueeVisible ?? true,
          marqueeText: config.marqueeText ?? null,
          customHeroImageUrl: config.customHeroImageUrl ?? null,
          customHeroDescription: config.customHeroDescription ?? null,
          customHeroBgColor: config.customHeroBgColor ?? "#9333ea",
          customHeroTextColor: config.customHeroTextColor ?? "#ffffff",
          sectionsJson: config.sectionsJson ?? null,
        },
      });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (product?.slug) {
      revalidatePath(`/clp/${product.slug}`);
      revalidatePath(`/landing/${product.slug}`);
    }
    revalidatePath("/admin/landing-pages");
    revalidatePath("/admin/landing-page-design");

    return {
      success: true,
      config: {
        id: row.id,
        productId: row.productId,
        productSlug: product?.slug,
        relativeTimerTotalMinutes: row.relativeTimerTotalMinutes,
        isTimerVisible: row.isTimerVisible,
        headerTitle: row.headerTitle || undefined,
        isProductDetailsVisible: row.isProductDetailsVisible,
        productDetailsTitle: row.productDetailsTitle || undefined,
        isFabricVisible: row.isFabricVisible,
        isDesignVisible: row.isDesignVisible,
        isTrustBannerVisible: row.isTrustBannerVisible,
        trustBannerText: row.trustBannerText || undefined,
        trustBannerDescription: row.trustBannerDescription || undefined,
        isFeaturedOrderVisible: row.isFeaturedOrderVisible,
        featuredProductName: row.featuredProductName || undefined,
        promoPrice: row.promoPrice ? Number(row.promoPrice) : undefined,
        originalPrice: row.originalPrice ? Number(row.originalPrice) : undefined,
        sizePricesJson: row.sizePricesJson || undefined,
        promoText: row.promoText || undefined,
        freeShippingThresholdQuantity: row.freeShippingThresholdQuantity,
        isMarqueeVisible: row.isMarqueeVisible,
        marqueeText: row.marqueeText || undefined,
        customHeroImageUrl: row.customHeroImageUrl || undefined,
        customHeroDescription: row.customHeroDescription || undefined,
        customHeroBgColor: row.customHeroBgColor || undefined,
        customHeroTextColor: row.customHeroTextColor || undefined,
        sectionsJson: row.sectionsJson || undefined,
      },
    };
  } catch (error: unknown) {
    console.error("saveLandingPageConfigAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to save landing page config." };
  }
}

export async function deleteLandingPageConfigAction(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.customLandingPageConfig.deleteMany({
      where: { productId },
    });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (product?.slug) {
      revalidatePath(`/clp/${product.slug}`);
      revalidatePath(`/landing/${product.slug}`);
    }
    revalidatePath("/admin/landing-pages");

    return { success: true };
  } catch (error: unknown) {
    console.error("deleteLandingPageConfigAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete landing page config." };
  }
}
