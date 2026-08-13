"use client";

import Link from "next/link";
import { BadgePercent, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { HeroSlider } from "@/components/hero-slider";
import { ProductCard } from "@/components/product-card";
import { useProducts } from "@/lib/products-store";
import { useCategories } from "@/lib/categories-store";
import { useBanners } from "@/lib/banners-store";
import { offerBanner as fallbackOfferBanner } from "@/lib/shop-data";
import { useSettings } from "@/context/settings-context";
import { getImageUrl, FALLBACK_IMAGE } from "@/components/image-uploader";
import { OptImage } from "@/components/opt-image";

export default function HomePage() {
  const { products } = useProducts();
  const { categories } = useCategories();
  const { slides } = useBanners();
  const { settings } = useSettings();

  const offerSlide = slides.find((s) => s.position === "offer" || s.href === "/offers");
  const offerBannerData = offerSlide
    ? {
        image: offerSlide.image,
        title: offerSlide.title,
        subtitle: offerSlide.subtitle,
        href: offerSlide.href || "/offers",
        eyebrow: offerSlide.eyebrow || "Limited time",
      }
    : {
        image: fallbackOfferBanner.image,
        title: fallbackOfferBanner.title,
        subtitle: fallbackOfferBanner.subtitle,
        href: "/offers",
        eyebrow: "Limited time",
      };

  const dealProducts = products.filter((p) => (p.compareAt && p.compareAt > p.price) || p.isBundle);

  const brandName = settings?.general?.websiteName || "Arza";
  const currencySymbol = settings?.general?.currencySymbol || "৳";
  const freeShippingThreshold = settings?.shipping?.freeShippingThreshold ?? 5000;
  const enableFreeShipping = settings?.shipping?.enableFreeShipping ?? true;
  const enableCOD = settings?.shipping?.cashOnDeliveryAvailable ?? true;

  const perks = [
    ...(enableFreeShipping
      ? [{ icon: Truck, title: "Free delivery", text: `On orders over ${freeShippingThreshold.toLocaleString()} ${currencySymbol}` }]
      : [{ icon: Truck, title: "Fast delivery", text: "Nationwide shipping available" }]),
    { icon: RotateCcw, title: "7-day exchange", text: "Wrong size? No problem" },
    ...(enableCOD
      ? [{ icon: ShieldCheck, title: "Cash on delivery", text: "Pay when it arrives" }]
      : []),
    { icon: BadgePercent, title: "Bundle deals", text: "Save up to 20%" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="sr-only">{brandName} — everyday fashion store in Bangladesh</h1>

      <section className="grid gap-5 lg:grid-cols-[1.9fr_1fr] items-stretch">
        <HeroSlider />
        <Link
          href={offerBannerData.href}
          className="group relative overflow-hidden rounded-2xl shadow-card h-full min-h-[340px] sm:min-h-[420px] block bg-secondary"
        >
          <OptImage
            src={offerBannerData.image}
            alt={offerBannerData.title}
            width={800}
            height={1000}
            priority
            sizes="(max-width: 1024px) 100vw, 33vw"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {offerBannerData.eyebrow}
            </p>
            <p className="font-display text-2xl font-extrabold text-white sm:text-3xl">
              {offerBannerData.title}
            </p>
            <p className="mt-1 text-sm font-semibold text-white/80">
              {offerBannerData.subtitle}
            </p>
          </div>
        </Link>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {perks.map((perk) => (
          <div
            key={perk.title}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <perk.icon className="size-6 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">{perk.title}</p>
              <p className="text-xs text-muted-foreground">{perk.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="section-title border-l-4 border-primary">Our Categories</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="group overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-float"
            >
              <div className="aspect-square overflow-hidden bg-secondary">
                <OptImage
                  src={getImageUrl(c.image)}
                  alt={c.name}
                  width={800}
                  height={800}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3 text-center">
                <p className="text-sm font-bold text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-end justify-between">
          <h2 className="section-title border-l-4 border-primary">Deals of the Week</h2>
          <Link href="/offers" className="text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {dealProducts.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="section-title border-l-4 border-primary">New Arrivals</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.filter((p) => p.isActive !== false).map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
