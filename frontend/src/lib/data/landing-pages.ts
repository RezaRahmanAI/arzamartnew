import prisma from "@/lib/prisma";
import type { LandingPageData, CustomLandingPageConfig, LandingPageListItem } from "@/lib/api/services/custom-landing-page.service";

export async function getLandingPageBySlug(slug: string): Promise<LandingPageData | null> {
  try {
    const cleanSlug = slug.trim().toLowerCase();
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { slug: cleanSlug },
          { slug: cleanSlug.replace(/-/g, "") },
          { id: cleanSlug.length === 36 ? cleanSlug : undefined },
        ],
      },
      include: {
        category: true,
        images: true,
        variants: true,
        customLandingPageConfig: true,
      },
    });

    if (!product) return null;

    const config = product.customLandingPageConfig;
    let sizePrices: Record<string, number> | undefined = undefined;
    if (config?.sizePricesJson) {
      try {
        sizePrices = JSON.parse(config.sizePricesJson);
      } catch {
        /* ignore */
      }
    }

    const customConfig: CustomLandingPageConfig | null = config
      ? {
          id: config.id,
          productId: config.productId,
          productSlug: product.slug,
          relativeTimerTotalMinutes: config.relativeTimerTotalMinutes,
          isTimerVisible: config.isTimerVisible,
          headerTitle: config.headerTitle || undefined,
          isProductDetailsVisible: config.isProductDetailsVisible,
          productDetailsTitle: config.productDetailsTitle || undefined,
          isFabricVisible: config.isFabricVisible,
          isDesignVisible: config.isDesignVisible,
          isTrustBannerVisible: config.isTrustBannerVisible,
          trustBannerText: config.trustBannerText || undefined,
          trustBannerDescription: config.trustBannerDescription || undefined,
          isFeaturedOrderVisible: config.isFeaturedOrderVisible,
          featuredProductName: config.featuredProductName || undefined,
          promoPrice: config.promoPrice ? Number(config.promoPrice) : undefined,
          originalPrice: config.originalPrice ? Number(config.originalPrice) : undefined,
          sizePrices,
          sizePricesJson: config.sizePricesJson || undefined,
          promoText: config.promoText || undefined,
          freeShippingThresholdQuantity: config.freeShippingThresholdQuantity,
          isMarqueeVisible: config.isMarqueeVisible,
          marqueeText: config.marqueeText || undefined,
          customHeroImageUrl: config.customHeroImageUrl || undefined,
          customHeroDescription: config.customHeroDescription || undefined,
          customHeroBgColor: config.customHeroBgColor || undefined,
          customHeroTextColor: config.customHeroTextColor || undefined,
          sectionsJson: config.sectionsJson || undefined,
        }
      : null;

    const basePrice = Number(product.basePrice) || 0;
    const discountPrice = product.discountPrice ? Number(product.discountPrice) : null;
    const sortedImages = [...product.images].sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0) || a.displayOrder - b.displayOrder);
    const mainImg = sortedImages[0]?.imageUrl || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";

    const relatedRows = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: product.id },
        categoryId: product.categoryId,
      },
      include: {
        images: true,
        variants: true,
      },
      take: 6,
    });

    return {
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.fullDescription || product.shortDescription || "",
        shortDescription: product.shortDescription,
        price: discountPrice && discountPrice > 0 ? discountPrice : basePrice,
        compareAtPrice: discountPrice && discountPrice < basePrice ? basePrice : null,
        basePrice,
        discountPrice,
        imageUrl: mainImg,
        images: sortedImages.map((i) => ({ imageUrl: i.imageUrl, isMain: i.isMain })),
        variants: product.variants.map((v) => ({
          id: v.id,
          name: v.name.replace(/^Size:\s*/i, ""),
          sku: v.sku,
          priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
          stockQuantity: v.stockQuantity,
        })),
        category: product.category ? { id: product.category.id, name: product.category.name, slug: product.category.slug } : null,
      },
      config: customConfig,
      relatedProducts: relatedRows.map((rp) => {
        const rpBase = Number(rp.basePrice) || 0;
        const rpDisc = rp.discountPrice ? Number(rp.discountPrice) : null;
        return {
          id: rp.id,
          name: rp.name,
          slug: rp.slug,
          price: rpDisc && rpDisc > 0 ? rpDisc : rpBase,
          compareAtPrice: rpDisc && rpDisc < rpBase ? rpBase : null,
          imageUrl: rp.images.find((i) => i.isMain)?.imageUrl || rp.images[0]?.imageUrl || mainImg,
          variants: rp.variants.map((v) => ({
            id: v.id,
            name: v.name.replace(/^Size:\s*/i, ""),
            priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
            stockQuantity: v.stockQuantity,
          })),
        };
      }),
    };
  } catch (error) {
    console.error(`getLandingPageBySlug failed for ${slug}:`, error);
    return null;
  }
}

export async function getAllLandingPages(): Promise<LandingPageListItem[]> {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        images: true,
        customLandingPageConfig: true,
      },
      orderBy: { createdAtUtc: "desc" },
    });

    return products.map((p) => {
      const basePrice = Number(p.basePrice) || 0;
      const discountPrice = p.discountPrice ? Number(p.discountPrice) : null;
      const mainImg = p.images.find((i) => i.isMain)?.imageUrl || p.images[0]?.imageUrl || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";
      const config = p.customLandingPageConfig;

      return {
        productId: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category?.name || "General",
        price: discountPrice && discountPrice > 0 ? discountPrice : basePrice,
        imageUrl: mainImg,
        hasCustomConfig: !!config,
        config: config
          ? {
              id: config.id,
              productId: config.productId,
              productSlug: p.slug,
              relativeTimerTotalMinutes: config.relativeTimerTotalMinutes,
              isTimerVisible: config.isTimerVisible,
              headerTitle: config.headerTitle || undefined,
              isProductDetailsVisible: config.isProductDetailsVisible,
              productDetailsTitle: config.productDetailsTitle || undefined,
              isFabricVisible: config.isFabricVisible,
              isDesignVisible: config.isDesignVisible,
              isTrustBannerVisible: config.isTrustBannerVisible,
              trustBannerText: config.trustBannerText || undefined,
              trustBannerDescription: config.trustBannerDescription || undefined,
              isFeaturedOrderVisible: config.isFeaturedOrderVisible,
              featuredProductName: config.featuredProductName || undefined,
              promoPrice: config.promoPrice ? Number(config.promoPrice) : undefined,
              originalPrice: config.originalPrice ? Number(config.originalPrice) : undefined,
              sizePricesJson: config.sizePricesJson || undefined,
              promoText: config.promoText || undefined,
              freeShippingThresholdQuantity: config.freeShippingThresholdQuantity,
              isMarqueeVisible: config.isMarqueeVisible,
              marqueeText: config.marqueeText || undefined,
              customHeroImageUrl: config.customHeroImageUrl || undefined,
              customHeroDescription: config.customHeroDescription || undefined,
              customHeroBgColor: config.customHeroBgColor || undefined,
              customHeroTextColor: config.customHeroTextColor || undefined,
              sectionsJson: config.sectionsJson || undefined,
            }
          : null,
      };
    });
  } catch (error) {
    console.error("getAllLandingPages query failed:", error);
    return [];
  }
}
