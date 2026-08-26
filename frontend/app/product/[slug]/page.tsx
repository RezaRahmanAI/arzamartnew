"use client";

import Link from "next/link";
import { useParams, useRouter, notFound } from "next/navigation";
import { Minus, Plus, RotateCcw, ShoppingBag, Truck, Star, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ProductCard } from "@/components/product-card";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useReviews } from "@/lib/reviews";
import { useProducts } from "@/lib/products-store";
import { formatBDT, getSizePrice, getSizeStock, products as staticProducts } from "@/lib/shop-data";
import { getImageUrl, handleImageError, FALLBACK_IMAGE } from "@/lib/utils";



export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { getProduct, products } = useProducts();
  const product = getProduct(slug);

  if (!product) {
    notFound();
  }

  const { add } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.slug);
  const { reviews, addReview } = useReviews();
  const [size, setSize] = useState(product.sizes[0]!);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<"description" | "video" | "return">("description");
  const [activeImage, setActiveImage] = useState(product.image);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setActiveImage(product.image);
  }, [product.image]);

  // Fallback to static mock images if localStorage doesn't have them yet for this product
  const staticProduct = staticProducts.find((p) => p.slug === product.slug);
  const galleryImages = product.images || staticProduct?.images || [];
  const allImages = Array.from(new Set([product.image, ...galleryImages]));

  useEffect(() => {
    if (allImages.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setActiveImage((current) => {
        const currentIndex = allImages.indexOf(current);
        const nextIndex = (currentIndex + 1) % allImages.length;
        return allImages[nextIndex]!;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [allImages, isPaused, activeImage]);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImage((current) => {
      const currentIndex = allImages.indexOf(current);
      const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
      return allImages[prevIndex]!;
    });
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImage((current) => {
      const currentIndex = allImages.indexOf(current);
      const nextIndex = (currentIndex + 1) % allImages.length;
      return allImages[nextIndex]!;
    });
  };

  const unitPrice = getSizePrice(product, size);
  const mrpVal = product.mrp || product.compareAt || 0;
  const currentDiscount = mrpVal > unitPrice ? mrpVal - unitPrice : 0;

  // Review Form state
  const [revName, setRevName] = useState("");
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState("");

  const productReviews = reviews.filter((r) => r.productSlug === product.slug);
  const avgRating = productReviews.length
    ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
    : null;

  const sameCategory = products
    .filter((p) => p.category === product.category && p.slug !== product.slug);
  const otherProducts = products
    .filter((p) => p.category !== product.category && p.slug !== product.slug);
  const related = [...sameCategory, ...otherProducts].slice(0, 8);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!revComment.trim()) {
      toast.error("Please enter a review comment");
      return;
    }

    addReview({
      id: `rev-${Date.now()}`,
      productSlug: product.slug,
      productName: product.name,
      customerName: revName.trim(),
      rating: revRating,
      comment: revComment.trim(),
      date: new Date().toISOString().split("T")[0]!,
    });

    toast.success("Review submitted successfully!");
    setRevName("");
    setRevRating(5);
    setRevComment("");
  };

  const addToCart = () => {
    add({ slug: product.slug, size, qty });
    toast.success(`${product.name} added to cart`, { description: `Size ${size}` });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link
          href={`/category/${product.category}`}
          className="capitalize hover:text-primary"
        >
          {product.category.replace("-", " ")}
        </Link>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div
            className="relative overflow-hidden rounded-2xl border border-border bg-secondary shadow-card group"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <img
              src={getImageUrl(activeImage, "large")}
              alt={product.name}
              width={800}
              height={800}
              fetchPriority="high"
              decoding="async"
              className="aspect-square size-full object-cover transition-all duration-300"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }}
            />
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-background/80 text-foreground border border-border backdrop-blur-md shadow-md hover:bg-background transition-all hover:scale-105 active:scale-95 cursor-pointer z-10 opacity-80 hover:opacity-100"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-background/80 text-foreground border border-border backdrop-blur-md shadow-md hover:bg-background transition-all hover:scale-105 active:scale-95 cursor-pointer z-10 opacity-80 hover:opacity-100"
                  aria-label="Next image"
                >
                  <ChevronRight className="size-6" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                  <div
                    key={activeImage}
                    className="h-full bg-primary animate-slide-progress"
                    style={{
                      animationPlayState: isPaused ? "paused" : "running",
                    }}
                  />
                </div>
              </>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(img)}
                  className={`size-16 overflow-hidden rounded-lg border-2 transition-all cursor-pointer bg-secondary shadow-sm ${
                    activeImage === img
                      ? "border-primary scale-95"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <img
                    src={getImageUrl(img, "thumb")}
                    alt={`${product.name} gallery ${idx + 1}`}
                    width={64}
                    height={64}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMAGE; }}
                  />
                </button>
              ))}
            </div>
          )}
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
          {avgRating && (
            <div className="mt-2 flex items-center gap-1.5 text-sm">
              <div className="flex text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-4 ${
                      i < Math.round(Number(avgRating)) ? "fill-current" : "text-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="font-bold text-foreground">{avgRating}</span>
              <span className="text-muted-foreground">({productReviews.length} {productReviews.length === 1 ? "review" : "reviews"})</span>
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-3xl font-bold text-price">{formatBDT(unitPrice)}</span>
            {(product.mrp || product.compareAt) && (
              <span className="text-base text-muted-foreground line-through">
                {formatBDT(product.mrp || product.compareAt || 0)}
              </span>
            )}
            {currentDiscount > 0 && (
              <span className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
                ৳{currentDiscount} ছাড়
              </span>
            )}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          {product.isBundle && product.bundleProducts && (
            <div className="mt-6 border border-border rounded-xl p-4 bg-secondary/10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Items Included in this Bundle:</h3>
              <div className="mt-3 space-y-2">
                {product.bundleProducts.map((itemSlug, idx) => {
                  const item = products.find(p => p.slug === itemSlug) || staticProducts.find(p => p.slug === itemSlug);
                  if (!item) return null;
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-card p-2 rounded-lg border border-border/60">
                      <img src={getImageUrl(item.image)} alt={item.name} width={40} height={40} loading="lazy" className="size-10 object-cover rounded-md bg-muted/20" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Category: {item.category}</p>
                      </div>
                      <Link
                        href={`/product/${item.slug}`}
                        className="text-xs text-primary hover:underline px-2.5 py-1 bg-secondary rounded font-medium"
                      >
                        View Product
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                const st = getSizeStock(product, s);
                // Out of stock only if stock is 0 and acceptPreOrder is false
                const isOutOfStock = st === 0 && !product.acceptPreOrder;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`relative min-w-11 rounded-lg border px-3 py-2 text-sm font-semibold transition-all cursor-pointer ${
                      s === size
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : isOutOfStock
                        ? "border-dashed border-destructive/40 bg-secondary/20 text-muted-foreground opacity-60 line-through"
                        : "border-border bg-card text-foreground hover:border-primary"
                    }`}
                  >
                    {s}
                    {product.sizePrices && product.sizePrices[s] !== undefined && (
                      <span className="ml-1 text-[10px] opacity-70">
                        ৳{sp}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {size && (
              <p className="mt-2 text-xs font-medium">
                {getSizeStock(product, size) > 0 || product.acceptPreOrder ? (
                  <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    In Stock
                  </span>
                ) : (
                  <span className="text-red-600 font-bold inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-red-500" />
                    Out of Stock
                  </span>
                )}
              </p>
            )}
          </div>

          {(() => {
            const currentStock = getSizeStock(product, size);
            const isOrderBlocked = currentStock < qty && !product.acceptPreOrder;

            return (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex items-center rounded-lg border border-border bg-card">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={isOrderBlocked && currentStock === 0}
                    className="grid size-11 place-items-center text-foreground hover:text-primary cursor-pointer disabled:opacity-40"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{qty}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQty((q) => q + 1)}
                    disabled={isOrderBlocked && currentStock === 0}
                    className="grid size-11 place-items-center text-foreground hover:text-primary cursor-pointer disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                {isOrderBlocked ? (
                  <button
                    type="button"
                    disabled
                    className="h-11 flex-1 min-w-[200px] rounded-lg bg-muted text-muted-foreground font-bold text-sm cursor-not-allowed border border-border flex items-center justify-center gap-2"
                  >
                    Out of Stock
                  </button>
                ) : (
                  <>
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
                  </>
                )}

                <button
                  type="button"
                  onClick={() => toggleWishlist(product)}
                  className={`flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold transition-colors cursor-pointer ${
                    isWishlisted
                      ? "border-rose-500 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                      : "border-border bg-card text-foreground hover:border-rose-500 hover:text-rose-500"
                  }`}
                  title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart className={`size-4 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
                  {isWishlisted ? "Wishlisted" : "Wishlist"}
                </button>
              </div>
            );
          })()}

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

      {/* Tabs System (Description, Video, Return Policy) */}
      <div className="mt-12 border-b border-border">
        <div className="flex gap-6 text-sm font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab("description")}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "description"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "video"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Product Video
          </button>
          <button
            onClick={() => setActiveTab("return")}
            className={`pb-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "return"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Return Policy
          </button>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === "description" && (
          <div className="prose max-w-none text-sm leading-relaxed text-muted-foreground">
            <p>{product.description}</p>
          </div>
        )}

        {activeTab === "video" && (
          <div className="max-w-xl overflow-hidden rounded-xl border border-border bg-card p-2 shadow-sm">
            {product.videoUrl ? (
              <div className="aspect-video w-full">
                <iframe
                  src={
                    product.videoUrl.includes("watch?v=")
                      ? product.videoUrl.replace("watch?v=", "embed/")
                      : product.videoUrl.includes("youtu.be/")
                      ? product.videoUrl.replace("youtu.be/", "youtube.com/embed/")
                      : product.videoUrl
                  }
                  title={`${product.name} Video`}
                  className="size-full rounded-lg border-0"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <p>No video available for this product.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "return" && (
          <div className="prose max-w-none text-sm leading-relaxed text-muted-foreground space-y-2">
            <p>
              {product.returnPolicy ||
                "We offer a 7-day exchange policy for size and fit issues. Products must be unworn, unwashed, and have the original tags attached."}
            </p>
          </div>
        )}
      </div>

      {/* Reviews Section */}
      <section className="mt-16 border-t border-border pt-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Rating Summary & Write Review Form */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <h2 className="section-title border-l-4 border-primary">Customer Reviews</h2>
            </div>

            <form onSubmit={handleReviewSubmit} className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h3 className="font-display font-bold text-foreground">Write a Review</h3>
              
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
                <input
                  type="text"
                  value={revName}
                  onChange={(e) => setRevName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rating</label>
                <div className="flex gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const stars = i + 1;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRevRating(stars)}
                        className="text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                        aria-label={`Rate ${stars} stars`}
                      >
                        <Star className={`size-6 ${stars <= revRating ? "fill-amber-500 text-amber-500" : "text-muted"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comment</label>
                <textarea
                  value={revComment}
                  onChange={(e) => setRevComment(e.target.value)}
                  placeholder="What did you like or dislike?"
                  rows={4}
                  className="w-full p-3 rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-colors cursor-pointer"
              >
                Submit Review
              </button>
            </form>
          </div>

          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-display text-lg font-bold text-foreground">
              Reviews ({productReviews.length})
            </h3>
            {productReviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                No reviews yet. Be the first to write a review!
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {productReviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">{r.customerName}</span>
                      <span className="text-xs text-muted-foreground">{r.date}</span>
                    </div>
                    <div className="flex text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-3.5 ${
                            i < r.rating ? "fill-current" : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="section-title border-l-4 border-primary">You may also like</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
