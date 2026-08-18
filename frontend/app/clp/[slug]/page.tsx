"use client";

import { useEffect, useState, useMemo, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Clock,
  Sparkles,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Phone,
  ArrowRight,
  Plus,
  Minus,
  Star,
  Check,
  ShoppingBag,
  HeartHandshake,
  BadgePercent,
  ChevronRight,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  customLandingPageService,
  LandingPageData,
  LandingSection,
  DEFAULT_LANDING_SECTIONS,
  RelatedProductItem,
} from "@/lib/api/services/custom-landing-page.service";
import { productsService } from "@/lib/api/services/products.service";
import { products as staticProducts } from "@/lib/shop-data";
import { getImageUrl } from "@/lib/utils";
import { CustomSectionRenderer } from "@/components/admin/custom-section-renderer";
import { settingsService } from "@/lib/api/services/settings.service";
import { ordersService } from "@/lib/api/services/orders.service";
import { DEFAULT_CITIES, getAreasForCity } from "@/lib/location-data";

import { SystemSettings } from "@/types/settings";

interface SelectedOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  imageUrl: string;
}

export default function CustomLandingPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LandingPageData | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Selected Order items
  const [selectedItems, setSelectedItems] = useState<SelectedOrderItem[]>([]);
  const [selectedMainSize, setSelectedMainSize] = useState<string>("");

  // Checkout Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedCity, setSelectedCity] = useState("Dhaka");
  const [selectedArea, setSelectedArea] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ hours: 1, minutes: 59, seconds: 59 });

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        const [fetchedPageData, siteSettings] = await Promise.all([
          customLandingPageService.getBySlug(slug),
          settingsService.get().catch(() => null),
        ]);
        let pageData = fetchedPageData;

        // Fallback: If custom landing page endpoint returns null (e.g. 404), fetch product via productsService or shop-data
        if (!pageData?.product) {
          let rawProduct = await productsService.getBySlug(slug);
          if (!rawProduct) {
            rawProduct = staticProducts.find((p) => p.slug === slug || p.name.toLowerCase().replace(/\s+/g, "-") === slug);
          }
          if (rawProduct) {
            pageData = {
              product: {
                id: rawProduct.id || slug,
                name: rawProduct.name,
                slug: rawProduct.slug,
                description: rawProduct.description || "",
                shortDescription: rawProduct.description || "",
                price: rawProduct.price,
                compareAtPrice: rawProduct.compareAt || null,
                basePrice: rawProduct.mrp || rawProduct.price,
                discountPrice: rawProduct.price < (rawProduct.mrp || rawProduct.price) ? rawProduct.price : null,
                imageUrl: rawProduct.image || "",
                images: (rawProduct.images || []).map((img, idx) => ({ imageUrl: img, isMain: idx === 0 })),
                variants: (rawProduct.sizes || []).map((s) => ({
                  id: s,
                  name: s,
                  stockQuantity: rawProduct.sizeStock?.[s] ?? 10,
                  priceOverride: rawProduct.sizePrices?.[s],
                })),
              },
              config: null,
            };
          }
        }

        setData(pageData);
        setSettings(siteSettings);

        if (pageData?.product) {
          const mainProd = pageData.product;
          const firstVariant = mainProd.variants?.[0]?.name || "";
          setSelectedMainSize(firstVariant);

          setSelectedItems([
            {
              productId: mainProd.id,
              name: mainProd.name,
              price: mainProd.price,
              quantity: 1,
              size: firstVariant,
              imageUrl: mainProd.imageUrl,
            },
          ]);
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to load landing page");
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [slug]);

  // Support real-time postMessage preview updates from Designer
  useEffect(() => {
    if (!isPreview) return;

    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.type === "CLP_PREVIEW_UPDATE") {
        const { config: newConfig, sections: newSections, product: updatedProduct } = event.data;
        if (newConfig) {
          setData((prev) => {
            if (!prev) {
              return {
                product: updatedProduct || { id: "", name: "", slug: "", description: "", shortDescription: "", price: 0, basePrice: 0, imageUrl: "", images: [], variants: [] },
                config: { ...newConfig, sectionsJson: newSections ? JSON.stringify(newSections) : undefined },
              };
            }
            return {
              ...prev,
              product: updatedProduct || prev.product,
              config: {
                ...prev.config,
                ...newConfig,
                sectionsJson: newSections ? JSON.stringify(newSections) : prev.config?.sectionsJson,
              },
            };
          });
        }
      }
    }

    window.addEventListener("message", handleMessage);
    // Tell parent editor that preview iframe is ready
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "CLP_PREVIEW_READY" }, "*");
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [isPreview]);

  // Real-time Countdown Timer logic
  useEffect(() => {
    const totalMinutes = data?.config?.relativeTimerTotalMinutes ?? 120;
    const initialSeconds = totalMinutes * 60;
    let currentSeconds = initialSeconds;

    const timer = setInterval(() => {
      currentSeconds--;
      if (currentSeconds <= 0) {
        currentSeconds = initialSeconds; // reset cycle
      }

      const h = Math.floor(currentSeconds / 3600);
      const m = Math.floor((currentSeconds % 3600) / 60);
      const s = currentSeconds % 60;
      setTimeLeft({ hours: h, minutes: m, seconds: s });
    }, 1000);

    return () => clearInterval(timer);
  }, [data?.config?.relativeTimerTotalMinutes]);

  const activeSections = useMemo(() => {
    if (data?.config?.sectionsJson) {
      try {
        const parsed: LandingSection[] = JSON.parse(data.config.sectionsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((s) => s.visible);
        }
      } catch (e) {
        console.error("Failed to parse sectionsJson", e);
      }
    }
    return DEFAULT_LANDING_SECTIONS.filter((s) => s.visible);
  }, [data?.config?.sectionsJson]);

  // Price & Delivery calculations
  const insideDhakaFee = useMemo(() => {
    return (
      settings?.shipping?.rules?.find(
        (r) => r.name.toLowerCase().includes("inside") || r.name.includes("ঢাকা")
      )?.charge ?? 70
    );
  }, [settings]);

  const outsideDhakaFee = useMemo(() => {
    return (
      settings?.shipping?.rules?.find(
        (r) => r.name.toLowerCase().includes("outside") || r.name.includes("বাইরে")
      )?.charge ?? 130
    );
  }, [settings]);

  const availableAreas = useMemo(() => getAreasForCity(selectedCity), [selectedCity]);

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    const areas = getAreasForCity(city);
    setSelectedArea(areas[0] || "");
  };

  const deliveryCharge = useMemo(() => {
    const freeThreshold = data?.config?.freeShippingThresholdQuantity;
    const totalQty = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

    if (freeThreshold && freeThreshold > 0 && totalQty >= freeThreshold) {
      return 0; // Free delivery milestone reached!
    }

    return selectedCity === "Dhaka" ? insideDhakaFee : outsideDhakaFee;
  }, [selectedCity, insideDhakaFee, outsideDhakaFee, selectedItems, data?.config?.freeShippingThresholdQuantity]);

  const subtotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [selectedItems]);

  const grandTotal = subtotal + deliveryCharge;

  // Toggle selection for related products
  const toggleRelatedProduct = (prod: RelatedProductItem) => {
    const exists = selectedItems.some((i) => i.productId === prod.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.productId !== prod.id));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          productId: prod.id,
          name: prod.name,
          price: prod.price,
          quantity: 1,
          size: prod.variants?.[0]?.name || "",
          imageUrl: prod.imageUrl,
        },
      ]);
    }
  };

  const updateItemQuantity = (productId: string, delta: number) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const updateItemSize = (productId: string, newSize: string) => {
    setSelectedItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, size: newSize } : item))
    );
  };

  const scrollToOrderForm = () => {
    const el = document.getElementById("section-order-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Submit Direct Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("অনুগ্রহ করে আপনার নাম লিখুন");
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      toast.error("অনুগ্রহ করে সঠিক মোবাইল নম্বর দিন");
      return;
    }
    if (!customerAddress.trim()) {
      toast.error("অনুগ্রহ করে সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("কমপক্ষে একটি প্রোডাক্ট সিলেক্ট করুন");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress: customerAddress.trim(),
        city: selectedCity,
        area: selectedArea,
        deliveryCharge: deliveryCharge,
        subtotal: subtotal,
        totalAmount: grandTotal,
        paymentMethod: "Cash on Delivery",
        notes: notes.trim(),
        items: selectedItems.map((item) => ({
          productId: item.productId,
          productName: item.name,
          unitPrice: item.price,
          quantity: item.quantity,
          variantName: item.size || "",
          totalPrice: item.price * item.quantity,
        })),
      };

      const res = await ordersService.createOrder(payload);
      toast.success("আপনার অর্ডারটি সফলভাবে গৃহীত হয়েছে!");
      const orderId = res?.orderNumber || "success";
      router.push(`/order-confirmation/${orderId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "অর্ডার সম্পন্ন করতে সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-4">
        <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse">
          পেজ লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...
        </p>
      </div>
    );
  }

  if (!data?.product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <Package className="size-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground">প্রোডাক্টটি খুঁজে পাওয়া যায়নি</h1>
        <p className="text-sm text-muted-foreground mt-2">
          এই লিংকটি হয়তো মেয়াদোত্তীর্ণ হয়েছে অথবা প্রোডাক্টটি সরানো হয়েছে।
        </p>
      </div>
    );
  }

  const { product, config, relatedProducts } = data;
  const isMarquee = config?.isMarqueeVisible ?? true;
  const marqueeText =
    config?.marqueeText ||
    "🔥 সীমিত স্টক — মাত্র ৩৪টি বাকি! 🚚 সারা বাংলাদেশে ক্যাশ অন ডেলিভারি 💥 আজকের জন্য বিশেষ ছাড় ⚡";
  const isTimer = config?.isTimerVisible ?? true;
  const timerTitle = config?.headerTitle || "অফারটি শেষ হতে মাত্র কিছুক্ষণ বাকি আছে!";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* 1. Scrolling Marquee Bar */}
      {isMarquee && (
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-primary text-white py-1.5 md:py-2 px-3 md:px-4 overflow-hidden relative shadow-sm text-[11px] md:text-sm font-bold">
          <div className="flex whitespace-nowrap animate-marquee">
            <span className="mx-3 md:mx-4">{marqueeText}</span>
            <span className="mx-3 md:mx-4">{marqueeText}</span>
            <span className="mx-3 md:mx-4">{marqueeText}</span>
          </div>
        </div>
      )}

      {/* 2. Sticky Countdown Urgency Bar */}
      {isTimer && (
        <div className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md text-white py-2 md:py-2.5 px-3 md:px-4 border-b border-slate-800 shadow-md">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 md:gap-2 text-center sm:text-left">
            <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
              <Clock className="size-3.5 md:size-4 text-amber-400 animate-pulse shrink-0" />
              <span className="text-[11px] md:text-sm font-bold text-slate-100 truncate">{timerTitle}</span>
            </div>

            {/* Timer Clock */}
            <div className="flex items-center gap-1 md:gap-1.5 font-mono text-[10px] md:text-xs font-black shrink-0">
              <div className="bg-slate-900 border border-slate-700 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md text-amber-400">
                {String(timeLeft.hours).padStart(2, "0")}h
              </div>
              <span className="text-slate-500">:</span>
              <div className="bg-slate-900 border border-slate-700 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md text-amber-400">
                {String(timeLeft.minutes).padStart(2, "0")}m
              </div>
              <span className="text-slate-500">:</span>
              <div className="bg-slate-900 border border-slate-700 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md text-amber-400">
                {String(timeLeft.seconds).padStart(2, "0")}s
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Render Active Sections */}
      <main className="divide-y divide-border/60">
        {activeSections.map((sec) => {
          switch (sec.type) {
            case "hero": {
              const heroIdx = activeSections.findIndex((s) => s.id === sec.id);
              const nextSec = activeSections.slice(heroIdx + 1).find((s) => s.visible);
              const nextSectionId = nextSec ? `section-${nextSec.id}` : "order-form";

              return (
                <section key={sec.id} id={`section-${sec.id}`} className="py-8 md:py-12 px-4 bg-gradient-to-b from-primary/5 to-transparent text-center">
                  <div className="max-w-3xl mx-auto space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-bold border border-primary/20">
                      <Sparkles className="size-4" />
                      <span>{config?.promoText || "🔥 বিশেষ ধামাকা অফার!"}</span>
                    </div>

                    <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight leading-snug">
                      {product.name}
                    </h1>

                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
                      {product.shortDescription || "প্রিমিয়াম কোয়ালিটি এবং আধুনিক ডিজাইনের নির্ভরযোগ্য সমাধান। আজই সীমিত মূল্যে অর্ডার করুন!"}
                    </p>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(nextSectionId);
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all text-base cursor-pointer"
                      >
                        <span>অর্ডার করতে এখানে চাপুন</span>
                        <ArrowRight className="size-5" />
                      </button>
                    </div>
                  </div>
                </section>
              );
            }

            case "product-hero":
              return (
                <section key={sec.id} id={`section-${sec.id}`} className="py-10 px-4 md:px-8 bg-card">
                  <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center">
                    {/* Product Image */}
                    <div className="relative rounded-2xl overflow-hidden border border-border shadow-xl bg-background aspect-square max-w-md mx-auto w-full">
                      {product.imageUrl ? (
                        <img
                          src={getImageUrl(product.imageUrl)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Package className="size-16" />
                        </div>
                      )}

                      {/* Discount Badge */}
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <div className="absolute top-4 left-4 bg-rose-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                          <BadgePercent className="size-3.5" />
                          <span>
                            ৳{Math.round(product.compareAtPrice - product.price)} ছাড়
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Details & Variant Picker */}
                    <div className="space-y-6">
                      <div>
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">
                          {config?.productDetailsTitle || "🔥 প্রোডাক্ট ডিটেইলস"}
                        </span>
                        <h2 className="text-2xl md:text-3xl font-black text-foreground mt-1">
                          {config?.featuredProductName || product.name}
                        </h2>
                      </div>

                      {/* Price Section */}
                      <div className="flex items-baseline gap-3 p-4 bg-muted/40 rounded-xl border border-border">
                        <span className="text-3xl font-black text-primary">
                          ৳{product.price.toLocaleString()}
                        </span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <span className="text-lg text-muted-foreground line-through font-medium">
                            ৳{product.compareAtPrice.toLocaleString()}
                          </span>
                        )}
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded ml-auto">
                          ক্যাশ অন ডেলিভারি
                        </span>
                      </div>

                      {/* Variants / Size Picker */}
                      {product.variants && product.variants.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            সাইজ / ভ্যারিয়েন্ট সিলেক্ট করুন:
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {product.variants.map((v) => {
                              const isSelected = selectedMainSize === v.name;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedMainSize(v.name);
                                    updateItemSize(product.id, v.name);
                                  }}
                                  className={`px-4 py-2 rounded-lg border font-bold text-xs transition-all cursor-pointer ${
                                    isSelected
                                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                      : "border-border bg-card text-foreground hover:border-primary/50"
                                  }`}
                                >
                                  {v.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      <div className="text-xs md:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                        {product.description}
                      </div>

                      <button
                        type="button"
                        onClick={scrollToOrderForm}
                        className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:opacity-90 shadow-md transition-all text-center flex items-center justify-center gap-2 text-sm cursor-pointer"
                      >
                        <ShoppingBag className="size-4" />
                        <span>সরাসরি অর্ডার ফর্ম-এ যান</span>
                      </button>
                    </div>
                  </div>
                </section>
              );

            case "discount-cta": {
              const mrp = config?.originalPrice || product.compareAtPrice || product.basePrice || product.price;
              const sizePrice = config?.sizePrices?.[selectedMainSize]
                || product.variants?.find((v) => v.name === selectedMainSize)?.priceOverride
                || product.price;
              const hasDiscount = mrp > sizePrice;
              const discountPercent = hasDiscount ? Math.round(((mrp - sizePrice) / mrp) * 100) : 0;

              return (
                <section key={sec.id} id={`section-${sec.id}`} className="py-8 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-center">
                  <div className="max-w-2xl mx-auto space-y-3">
                    <h3 className="text-xl md:text-2xl font-black">
                      {config?.promoText || "🔥 আজকের স্পেশাল কম্বো অফার!"}
                    </h3>

                    {/* Price Display */}
                    <div className="flex items-center justify-center gap-3 pt-1">
                      {hasDiscount && (
                        <span className="text-lg text-emerald-200 line-through font-medium">
                          ৳{mrp.toLocaleString()}
                        </span>
                      )}
                      <span className="text-3xl font-black">
                        ৳{sizePrice.toLocaleString()}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                          {discountPercent}% ছাড়
                        </span>
                      )}
                    </div>

                    {/* Selected Size */}
                    {selectedMainSize && (
                      <p className="text-xs text-emerald-200">
                        সাইজ: <span className="font-bold text-white">{selectedMainSize}</span>
                      </p>
                    )}

                    <p className="text-xs md:text-sm text-emerald-100 leading-relaxed">
                      {config?.freeShippingThresholdQuantity
                        ? `যেকোনো ${config.freeShippingThresholdQuantity}টি প্রোডাক্ট অর্ডার করলেই ফ্রি হোম ডেলিভারি!`
                        : "সীমিত সময়ের জন্য বিশেষ ছাড়ের সুযোগ গ্রহণ করুন।"}
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={scrollToOrderForm}
                        className="bg-white text-emerald-800 font-black px-6 py-2.5 rounded-full hover:bg-emerald-50 shadow-md transition-all text-xs md:text-sm cursor-pointer"
                      >
                        অর্ডার করতে এখানে চাপুন
                      </button>
                    </div>
                  </div>
                </section>
              );
            }

            case "trust-banner":
              return (
                <section key={sec.id} id={`section-${sec.id}`} className="py-8 px-4 md:px-8 bg-card">
                  <div className="max-w-4xl mx-auto p-6 bg-muted/40 rounded-2xl border border-border flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                    <div className="size-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <ShieldCheck className="size-7" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-foreground">১০০% নিরাপদ কেনাকাটা</h4>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed">
                        {config?.trustBannerText ||
                          "দেখে চেক করে রিসিভ করতে পারবেন। পছন্দ না হলে ডেলিভারি চার্জ দিয়ে রিটার্ন করে দিতে পারবেন সহজেই।"}
                      </p>
                    </div>
                  </div>
                </section>
              );

            case "info-banner":
              return (
                <section key={sec.id} id={`section-${sec.id}`} className="py-6 px-4 md:px-8 bg-amber-500/10 border-y border-amber-500/20 text-center">
                  <div className="max-w-3xl mx-auto flex items-center justify-center gap-3 text-amber-900 dark:text-amber-200">
                    <ShieldCheck className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs md:text-sm font-semibold">
                      {config?.trustBannerText || "পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধের সম্পূর্ণ নিশ্চয়তা!"}
                    </p>
                  </div>
                </section>
              );

            case "product-select":
              if (!relatedProducts || relatedProducts.length === 0) return null;
              return (
                <section key={sec.id} id={`section-${sec.id}`} className="py-10 px-4 md:px-8 bg-background">
                  <div className="max-w-5xl mx-auto space-y-6">
                    <div className="text-center space-y-1">
                      <h3 className="text-xl md:text-2xl font-black text-foreground">
                        📦 পছন্দের কালার বা ভ্যারিয়েন্ট সিলেক্ট করুন
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        নিচের তালিকা থেকে আপনার পছন্দের আইটেমটি নির্বাচন করুন
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {relatedProducts.map((p) => {
                        const isSelected = selectedItems.some((i) => i.productId === p.id);
                        const currentItem = selectedItems.find((i) => i.productId === p.id);

                        return (
                          <div
                            key={p.id}
                            className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary"
                                : "border-border bg-card hover:border-primary/40"
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Product Thumbnail */}
                              <div className="aspect-square rounded-lg overflow-hidden bg-muted border border-border relative">
                                <img
                                  src={getImageUrl(p.imageUrl)}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                                {isSelected && (
                                  <div className="absolute top-2 right-2 size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                                    <Check className="size-3.5" />
                                  </div>
                                )}
                              </div>

                              <div>
                                <h4 className="text-sm font-bold text-foreground line-clamp-1">
                                  {p.name}
                                </h4>
                                <p className="text-sm font-black text-primary mt-0.5">
                                  ৳{p.price.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {/* Selection Toggle & Quantity */}
                            <div className="pt-3 border-t border-border/60 mt-3 flex items-center justify-between gap-2">
                              {isSelected ? (
                                <div className="flex items-center gap-2 w-full justify-between">
                                  <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
                                    <button
                                      type="button"
                                      onClick={() => updateItemQuantity(p.id, -1)}
                                      className="size-7 flex items-center justify-center hover:bg-muted text-foreground cursor-pointer"
                                    >
                                      <Minus className="size-3" />
                                    </button>
                                    <span className="w-8 text-center text-xs font-bold text-foreground">
                                      {currentItem?.quantity || 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => updateItemQuantity(p.id, 1)}
                                      className="size-7 flex items-center justify-center hover:bg-muted text-foreground cursor-pointer"
                                    >
                                      <Plus className="size-3" />
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => toggleRelatedProduct(p)}
                                    className="text-xs text-destructive hover:underline font-semibold cursor-pointer"
                                  >
                                    সরান
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => toggleRelatedProduct(p)}
                                  className="w-full py-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground text-xs font-bold transition-colors cursor-pointer"
                                >
                                  + যোগ করুন
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );

            case "custom":
              return (
                <CustomSectionRenderer
                  key={sec.id}
                  section={sec}
                  onScrollToOrder={scrollToOrderForm}
                />
              );

            case "reviews":
              return (
                <section key={sec.id} id={`section-${sec.id}`} className="py-10 px-4 md:px-8 bg-card">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="text-center space-y-1">
                      <div className="flex items-center justify-center gap-1 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="size-4 fill-current" />
                        ))}
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-foreground">
                        কাস্টমারদের প্রতিক্রিয়া ও রিভিউ
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        সারা বাংলাদেশের শত শত সন্তুষ্ট গ্রাহক আমাদের প্রোডাক্ট ব্যবহার করছেন
                      </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">তানভীর হাসান</span>
                          <span className="text-[10px] text-emerald-600 font-bold">Verified Buyer</span>
                        </div>
                        <div className="flex gap-0.5 text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="size-3 fill-current" />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          "কোয়ালিটি খুবই ভালো! সময়মতো ডেলিভারি পেয়েছি এবং কাপড়ের ফিনিশিং প্রিমিয়াম ছিল।"
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">ফারহানা আক্তার</span>
                          <span className="text-[10px] text-emerald-600 font-bold">Verified Buyer</span>
                        </div>
                        <div className="flex gap-0.5 text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="size-3 fill-current" />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          "ছবিতে যেমন দেখেছি হুবহু তেমনই পেয়েছি। রিটার্ন সুবিধার ভরসা থাকায় নিশ্চিন্তে অর্ডার করেছিলাম।"
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">মো: রাশেদুল ইসলাম</span>
                          <span className="text-[10px] text-emerald-600 font-bold">Verified Buyer</span>
                        </div>
                        <div className="flex gap-0.5 text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="size-3 fill-current" />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          "ক্যাশ অন ডেলিভারিতে চেক করে নেওয়ার সুবিধাটা দারুণ। সার্ভিস ও ব্যবহার খুব চমৎকার!"
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              );

            case "order-form":
              return (
                <section key={sec.id} id={`section-${sec.id}`} className="py-12 px-4 md:px-8 bg-muted/30">
                  <div className="max-w-3xl mx-auto bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
                    {/* Form Header */}
                    <div className="bg-primary text-primary-foreground p-6 text-center space-y-1">
                      <h3 className="text-xl md:text-2xl font-black">
                        📝 সরাসরি অর্ডার করতে তথ্য পূরণ করুন
                      </h3>
                      <p className="text-xs md:text-sm text-primary-foreground/80">
                        ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন
                      </p>
                    </div>

                    <form onSubmit={handlePlaceOrder} className="p-6 md:p-8 space-y-6">
                      {/* 1. Selected Products Summary */}
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          আপনার নির্বাচিত প্রোডাক্ট ({selectedItems.length}):
                        </label>
                        <div className="space-y-2 bg-muted/30 p-3 rounded-xl border border-border">
                          {selectedItems.map((item) => (
                            <div
                              key={item.productId}
                              className="flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={getImageUrl(item.imageUrl)}
                                  alt={item.name}
                                  className="size-10 rounded-md object-cover border border-border shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-foreground truncate">{item.name}</p>
                                  {item.size && (
                                    <p className="text-[11px] text-muted-foreground">
                                      সাইজ: {item.size}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center border border-border rounded bg-background">
                                  <button
                                    type="button"
                                    onClick={() => updateItemQuantity(item.productId, -1)}
                                    className="size-6 flex items-center justify-center hover:bg-muted"
                                  >
                                    <Minus className="size-2.5" />
                                  </button>
                                  <span className="w-6 text-center font-bold">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateItemQuantity(item.productId, 1)}
                                    className="size-6 flex items-center justify-center hover:bg-muted"
                                  >
                                    <Plus className="size-2.5" />
                                  </button>
                                </div>

                                <span className="font-bold text-foreground w-16 text-right">
                                  ৳{(item.price * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 2. Customer Name & Phone */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">আপনার নাম *</label>
                          <input
                            type="text"
                            required
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="যেমন: মোঃ করিম"
                            className="w-full h-11 px-3.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">
                            মোবাইল নম্বর * (১১ ডিজিট)
                          </label>
                          <input
                            type="tel"
                            required
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="01XXXXXXXXX"
                            className="w-full h-11 px-3.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                          />
                        </div>
                      </div>

                      {/* 3. City & Area Selection */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">শহর / জেলা *</label>
                          <select
                            value={selectedCity}
                            onChange={(e) => handleCityChange(e.target.value)}
                            className="w-full h-11 px-3.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                          >
                            {DEFAULT_CITIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-foreground">থানা / উপজেলা *</label>
                          <select
                            value={selectedArea}
                            onChange={(e) => setSelectedArea(e.target.value)}
                            className="w-full h-11 px-3.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                          >
                            {availableAreas.map((a) => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 4. Full Address */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">
                          পূর্ণাঙ্গ ঠিকানা (বাসা/রোড/এলাকা) *
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="বাসা নম্বর, রোড, এলাকার বিস্তারিত লিখুন..."
                          className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
                        />
                      </div>

                      {/* 5. Note */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">নোট (ঐচ্ছিক)</label>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="অর্ডার সম্পর্কে কিছু জানাতে চাইলে লিখুন..."
                          className="w-full h-11 px-3.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                        />
                      </div>

                      {/* 5. Pricing Breakdown */}
                      <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>প্রোডাক্ট সাবটোটাল</span>
                          <span className="font-bold text-foreground">
                            ৳{subtotal.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>ডেলিভারি চার্জ</span>
                          <span className="font-bold text-foreground">
                            {deliveryCharge === 0 ? "ফ্রি" : `৳${deliveryCharge}`}
                          </span>
                        </div>
                        <div className="border-t border-border pt-2 flex justify-between text-sm font-black text-foreground">
                          <span>সর্বমোট প্রদেয় বিল</span>
                          <span className="text-primary text-base font-black">
                            ৳{grandTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>অর্ডার প্রসেস হচ্ছে...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-5" />
                            <span>অর্ডার নিশ্চিত করুন (৳{grandTotal.toLocaleString()})</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </section>
              );

            default:
              return null;
          }
        })}
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border bg-card text-center text-xs text-muted-foreground space-y-1">
        <p>© {new Date().getFullYear()} {settings?.general?.websiteName || "ALZEENA"}. All Rights Reserved.</p>
        <p>সারা বাংলাদেশে নিরাপদ ক্যাশ অন ডেলিভারি সেবা।</p>
      </footer>
    </div>
  );
}
