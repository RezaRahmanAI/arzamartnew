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

import Link from "next/link";
import { useRef, useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Client island: New Arrivals 1-row Auto-sliding Carousel with Header Controls
 */
export function HomePageArrivals({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Helper function to calculate exact 1 item scroll width including gap
  const getSingleItemStep = useCallback(() => {
    if (!scrollRef.current) return 240;
    const firstChild = scrollRef.current.firstElementChild as HTMLElement;
    if (firstChild) {
      // item width + 16px gap
      return firstChild.offsetWidth + 16;
    }
    return 240;
  }, []);

  // Auto-slide: 1 product at a time moves to left every 3 seconds
  useEffect(() => {
    if (isHovered || products.length === 0) return;

    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const step = getSingleItemStep();

      if (scrollLeft >= maxScroll - 10) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollRef.current.scrollBy({ left: step, behavior: "smooth" });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isHovered, products.length, getSingleItemStep]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const step = getSingleItemStep();
    scrollRef.current.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  if (products.length === 0) return null;

  return (
    <section className="mt-14">
      {/* Section Header with Title, View all, and Left/Right Navigation Buttons */}
      <div className="flex items-center justify-between">
        <h2 className="section-title border-l-4 border-primary">New Arrivals</h2>
        
        <div className="flex items-center gap-3">
          <Link
            href="/new-arrivals"
            className="text-sm font-semibold text-primary hover:underline whitespace-nowrap"
          >
            View all
          </Link>
          
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Previous product"
              className="size-8 rounded-full border border-border bg-card shadow-xs text-foreground flex items-center justify-center transition-all hover:bg-secondary hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Next product"
              className="size-8 rounded-full border border-border bg-card shadow-xs text-foreground flex items-center justify-center transition-all hover:bg-secondary hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Carousel Container (1 row, 1 product per scroll step) */}
      <div
        className="relative mt-5"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-3 pt-1 px-1 no-scrollbar select-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((p) => (
            <div
              key={p.slug}
              className="w-[calc((100%-16px)/2)] sm:w-[calc((100%-32px)/3)] lg:w-[calc((100%-48px)/4)] shrink-0"
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
