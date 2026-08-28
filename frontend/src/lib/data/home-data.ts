import { getBanners } from "./banners";
import { getCategories } from "./categories";
import { getProducts } from "./products";
import { getWebsiteSettings } from "./settings";
import type { Product, Category } from "@/lib/shop-data";
import {
  products as staticProducts,
  categories as staticCategories,
  offerBanner as staticOfferBanner,
} from "@/lib/shop-data";
import { initialMockSlides, type HeroSlide } from "@/lib/api/services/banners.service";

export interface HomePageData {
  banners: HeroSlide[];
  categories: Category[];
  products: Product[];
  settings: {
    brandName: string;
    currencySymbol: string;
    freeShippingThreshold: number;
    enableFreeShipping: boolean;
    enableCOD: boolean;
  };
  offerBanner: {
    image: string;
    title: string;
    subtitle: string;
    href: string;
    eyebrow: string;
  };
}

export async function fetchHomePageData(): Promise<HomePageData> {
  try {
    const [bannersResult, categoriesResult, productsResult, settingsResult] = await Promise.allSettled([
      getBanners(),
      getCategories(),
      getProducts({ limit: 50 }),
      getWebsiteSettings(),
    ]);

    const banners: HeroSlide[] =
      bannersResult.status === "fulfilled"
        ? bannersResult.value
        : [];

    const categories: Category[] =
      categoriesResult.status === "fulfilled"
        ? categoriesResult.value
        : [];

    const products: Product[] =
      productsResult.status === "fulfilled"
        ? productsResult.value.products
        : [];

    const settingsObj = settingsResult.status === "fulfilled" ? settingsResult.value : null;

    const brandName = settingsObj?.general?.websiteName || "Arza";
    const currencySymbol = settingsObj?.general?.currencySymbol || "৳";
    const freeShippingThreshold = settingsObj?.shipping?.freeShippingThreshold ?? 5000;
    const enableFreeShipping = settingsObj?.shipping?.enableFreeShipping ?? true;
    const enableCOD = settingsObj?.orders?.enableCOD ?? true;

    // Resolve Offer banner from active banners with position='offer' or fallback
    const offerSlide = banners.find((s) => s.position === "offer" || s.href === "/offers");
    const offerBanner = offerSlide
      ? {
          image: offerSlide.image,
          title: offerSlide.title,
          subtitle: offerSlide.subtitle,
          href: offerSlide.href || "/offers",
          eyebrow: offerSlide.eyebrow || "Limited time",
        }
      : {
          image: staticOfferBanner.image,
          title: staticOfferBanner.title,
          subtitle: staticOfferBanner.subtitle,
          href: "/offers",
          eyebrow: "Limited time",
        };

    return {
      banners,
      categories,
      products,
      settings: {
        brandName,
        currencySymbol,
        freeShippingThreshold,
        enableFreeShipping,
        enableCOD,
      },
      offerBanner,
    };
  } catch (error) {
    console.error("fetchHomePageData direct DB query failed:", error);
    return {
      banners: initialMockSlides,
      categories: staticCategories,
      products: staticProducts,
      settings: {
        brandName: "Arza",
        currencySymbol: "৳",
        freeShippingThreshold: 5000,
        enableFreeShipping: true,
        enableCOD: true,
      },
      offerBanner: {
        image: staticOfferBanner.image,
        title: staticOfferBanner.title,
        subtitle: staticOfferBanner.subtitle,
        href: "/offers",
        eyebrow: "Limited time",
      },
    };
  }
}
