"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getImageUrl, FALLBACK_IMAGE } from "@/lib/utils";

import { useEffect, useState } from "react";
import { useBanners } from "@/lib/banners-store";
import type { HeroSlide } from "@/lib/api/services/banners.service";

interface HeroSliderProps {
  /** Pre-fetched slides from server (ISR) for instant render. Falls back to context data. */
  initialSlides?: HeroSlide[];
}

export function HeroSlider({ initialSlides }: HeroSliderProps) {
  const { slides: contextSlides } = useBanners();

  // Prioritize server-rendered initialSlides for perfect SSR hydration and fresh database data
  const rawSlides = initialSlides && initialSlides.length > 0 ? initialSlides : contextSlides;
  const slides = rawSlides.filter(
    (s) => s.isActive !== false && s.position !== "offer" && s.href !== "/offers"
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length === 0) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-secondary shadow-card h-full min-h-[340px] sm:min-h-[420px] animate-pulse">
        <div className="size-full bg-secondary/80" />
      </div>
    );
  }

  const go = (dir: number) =>
    setIndex((i) => (i + dir + slides.length) % slides.length);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-secondary shadow-card h-full min-h-[340px] sm:min-h-[420px]">
      <div className="relative size-full aspect-[16/10] sm:aspect-[16/9]">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? "opacity-100 z-10" : "pointer-events-none opacity-0 z-0"
            }`}
          >
            <Image
              src={getImageUrl(slide.image, "large")}
              alt={slide.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 65vw, 60vw"
              quality={80}
              priority={i === 0}
              loading={i === 0 ? "eager" : "lazy"}
              className="object-cover"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center gap-3 p-6 sm:p-12">
              <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                {slide.eyebrow}
              </span>
              <h2 className="max-w-md font-display text-3xl font-extrabold text-white sm:text-5xl">
                {slide.title}
              </h2>
              <p className="max-w-sm text-sm text-white/80 sm:text-base">
                {slide.subtitle}
              </p>
              <Link
                href={slide.href}
                className="mt-2 w-fit rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-105"
              >
                Shop Now
              </Link>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-card/80 text-foreground backdrop-blur transition-colors hover:bg-card cursor-pointer"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-card/80 text-foreground backdrop-blur transition-colors hover:bg-card cursor-pointer"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to ${s.title}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === index ? "w-7 bg-primary" : "w-3 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}