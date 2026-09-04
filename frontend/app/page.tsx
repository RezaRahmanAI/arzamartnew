import Image from "next/image";
import Link from "next/link";
import { BadgePercent, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { fetchHomePageData } from "@/lib/api/server/fetch-home-data";
import { getImageUrl } from "@/lib/utils";
import { HomePageDeals, HomePageArrivals, HomePageHero } from "@/components/home-page-client-islands";

// Dynamic: Always render with real fresh database data on every request
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const data = await fetchHomePageData();

  const { settings, offerBanner, categories, products, banners } = data;
  const { brandName, enableFreeShipping, enableCOD } = settings;

  const perks = [
    ...(enableFreeShipping
      ? [{ icon: "Truck" as const, title: "Free delivery on bundles", text: `Buy multiple items and unlock free delivery via our quantity offers` }]
      : [{ icon: "Truck" as const, title: "Fast delivery", text: "Nationwide shipping available" }]),
    { icon: "RotateCcw" as const, title: "7-day exchange", text: "Wrong size? No problem" },
    ...(enableCOD
      ? [{ icon: "ShieldCheck" as const, title: "Cash on delivery", text: "Pay when it arrives" }]
      : []),
    { icon: "BadgePercent" as const, title: "Bundle deals", text: "Save up to 20%" },
  ];

  const ICON_MAP = { Truck, RotateCcw, ShieldCheck, BadgePercent };

  // Active products & All products
  const activeProducts = products.filter((p) => p.isActive !== false && !p.isBundle);
  const allProducts = products
    .filter((p) => p.isActive !== false)
    .sort((a, b) => (b.isBundle ? 1 : 0) - (a.isBundle ? 1 : 0));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="sr-only">{brandName} — everyday fashion store in Bangladesh</h1>

      {/* Hero Section */}
      <section className="grid gap-5 lg:grid-cols-[1.9fr_1fr] items-stretch">
        <HomePageHero banners={banners} />
        <Link
          href={offerBanner.href}
          className="group relative overflow-hidden rounded-2xl shadow-card h-full min-h-[340px] sm:min-h-[420px] block bg-secondary"
        >
          <Image
            src={offerBanner.image}
            alt={offerBanner.title}
            fill
            sizes="(max-width: 768px) 100vw, 35vw"
            quality={80}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              {offerBanner.eyebrow}
            </p>
            <p className="font-display text-2xl font-extrabold text-white sm:text-3xl">
              {offerBanner.title}
            </p>
            <p className="mt-1 text-sm font-semibold text-white/80">
              {offerBanner.subtitle}
            </p>
          </div>
        </Link>
      </section>

      {/* Trust Perks — Fully server-rendered */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {perks.map((perk) => {
          const Icon = ICON_MAP[perk.icon];
          return (
            <div
              key={perk.title}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <Icon className="size-6 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-bold text-foreground">{perk.title}</p>
                <p className="text-xs text-muted-foreground">{perk.text}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* Categories — Fully server-rendered */}
      <section className="mt-12">
        <h2 className="section-title border-l-4 border-primary">Our Categories</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.filter((c) => !c.parentCategoryId && !c.parentSlug).map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="group overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-float"
            >
              <div className="relative aspect-square overflow-hidden bg-secondary">
                <Image
                  src={getImageUrl(c.image)}
                  alt={c.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  quality={75}
                  loading="lazy"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
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

      {/* New Arrivals with 1-row Auto-sliding & Header Controls */}
      <HomePageArrivals products={activeProducts} />

      {/* All Products */}
      <section className="mt-14">
        <div className="flex items-end justify-between">
          <h2 className="section-title border-l-4 border-primary">All Products</h2>
          <Link href="/search" className="text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        <HomePageDeals products={allProducts} />
      </section>
    </div>
  );
}
