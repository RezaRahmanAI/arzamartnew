import Image from "next/image";
import Link from "next/link";
import { formatBDT, type Product, getSizePrice } from "@/lib/shop-data";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { getImageUrl, FALLBACK_IMAGE } from "@/lib/utils";

import { toast } from "sonner";
import { ShoppingBag, Minus, Plus, Heart } from "lucide-react";
import { useState, useEffect } from "react";
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
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [size, setSize] = useState(product.sizes?.[0] || "M");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isWishlisted = mounted ? isInWishlist(product.slug) : false;

  const unitPrice = getSizePrice(product, size);
  const mrpVal = product.mrp || product.compareAt || 0;

  // Calculate default display price (e.g. from the first/smallest size)
  const defaultSizePrice =
    product.sizes && product.sizes.length > 0
      ? getSizePrice(product, product.sizes[0])
      : product.sizePrices && Object.keys(product.sizePrices).length > 0
      ? product.sizePrices[Object.keys(product.sizePrices)[0]]
      : product.price;

  // Savings calculation on product card: compare MRP with size price
  const cardSavings = mrpVal > defaultSizePrice ? mrpVal - defaultSizePrice : 0;

  // Savings calculation inside select options modal for the selected size
  const modalSavings = mrpVal > unitPrice ? mrpVal - unitPrice : 0;

  const getPriceDisplay = () => {
    return formatBDT(defaultSizePrice);
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
      qty,
    });

    toast.success(`${product.name} added to cart`, {
      description: `Size ${size} · Qty ${qty}`,
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
          <Image
            src={getImageUrl(product.image, "medium")}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            quality={75}
            loading="lazy"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {product.badge && (
            <span className="absolute left-3 top-3 rounded-full gradient-sale px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
              {product.badge}
            </span>
          )}
          {cardSavings > 0 && (
            <span className="absolute right-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-bold text-destructive-foreground shadow-sm">
              ৳{cardSavings} সাশ্রয়
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
              {mrpVal > defaultSizePrice && (
                <span className="text-xs text-muted-foreground line-through">
                  {formatBDT(mrpVal)}
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
              Choose your size for {product.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-secondary border border-border">
              <Image src={getImageUrl(product.image, "thumb")} alt={product.name} fill sizes="80px" quality={60} loading="lazy" className="object-cover" />
            </div>
            <div className="flex flex-col justify-center">
              <h4 className="text-sm font-semibold text-foreground leading-snug">{product.name}</h4>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-bold text-price">{formatBDT(unitPrice)}</span>
                {mrpVal > unitPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatBDT(mrpVal)}
                  </span>
                )}
                {modalSavings > 0 && (
                  <span className="text-[11px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                    ৳{modalSavings} সাশ্রয়
                  </span>
                )}
              </div>
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
                  const st = product.sizeStock?.[s] ?? 15;
                  const isOutOfStock = st === 0 && !product.acceptPreOrder;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`min-w-10 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        s === size
                          ? "border-primary bg-primary text-primary-foreground"
                          : isOutOfStock
                          ? "border-dashed border-destructive/40 bg-secondary/20 text-muted-foreground opacity-60 line-through"
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
            {(() => {
              const selectedStock = product.sizeStock?.[size] ?? 15;
              const isBlocked = selectedStock < qty && !product.acceptPreOrder;
              return isBlocked ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 rounded-xl bg-muted py-2.5 text-xs font-bold text-muted-foreground cursor-not-allowed border border-border"
                >
                  Out of Stock
                </button>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Add to cart
                </button>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}