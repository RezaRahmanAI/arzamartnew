"use client";

import { HeroSlider } from "@/components/hero-slider";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/shop-data";
import type { HeroSlide } from "@/lib/api/services/banners.service";

/**
 * Client island: Hero Slider with auto-play + navigation
 */
export function HomePageHero({ banners }: { banners: HeroSlide[] }) {
  return <HeroSlider initialSlides={banners} />;
}

/**
 * Client island: Deals product cards with add-to-cart interactivity
 */
export function HomePageDeals({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}

/**
 * Client island: New Arrivals product cards with add-to-cart interactivity
 */
export function HomePageArrivals({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
    </div>
  );
}
