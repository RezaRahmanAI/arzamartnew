import Image from "next/image";
import Link from "next/link";
import { formatBDT, type Product, getSizePrice } from "@/lib/shop-data";
import { useWishlist } from "@/lib/wishlist";
import { getImageUrl } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useState, useEffect } from "react";

export function ProductCard({ product }: { product: Product }) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isWishlisted = mounted ? isInWishlist(product.slug) : false;

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

  const getPriceDisplay = () => {
    return formatBDT(defaultSizePrice);
  };

  return (
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
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-price">{getPriceDisplay()}</span>
            {mrpVal > defaultSizePrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatBDT(mrpVal)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}