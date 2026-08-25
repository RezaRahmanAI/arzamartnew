"use client";

import Link from "next/link";
import { useParams, useRouter, notFound } from "next/navigation";
import {
  Check,
  Minus,
  Plus,
  RotateCcw,
  Share2,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProductCard } from "@/components/product-card";
import { useCart } from "@/lib/cart";
import { formatBDT, getProduct, getSizePrice, products } from "@/lib/shop-data";


export default function PromotionPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const product = getProduct(slug);

  if (!product) {
    notFound();
  }

  const { add } = useCart();
  const [size, setSize] = useState(product.sizes[0]!);
  const [qty, setQty] = useState(1);
  const unitPrice = getSizePrice(product, size);

  const related = products
    .filter((p) => p.category === product.category && p.slug !== product.slug)
    .slice(0, 4);

  const addToCart = () => {
    add({ slug: product.slug, size, qty });
    toast.success(`${product.name} added to cart`, { description: `Size ${size}` });
  };

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/promotion/${product.slug}`
      : `/promotion/${product.slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!", { description: "Paste it on Facebook or WhatsApp." });
    } catch {
      toast.error("Couldn't copy automatically — copy the link from the address bar.");
    }
  };

  const savingsPct = product.compareAt
    ? Math.round(((product.compareAt - product.price) / product.compareAt) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">Promotion</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-secondary shadow-card">
          <img
            src={product.image}
            alt={product.name}
            width={800}
            height={800}
            className="aspect-square size-full object-cover"
          />
        </div>

        <div>
          {product.badge && (
            <span className="rounded-full gradient-sale px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
              {product.badge}
            </span>
          )}
          <h1 className="mt-3 font-display text-3xl font-extrabold text-foreground">
            {product.name}
          </h1>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-price">{formatBDT(unitPrice)}</span>
            {product.compareAt && (
              <span className="text-base text-muted-foreground line-through">
                {formatBDT(product.compareAt)}
              </span>
            )}
            {savingsPct > 0 && (
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
                Save {savingsPct}%
              </span>
            )}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <ul className="mt-5 space-y-2 text-sm text-foreground">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-success" /> 100% quality-checked before dispatch
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-success" /> Cash on delivery nationwide
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-success" /> 7-day easy exchange
            </li>
          </ul>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">Size</p>
              <p className="text-xs text-muted-foreground">
                Price for {size}:{" "}
                <span className="font-bold text-price">{formatBDT(unitPrice)}</span>
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.sizes.map((s) => {
                const sp = getSizePrice(product, s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`min-w-11 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                      s === size
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-primary"
                    }`}
                  >
                    {s}
                    {product.sizePrices && product.sizePrices[s] !== undefined && (
                      <span className="ml-1 text-[10px] opacity-70">৳{sp}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-border bg-card">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid size-11 place-items-center text-foreground hover:text-primary cursor-pointer"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center text-sm font-bold">{qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => q + 1)}
                className="grid size-11 place-items-center text-foreground hover:text-primary cursor-pointer"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={addToCart}
              className="flex h-11 items-center gap-2 rounded-lg border border-primary px-5 text-sm font-bold text-primary transition-colors hover:bg-secondary cursor-pointer"
            >
              <ShoppingBag className="size-4" />
              Add to cart
            </button>
            <button
              type="button"
              onClick={() => {
                addToCart();
                router.push("/checkout");
              }}
              className="h-11 rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground transition-transform hover:scale-105 cursor-pointer"
            >
              Order now
            </button>
          </div>

          <button
            type="button"
            onClick={copyLink}
            className="mt-4 flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary cursor-pointer"
          >
            <Share2 className="size-4" />
            Copy promotion link
          </button>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="size-4 text-primary" /> Delivery in 1–3 days inside Dhaka
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <RotateCcw className="size-4 text-primary" /> 7-day size exchange
            </p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="section-title border-l-4 border-primary">You may also like</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
