"use client";

import Link from "next/link";
import { useParams, useRouter, notFound } from "next/navigation";
import {
  Check,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import {
  comboOffers,
  formatBDT,
  getComboOffer,
  getProduct,
} from "@/lib/shop-data";


export default function OfferPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const offer = getComboOffer(slug);

  if (!offer) {
    notFound();
  }

  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const items = offer.items
    .map((s) => getProduct(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const savingsPct = Math.round(
    ((offer.compareAt - offer.price) / offer.compareAt) * 100
  );

  const addToCart = () => {
    items.forEach((p) => add({ slug: p.slug, size: p.sizes[0]!, color: p.colors[0]!, qty }));
    toast.success(`${offer.title} added to cart`, {
      description: `${items.length} items × ${qty}`,
    });
  };

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/offer/${offer.slug}`
      : `/offer/${offer.slug}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!", { description: "Paste it on Facebook or WhatsApp." });
    } catch {
      toast.error("Couldn't copy automatically — copy the link from the address bar.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">Offer</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-secondary shadow-card">
          <img
            src={offer.image}
            alt={offer.title}
            width={800}
            height={800}
            className="aspect-square size-full object-cover"
          />
          <span className="absolute left-4 top-4 rounded-full gradient-sale px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
            Combo offer
          </span>
        </div>

        <div>
          <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-success">
            Bundle &amp; save {savingsPct}%
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-foreground">
            {offer.title}
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">{offer.subtitle}</p>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-price">{formatBDT(offer.price)}</span>
            <span className="text-base text-muted-foreground line-through">
              {formatBDT(offer.compareAt)}
            </span>
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
              Save {formatBDT(offer.compareAt - offer.price)}
            </span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {offer.description}
          </p>

          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
              What's inside
            </p>
            <ul className="mt-3 space-y-3">
              {items.map((p) => (
                <li
                  key={p.slug}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    className="size-14 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.colors[0]} · Size {p.sizes[0]}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {formatBDT(p.price)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="mt-5 space-y-2 text-sm text-foreground">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-success" /> All items quality-checked before dispatch
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-success" /> Cash on delivery nationwide
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-success" /> 7-day easy exchange
            </li>
          </ul>

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
              Add bundle to cart
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
            Copy offer link
          </button>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="size-4 text-primary" /> Free delivery on orders over 2,000 TK
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="size-4 text-primary" /> Bundle price applies automatically
            </p>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="section-title border-l-4 border-primary">More bundles</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {comboOffers
            .filter((c) => c.slug !== offer.slug)
            .map((c) => (
              <Link
                key={c.slug}
                href={`/offer/${c.slug}`}
                className="group overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-float"
              >
                <div className="relative aspect-square overflow-hidden bg-secondary">
                  <img
                    src={c.image}
                    alt={c.title}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-full gradient-sale px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                    Combo
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-sm font-bold text-foreground">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.subtitle}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-sm font-bold text-price">{formatBDT(c.price)}</span>
                    <span className="text-xs text-muted-foreground line-through">
                      {formatBDT(c.compareAt)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
