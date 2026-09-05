"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, Search, ShoppingCart, Tag, User, X, Heart, ShieldCheck } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { products as initialProducts } from "@/lib/shop-data";
import { useCart } from "@/lib/cart";
import { useProducts } from "@/lib/products-store";
import { useCategories } from "@/lib/categories-store";
import { useSettings } from "@/context/settings-context";
import { useWishlist } from "@/lib/wishlist";
import { useAuth } from "@/context/auth-context";
import { getImageUrl } from "@/lib/utils";


export function SiteHeader() {
  const pathname = usePathname();
  const { count } = useCart();
  const { wishlistSlugs } = useWishlist();
  const { user } = useAuth();
  const { products } = useProducts();
  const { categories } = useCategories();
  const { settings } = useSettings();
  const brandName = settings?.general?.websiteName || "ARZA";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrolledSearchRef = useRef<HTMLFormElement>(null);
  const bottomSearchRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const source = products && products.length > 0 ? products : initialProducts;

    // Filter products matching query across name, category, subcategory, SKU, or description
    return source
      .filter((p) => {
        if (p.isActive === false) return false;
        const nameMatch = p.name?.toLowerCase().includes(trimmed);
        const catMatch = p.category?.toLowerCase().includes(trimmed);
        const subCatMatch = p.subcategory?.toLowerCase().includes(trimmed);
        const descMatch = p.description?.toLowerCase().includes(trimmed);
        const skuMatch = p.sku?.toLowerCase().includes(trimmed);
        return Boolean(nameMatch || catMatch || subCatMatch || descMatch || skuMatch);
      })
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStart = aName.startsWith(trimmed);
        const bStart = bName.startsWith(trimmed);
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;
        return aName.localeCompare(bName);
      });
  }, [query, products, initialProducts]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedScrolled = scrolledSearchRef.current?.contains(target);
      const clickedBottom = bottomSearchRef.current?.contains(target);
      if (!clickedScrolled && !clickedBottom) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderSuggestions = () => {
    if (!showSuggestions || !query.trim() || filteredProducts.length === 0) return null;
    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
        {filteredProducts.slice(0, 6).map((p) => (
          <Link
            key={p.slug}
            href={`/product/${p.slug}`}
            onClick={() => {
              setQuery("");
              setShowSuggestions(false);
            }}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary"
          >
            <img
              src={getImageUrl(p.image)}
              alt={p.name}
              width={36}
              height={36}
              loading="lazy"
              className="size-9 rounded object-cover shrink-0 bg-muted/20"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }}
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="font-semibold text-foreground truncate text-xs">{p.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-primary text-xs">৳{p.price}</span>
                {p.compareAt && (
                  <span className="text-[10px] text-muted-foreground line-through">
                    ৳{p.compareAt}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let accumulatedDistance = 0;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const diff = currentScrollY - lastScrollY;

          // If we are close to the top, always show the bottom bar
          if (currentScrollY <= 80) {
            setScrolled(false);
            accumulatedDistance = 0;
          } else {
            const isMovingDown = diff > 0;
            const wasMovingDown = accumulatedDistance > 0;

            if (isMovingDown === wasMovingDown) {
              accumulatedDistance += diff;
            } else {
              // Direction changed, reset accumulator
              accumulatedDistance = diff;
            }

            // Must scroll down 100px to hide, scroll up 100px to show
            if (accumulatedDistance > 100) {
              setScrolled(true);
            } else if (accumulatedDistance < -100) {
              setScrolled(false);
            }
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (pathname.startsWith("/admin") || pathname.startsWith("/clp")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 relative">
        <Link href="/" className="shrink-0 flex items-center gap-2">
          {settings?.branding?.headerLogo || settings?.branding?.lightLogo ? (
            <img
              src={getImageUrl(settings.branding.headerLogo || settings.branding.lightLogo)}
              alt={brandName}
              className="h-9 w-auto max-w-[150px] object-contain"
              onError={(e) => {
                // If logo image fails, hide image and show text
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "inline";
              }}
            />
          ) : null}
          <span
            className="font-display text-2xl font-extrabold tracking-tight text-foreground"
            style={{
              display: settings?.branding?.headerLogo || settings?.branding?.lightLogo ? "none" : "inline",
            }}
          >
            {brandName.toUpperCase()}
            <span className="ml-0.5 text-primary">.</span>
          </span>
        </Link>

        <nav className="hidden items-center justify-center gap-6 text-sm font-medium md:flex flex-1 max-w-fit mx-auto">
          {(() => {
            const customNav = settings?.navigation?.headerMenu?.filter((item) => item.active);
            if (customNav && customNav.length > 0) {
              return customNav.map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  target={item.target || "_self"}
                  className="text-muted-foreground transition-colors hover:text-primary font-semibold"
                >
                  {item.label}
                </Link>
              ));
            }
            return categories.filter((c) => !c.parentCategoryId && !c.parentSlug).slice(0, 4).map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="text-muted-foreground transition-colors hover:text-primary font-semibold"
              >
                {c.name}
              </Link>
            ));
          })()}
        </nav>

        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/offers"
            className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-secondary sm:flex animate-in fade-in duration-300"
          >
            <Tag className="size-4" />
            Offer
          </Link>

          {scrolled && (
            <form
              ref={scrolledSearchRef}
              onSubmit={(e) => {
                e.preventDefault();
                if (query.trim()) {
                  router.push(`/search?q=${encodeURIComponent(query)}`);
                  setShowSuggestions(false);
                }
              }}
              className="hidden md:flex items-center relative w-48 mx-2 animate-in fade-in slide-in-from-right-4 duration-300"
            >
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search..."
                className="h-8.5 w-full rounded-lg border border-border bg-card pl-3 pr-8 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute right-1 top-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:text-primary"
              >
                <Search className="size-3.5" />
              </button>
              {renderSuggestions()}
            </form>
          )}
          <Link
            href="/search"
            aria-label="Search"
            className="rounded-md p-2 text-foreground transition-colors hover:bg-secondary md:hidden"
          >
            <Search className="size-5" />
          </Link>

          <Link
            href="/checkout"
            aria-label="Cart & Checkout"
            className="relative rounded-md p-2 text-foreground transition-colors hover:bg-secondary hidden sm:inline-flex"
            title="Cart & Checkout"
          >
            <ShoppingCart className="size-5" />
            {mounted && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>

          <Link
            href="/account?tab=wishlist"
            aria-label="Wishlist"
            className="relative rounded-md p-2 text-foreground transition-colors hover:bg-secondary"
            title="Wishlist"
          >
            <Heart className="size-5" />
            {mounted && wishlistSlugs.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white">
                {wishlistSlugs.length}
              </span>
            )}
          </Link>
          {mounted && user ? (
            user.role === "admin" || user.role === "staff" ? (
              <Link
                href="/admin"
                aria-label="Admin Portal"
                className="rounded-md p-1.5 text-foreground transition-colors hover:bg-secondary flex items-center gap-1.5"
                title={`Admin Portal (${user.name} - ${user.staffRole || "Staff"})`}
              >
                <div className="flex items-center gap-1.5">
                  <div className="size-7 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                    <ShieldCheck className="size-3.5" />
                  </div>
                  <span className="hidden md:inline text-xs font-bold text-amber-600 dark:text-amber-400 truncate max-w-[80px]">
                    Admin
                  </span>
                </div>
              </Link>
            ) : (
              <Link
                href="/account"
                aria-label="Customer Account"
                className="rounded-md p-1.5 text-foreground transition-colors hover:bg-secondary flex items-center gap-1.5"
                title={`Account (${user.name})`}
              >
                <div className="flex items-center gap-1.5">
                  <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                    {user.name[0]?.toUpperCase()}
                  </div>
                  <span className="hidden md:inline text-xs font-bold truncate max-w-[80px]">{user.name.split(" ")[0]}</span>
                </div>
              </Link>
            )
          ) : (
            <Link
              href="/login"
              aria-label="Login"
              className="rounded-md p-1.5 text-foreground transition-colors hover:bg-secondary flex items-center gap-1.5"
              title="Login / Register"
            >
              <User className="size-5" />
            </Link>
          )}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-2 text-foreground transition-colors hover:bg-secondary md:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div className={`hidden sm:block border-t border-border bg-secondary/60 transition-all duration-300 ease-in-out ${
        scrolled ? "max-h-0 opacity-0 border-t-transparent overflow-hidden" : "max-h-[72px] opacity-100 overflow-visible"
      }`}>
        <form
          className={`mx-auto flex max-w-7xl items-center gap-3 px-4 transition-all duration-300 ${
            scrolled ? "py-0" : "py-3"
          }`}
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) {
              router.push(`/search?q=${encodeURIComponent(query)}`);
            }
          }}
        >
          <label className="hidden w-56 shrink-0 sm:block">
            <span className="sr-only">Category</span>
            <select
              className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
              onChange={(e) => {
                if (e.target.value) {
                  router.push(`/category/${e.target.value}`);
                }
              }}
              defaultValue=""
            >
              <option value="">All Categories</option>
              {categories.filter((c) => !c.parentCategoryId && !c.parentSlug).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div ref={bottomSearchRef} className="relative flex-1">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search for products (e.g. Linen Shirt)..."
              className="h-11 w-full rounded-lg border border-border bg-card pl-4 pr-11 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-1 top-1 grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:text-primary"
            >
              <Search className="size-4" />
            </button>
            {renderSuggestions()}
          </div>
        </form>
      </div>

      {open && (
        <nav className="border-t border-border bg-card px-4 py-3 md:hidden">
          {(() => {
            const customNav = settings?.navigation?.headerMenu?.filter((item) => item.active);
            if (customNav && customNav.length > 0) {
              return customNav.map((item) => (
                <Link
                  key={item.id}
                  href={item.url}
                  target={item.target || "_self"}
                  onClick={() => setOpen(false)}
                  className="block py-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  {item.label}
                </Link>
              ));
            }
            return (
              <>
                {categories.filter((c) => !c.parentCategoryId && !c.parentSlug).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    onClick={() => setOpen(false)}
                    className="block py-2 text-sm font-medium text-foreground"
                  >
                    {c.name}
                  </Link>
                ))}
                <Link
                  href="/offers"
                  onClick={() => setOpen(false)}
                  className="block py-2 text-sm font-semibold text-primary"
                >
                  Offers
                </Link>
              </>
            );
          })()}
        </nav>
      )}
    </header>
  );
}