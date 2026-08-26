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

import { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Client island: New Arrivals 1-row Auto-sliding Carousel with Controls
 */
export function HomePageArrivals({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-slide every 3.5 seconds
  useEffect(() => {
    if (isHovered || products.length === 0) return;

    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const scrollStep = clientWidth > 768 ? 320 : 220;

      if (scrollLeft >= maxScroll - 10) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollRef.current.scrollBy({ left: scrollStep, behavior: "smooth" });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isHovered, products.length]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollStep = scrollRef.current.clientWidth > 768 ? 340 : 240;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollStep : scrollStep,
      behavior: "smooth",
    });
  };

  if (products.length === 0) return null;

  return (
    <div
      className="relative group mt-5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Scroll Left Button */}
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 z-20 size-9 sm:size-10 rounded-full bg-card/95 border border-border shadow-md text-foreground flex items-center justify-center transition-all hover:bg-card hover:scale-110 active:scale-95 cursor-pointer backdrop-blur opacity-90 group-hover:opacity-100"
      >
        <ChevronLeft className="size-5" />
      </button>

      {/* Horizontal Carousel Container (1 row) */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-3 pt-1 px-1 no-scrollbar select-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((p) => (
          <div
            key={p.slug}
            className="w-[180px] sm:w-[220px] md:w-[260px] shrink-0"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Scroll Right Button */}
      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 z-20 size-9 sm:size-10 rounded-full bg-card/95 border border-border shadow-md text-foreground flex items-center justify-center transition-all hover:bg-card hover:scale-110 active:scale-95 cursor-pointer backdrop-blur opacity-90 group-hover:opacity-100"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
