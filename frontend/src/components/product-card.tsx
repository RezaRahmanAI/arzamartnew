"use client";

import Link from "next/link";
import { formatBDT, type Product, getSizePrice, getColorHex } from "@/lib/shop-data";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { getImageUrl, FALLBACK_IMAGE } from "@/lib/utils";

import { toast } from "sonner";
import { ShoppingBag, Minus, Plus, Heart } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.slug);
  const [isOpen, setIsOpen] = useState(false);
  const [size, setSize] = useState(product.sizes?.[0] || "M");
  const [color, setColor] = useState(product.colors?.[0] || "Default");
  const [qty, setQty] = useState(1);

  const unitPrice = getSizePrice(product, size);

  const discountAmt = (product.mrp || product.compareAt || 0) - product.price;

  const getPriceDisplay = () => {
    if (product.sizes && product.sizes.length > 0) {
      const smallestSize = product.sizes[0];
      const smallestSizePrice = getSizePrice(product, smallestSize);
      return formatBDT(smallestSizePrice);
    }
    if (product.sizePrices && Object.keys(product.sizePrices).length > 0) {
      const firstKey = Object.keys(product.sizePrices)[0];
      return formatBDT(product.sizePrices[firstKey]);
    }
    return formatBDT(product.price);
  };

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    add({
      slug: product.slug,
      size,
      color,
      qty,
    });

    toast.success(`${product.name} added to cart`, {
      description: `${color} · Size ${size} · Qty ${qty}`,
    });
    setIsOpen(false);
  };

  return (
    <>
      <Link
        href={`/product/${product.slug}`}
        className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-float"
      >
        <div className="relative aspect-square overflow-hidden bg-secondary">
          <img
            src={getImageUrl(product.image)}
            alt={product.name}
            width={800}
            height={800}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }}
          />
          {product.badge && (
            <span className="absolute left-3 top-3 rounded-full gradient-sale px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
              {product.badge}
            </span>
          )}
          {discountAmt > 0 && (
            <span className="absolute right-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold text-destructive-foreground shadow-sm">
              ৳{discountAmt} ছাড়
            </span>
          )}

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product);
            }}
            className="absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground border border-border/80 backdrop-blur-md shadow-sm hover:bg-background transition-all hover:scale-110 active:scale-95 cursor-pointer z-10"
            title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-label="Wishlist"
          >
            <Heart
              className={`size-4 transition-colors ${
                isWishlisted
                  ? "fill-rose-500 text-rose-500"
                  : "text-muted-foreground hover:text-rose-500"
              }`}
            />
          </button>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-sm font-semibold leading-snug text-foreground">{product.name}</h3>
          <div className="mt-auto pt-3">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-base font-bold text-price">{getPriceDisplay()}</span>
              {(product.mrp || product.compareAt) && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatBDT(product.mrp || product.compareAt || 0)}
                </span>
              )}
            </div>
            <button
              onClick={handleOpenDialog}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <ShoppingBag className="size-3.5" />
              Add to cart
            </button>
          </div>
        </div>
      </Link>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-left font-display text-lg font-bold">
              Select Options
            </DialogTitle>
            <DialogDescription className="text-left">
              Choose your size and color for {product.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex gap-4">
            <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-secondary border border-border">
              <img src={getImageUrl(product.image)} alt={product.name} width={80} height={80} loading="lazy" className="size-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }} />
            </div>
            <div className="flex flex-col justify-center">
              <h4 className="text-sm font-semibold text-foreground leading-snug">{product.name}</h4>
              <p className="mt-1 text-lg font-bold text-price">{formatBDT(unitPrice)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {/* Size Selector */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Size</span>
                <span className="text-xs text-muted-foreground">
                  Price: <span className="font-bold text-price">{formatBDT(unitPrice)}</span>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.sizes.map((s) => {
                  const sp = getSizePrice(product, s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`min-w-10 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        s === size
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary"
                      }`}
                    >
                      {s}
                      {product.sizePrices && product.sizePrices[s] !== undefined && (
                        <span className="ml-1 text-[9px] opacity-70">
                          ৳{sp}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Selector */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Colour: <span className="font-semibold text-primary">{color}</span>
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    title={c}
                    className={`group relative flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      c === color
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary ring-offset-1 shadow-sm"
                        : "border-border bg-card text-foreground hover:border-primary/50"
                    }`}
                  >
                    <span
                      className="size-4 rounded-full border border-black/10 shadow-sm inline-block"
                      style={{ backgroundColor: getColorHex(c) }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selector */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantity</span>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex items-center rounded-lg border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-foreground">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAddToCart}
              className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Add to cart
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}