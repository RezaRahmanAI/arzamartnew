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
  X,
  MessageCircle,
  Info,
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
import { getImageUrl, handleImageError } from "@/lib/utils";
import { CustomSectionRenderer } from "@/components/admin/custom-section-renderer";
import { settingsService } from "@/lib/api/services/settings.service";
import { ordersService } from "@/lib/api/services/orders.service";
import { DEFAULT_CITIES, getAreasForCity } from "@/lib/location-data";
import { SystemSettings } from "@/types/settings";

interface UnifiedProduct {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  price: number;
  basePrice?: number;
  compareAtPrice?: number | null;
  imageUrl?: string;
  images?: { imageUrl: string; isMain: boolean }[];
  variants?: { id: string; name: string; priceOverride?: number; stockQuantity?: number }[];
  isPreOrder?: boolean;
}

interface ProductSelectionState {
  [productId: string]: {
    quantity: number;
    selectedSize: string;
    product: UnifiedProduct;
  };
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

  // Arzamart Selection State
  const [productSelections, setProductSelections] = useState<ProductSelectionState>({});
  const [lastSelectedSizes, setLastSelectedSizes] = useState<{ [productId: string]: string }>({});

  // Quick Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<UnifiedProduct | null>(null);

  // Checkout Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedCity, setSelectedCity] = useState("Dhaka");
  const [selectedArea, setSelectedArea] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown timer state (Days, Hours, Minutes, Seconds)
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 1, minutes: 59, seconds: 59 });

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        const [fetchedPageData, siteSettings] = await Promise.all([
          customLandingPageService.getBySlug(slug),
          settingsService.get().catch(() => null),
        ]);
        let pageData = fetchedPageData;

        // Fallback: If custom landing page endpoint returns null, fetch product via productsService or shop-data
        if (!pageData?.product) {
          let rawProduct = await productsService.getBySlug(slug);
          if (!rawProduct) {
            rawProduct = staticProducts.find((p) => p.slug === slug || p.name.toLowerCase().replace(/\s+/g, "-") === slug);
          }
          if (rawProduct) {
            const rawMainImg = rawProduct.image || (rawProduct.images && rawProduct.images.length > 0 ? rawProduct.images[0] : "");
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
                imageUrl: rawMainImg,
                images: (rawProduct.images || (rawMainImg ? [rawMainImg] : [])).map((img, idx) => ({ imageUrl: img, isMain: idx === 0 })),
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
        } else if (pageData.product && !pageData.product.imageUrl) {
          const firstImg = pageData.product.images?.find((i) => i.isMain)?.imageUrl || pageData.product.images?.[0]?.imageUrl || "";
          if (firstImg) {
            pageData.product.imageUrl = firstImg;
          }
        }

        setData(pageData);
        setSettings(siteSettings);

        if (pageData?.product) {
          const mainProd: UnifiedProduct = {
            id: pageData.product.id,
            name: pageData.product.name,
            slug: pageData.product.slug,
            description: pageData.product.description,
            shortDescription: pageData.product.shortDescription,
            price: pageData.product.price,
            basePrice: pageData.product.basePrice,
            compareAtPrice: pageData.product.compareAtPrice,
            imageUrl: pageData.product.imageUrl,
            images: pageData.product.images,
            variants: pageData.product.variants,
          };
          const firstSize = mainProd.variants?.[0]?.name || "";

          setProductSelections({
            [mainProd.id]: {
              quantity: 1,
              selectedSize: firstSize,
              product: mainProd,
            },
          });
          if (firstSize) {
            setLastSelectedSizes({ [mainProd.id]: firstSize });
          }
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
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "CLP_PREVIEW_READY" }, "*");
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [isPreview]);

  // Real-time Countdown Timer logic (Days, Hours, Minutes, Seconds)
  useEffect(() => {
    const totalMinutes = data?.config?.relativeTimerTotalMinutes ?? 120;
    const initialSeconds = totalMinutes * 60;
    let currentSeconds = initialSeconds;

    const timer = setInterval(() => {
      currentSeconds--;
      if (currentSeconds <= 0) {
        currentSeconds = initialSeconds;
      }

      const d = Math.floor(currentSeconds / 86400);
      const h = Math.floor((currentSeconds % 86400) / 3600);
      const m = Math.floor((currentSeconds % 3600) / 60);
      const s = currentSeconds % 60;
      setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
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

  // All selectable products pool (Main Product + Related Products)
  const allSelectableProducts = useMemo(() => {
    if (!data?.product) return [];
    const list: UnifiedProduct[] = [
      {
        id: data.product.id,
        name: data.product.name,
        slug: data.product.slug,
        description: data.product.description,
        shortDescription: data.product.shortDescription,
        price: data.product.price,
        basePrice: data.product.basePrice,
        compareAtPrice: data.product.compareAtPrice,
        imageUrl: data.product.imageUrl,
        images: data.product.images,
        variants: data.product.variants,
      },
    ];

    if (data.relatedProducts && data.relatedProducts.length > 0) {
      data.relatedProducts.forEach((rp) => {
        if (!list.some((item) => item.id === rp.id)) {
          list.push({
            id: rp.id,
            name: rp.name,
            price: rp.price,
            compareAtPrice: rp.compareAtPrice || null,
            imageUrl: rp.imageUrl,
            variants: rp.variants,
          });
        }
      });
    }

    return list;
  }, [data]);

  // Selection Helper Methods
  const getProductPrice = (p: UnifiedProduct) => {
    const size = productSelections[p.id]?.selectedSize;
    if (size && data?.config?.sizePrices?.[size]) {
      return data.config.sizePrices[size];
    }
    if (size && p.variants) {
      const v = p.variants.find((vr) => vr.name === size);
      if (v?.priceOverride) return v.priceOverride;
    }
    return p.price;
  };

  const isProductSelected = (p: UnifiedProduct): boolean => {
    return (productSelections[p.id]?.quantity ?? 0) > 0;
  };

  const getProductQuantity = (p: UnifiedProduct): number => {
    return productSelections[p.id]?.quantity ?? 0;
  };

  const getSelectedSize = (p: UnifiedProduct): string => {
    return productSelections[p.id]?.selectedSize || lastSelectedSizes[p.id] || p.variants?.[0]?.name || "";
  };

  const getUniqueSizes = (p: UnifiedProduct): string[] => {
    if (!p.variants || p.variants.length === 0) return [];
    return Array.from(new Set(p.variants.map((v) => v.name)));
  };

  const updateSelections = (product: UnifiedProduct, quantity: number, size?: string) => {
    setProductSelections((prev) => {
      const current = prev[product.id];
      const newSize = size !== undefined ? size : (current?.selectedSize || lastSelectedSizes[product.id] || product.variants?.[0]?.name || "");

      if (quantity <= 0) {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      }

      return {
        ...prev,
        [product.id]: {
          quantity,
          selectedSize: newSize,
          product,
        },
      };
    });
  };

  const toggleProductCheck = (p: UnifiedProduct) => {
    const currentQty = productSelections[p.id]?.quantity ?? 0;
    const currentSize = productSelections[p.id]?.selectedSize || lastSelectedSizes[p.id] || p.variants?.[0]?.name || "";

    if (currentQty > 0) {
      if (currentSize) {
        setLastSelectedSizes((prev) => ({ ...prev, [p.id]: currentSize }));
      }
      updateSelections(p, 0);
    } else {
      const remembered = lastSelectedSizes[p.id] || p.variants?.[0]?.name || "";
      updateSelections(p, 1, remembered);
    }
  };

  const selectProductSize = (p: UnifiedProduct, size: string) => {
    setLastSelectedSizes((prev) => ({ ...prev, [p.id]: size }));
    const currentQty = productSelections[p.id]?.quantity ?? 0;
    updateSelections(p, currentQty > 0 ? currentQty : 1, size);
  };

  const updateProductQuantity = (p: UnifiedProduct, delta: number) => {
    const currentQty = productSelections[p.id]?.quantity ?? 0;
    const newQty = Math.max(0, currentQty + delta);
    const size = getSelectedSize(p);
    updateSelections(p, newQty, size);
  };

  const selectedProductList = useMemo(() => {
    return Object.values(productSelections).filter((s) => s.quantity > 0);
  }, [productSelections]);

  const openProductDetails = (p: UnifiedProduct) => {
    setSelectedProductForDetails(p);
    setShowDetailsModal(true);
  };

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
    const totalQty = selectedProductList.reduce((sum, item) => sum + item.quantity, 0);

    if (freeThreshold && freeThreshold > 0 && totalQty >= freeThreshold) {
      return 0; // Free delivery threshold reached
    }

    return selectedCity === "Dhaka" ? insideDhakaFee : outsideDhakaFee;
  }, [selectedCity, insideDhakaFee, outsideDhakaFee, selectedProductList, data?.config?.freeShippingThresholdQuantity]);

  const subtotal = useMemo(() => {
    return selectedProductList.reduce((sum, item) => {
      const price = getProductPrice(item.product);
      return sum + price * item.quantity;
    }, 0);
  }, [selectedProductList, data?.config?.sizePrices]);

  const grandTotal = subtotal + deliveryCharge;

  const scrollToOrderForm = () => {
    const el = document.getElementById("order-form-section") || document.getElementById("section-order-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const whatsappUs = () => {
    const phone = settings?.contact?.whatsAppNumber || settings?.contact?.supportPhone || "8801700000000";
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(`হ্যালো! আমি ${data?.product?.name || "প্রোডাক্ট"} সম্পর্কে জানতে চাই।`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
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
    if (selectedProductList.length === 0) {
      toast.error("কমপক্ষে একটি পণ্য নির্বাচন করুন");
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
        items: selectedProductList.map((item) => {
          const unitPrice = getProductPrice(item.product);
          return {
            productId: item.product.id,
            productName: item.product.name,
            unitPrice: unitPrice,
            quantity: item.quantity,
            variantName: item.selectedSize || "",
            totalPrice: unitPrice * item.quantity,
          };
        }),
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
        <div className="size-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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

  const { product, config } = data;
  const isMarquee = config?.isMarqueeVisible ?? true;
  const marqueeText =
    config?.marqueeText ||
    "🔥 সীমিত স্টক — মাত্র ৩৪টি বাকি! 🚚 সারা বাংলাদেশে ক্যাশ অন ডেলিভারি 💥 আজকের জন্য বিশেষ ছাড় ⚡";
  const isTimer = config?.isTimerVisible ?? true;
  const timerTitle = config?.headerTitle || "অফারটি শেষ হতে মাত্র কিছুক্ষণ বাকি আছে:";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-blue-600/20 pb-20 md:pb-24">
      {/* 1. MODULE: Scrolling Marquee Bar (Arzamart style) */}
      {isMarquee && (
        <div className="bg-slate-900 text-white py-2.5 px-4 overflow-hidden relative border-b border-white/10 text-xs font-semibold z-50">
          <div className="flex whitespace-nowrap animate-marquee">
            <span className="mx-6">{marqueeText}</span>
            <span className="mx-6">{marqueeText}</span>
            <span className="mx-6">{marqueeText}</span>
          </div>
        </div>
      )}

      {/* 2. MODULE: Sticky Countdown Urgency Bar (Arzamart style: Red bg-danger, 4 countdown boxes) */}
      {isTimer && (
        <div className="sticky top-0 z-50 w-full bg-[#dc2626] text-white py-3 md:py-4 px-4 shadow-lg overflow-hidden">
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4">
            <span className="whitespace-pre-line text-base md:text-lg font-bold">
              {timerTitle}
            </span>
            <div className="flex justify-center gap-2 md:gap-3">
              {[
                { val: timeLeft.days, label: "দিন" },
                { val: timeLeft.hours, label: "ঘন্টা" },
                { val: timeLeft.minutes, label: "মিনিট" },
                { val: timeLeft.seconds, label: "সেকেন্ড" },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="flex flex-col items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-white/25 backdrop-blur-xs rounded-md shadow-xs"
                >
                  <span className="text-xl md:text-2xl font-extrabold leading-none">
                    {String(unit.val).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] mt-1 opacity-90">{unit.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Render Active Sections */}
      <main className="min-h-screen">
        {activeSections.map((sec) => {
          switch (sec.type) {
            // MODULE: Hero / Offer (Gradient Purple #2563eb -> #4f46e5 -> #7c3aed)
            case "hero": {
              return (
                <section
                  key={sec.id}
                  id={sec.id}
                  className="py-14 md:py-20 px-4 text-center text-white relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed)",
                  }}
                >
                  <div className="max-w-[800px] mx-auto space-y-5">
                    <p className="text-2xl">🚀</p>
                    <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight whitespace-pre-line leading-tight">
                      {product.name || "একচেটিয়া অফার! আজকের জন্যই সেরা সুযোগ"}
                    </h1>
                    <p className="text-white/90 text-sm md:text-base max-w-xl mx-auto whitespace-pre-line leading-relaxed">
                      {product.shortDescription || product.description || "প্রিমিয়াম কোয়ালিটি এখন সাশ্রয়ী মূল্যে"}
                    </p>
                    <div className="inline-block px-6 py-2 bg-[#fbbf24] text-slate-950 font-bold text-xs md:text-sm rounded-[12px] shadow-md">
                      {config?.promoText || "স্টক ফুরিয়ে যাওয়ার আগেই সংগ্রহ করুন"}
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={scrollToOrderForm}
                        className="bg-white hover:opacity-90 active:scale-95 text-[#2563eb] rounded-full shadow-2xl h-12 px-8 text-base font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                      >
                        <ShoppingBag className="size-5" />
                        <span>অর্ডার করুন এখনই</span>
                      </button>
                    </div>
                  </div>
                </section>
              );
            }

            // MODULE: Product Hero (Gradient Pink or Customizable Hero Background)
            case "product-hero": {
              const customBg = config?.customHeroBgColor;
              const hasCustomBg = Boolean(customBg && customBg !== "#9333ea");

              return (
                <section
                  key={sec.id}
                  id={sec.id}
                  className="overflow-hidden text-white relative py-12 md:py-16 px-4 md:px-8"
                  style={{
                    background: hasCustomBg
                      ? customBg
                      : "linear-gradient(135deg, #7c3aed, #db2777, #be185d)",
                  }}
                >
                  <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Text Content */}
                    <div className="flex flex-col justify-center text-white order-2 lg:order-1 space-y-6">
                      {config?.productDetailsTitle && (
                        <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-300 bg-black/20 px-3.5 py-1 rounded-full backdrop-blur-xs border border-white/10 w-fit">
                          {config.productDetailsTitle}
                        </span>
                      )}
                      <h2 className="text-2xl md:text-4xl font-black whitespace-pre-line leading-tight">
                        🔥 {config?.featuredProductName || product.name}
                      </h2>
                      <div className="text-white/95 text-sm md:text-base whitespace-pre-line leading-relaxed bg-black/15 backdrop-blur-md p-5 rounded-2xl border border-white/15 shadow-inner">
                        {config?.customHeroDescription || product.shortDescription || product.description || "✨ সফট ও কমফোর্টেবল\n✨ স্মার্ট ও এলিগ্যান্ট ডিজাইন\n✨ Regular Fit — ডেইলি ইউজ ও আউটিং এর জন্য পারফেক্ট\n✨ দীর্ঘ সময় পরলেও আরামদায়ক ও স্টাইলিশ লুক"}
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={scrollToOrderForm}
                          className="bg-white hover:opacity-90 active:scale-95 text-[#dc2626] rounded-full shadow-xl h-12 px-8 text-base font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                        >
                          <ShoppingBag className="size-5" />
                          <span>অর্ডার করুন এখনই</span>
                        </button>
                      </div>
                    </div>

                    {/* Image */}
                    <div className="order-1 lg:order-2 flex justify-center">
                      <div className="relative rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black/10 backdrop-blur-xs aspect-square max-w-md w-full">
                        <img
                          src={getImageUrl(config?.customHeroImageUrl || product.imageUrl, "large")}
                          alt={config?.featuredProductName || product.name}
                          width={600}
                          height={600}
                          className="w-full h-full object-contain"
                          onError={handleImageError}
                        />
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <div className="absolute top-4 right-4 bg-[#dc2626] text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-xl border border-white/20">
                            ৳{Math.round(product.compareAtPrice - product.price)} ছাড়
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            }

            // MODULE: Discount CTA (Gradient Green #059669 -> #0d9488)
            case "discount-cta": {
              const mrp = config?.originalPrice || product.compareAtPrice || product.basePrice || product.price;
              const mainSelectedSize = productSelections[product.id]?.selectedSize || "";
              const sizePrice = (mainSelectedSize && config?.sizePrices?.[mainSelectedSize])
                || (mainSelectedSize && product.variants?.find((v) => v.name === mainSelectedSize)?.priceOverride)
                || product.price;
              const hasDiscount = mrp > sizePrice;

              return (
                <section
                  key={sec.id}
                  id={sec.id}
                  className="py-12 md:py-16 px-4 text-center text-white"
                  style={{
                    background: "linear-gradient(135deg, #059669, #0d9488)",
                  }}
                >
                  <div className="max-w-[800px] mx-auto space-y-4">
                    <p className="text-3xl">🎁</p>
                    <h2 className="text-2xl md:text-3xl font-extrabold whitespace-pre-line">
                      {config?.promoText || "অবিশ্বাস্য ডিসকাউন্ট অফার!"}
                    </h2>
                    <p className="text-white/90 text-sm md:text-base whitespace-pre-line leading-relaxed max-w-xl mx-auto">
                      {config?.freeShippingThresholdQuantity
                        ? `যেকোনো ${config.freeShippingThresholdQuantity}টি পণ্য অর্ডার করলেই সম্পূর্ণ ফ্রি ডেলিভারি!`
                        : "আজই অর্ডার করলে পাবেন বিশেষ ছাড় এবং সারা দেশে দ্রুততম ক্যাশ অন ডেলিভারি।"}
                    </p>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      {hasDiscount && (
                        <span className="text-lg text-emerald-200 line-through font-medium">
                          ৳{mrp.toLocaleString()}
                        </span>
                      )}
                      <span className="text-3xl font-black">
                        ৳{sizePrice.toLocaleString()}
                      </span>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={scrollToOrderForm}
                        className="bg-white hover:opacity-90 active:scale-95 text-[#059669] rounded-full shadow-xl h-12 px-8 text-base font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                      >
                        <span>অফারটি গ্রহণ করুন</span>
                      </button>
                    </div>
                  </div>
                </section>
              );
            }

            // MODULE: Info Banner (Gradient Orange #d97706 -> #b45309)
            case "info-banner": {
              return (
                <section
                  key={sec.id}
                  id={sec.id}
                  className="py-12 md:py-16 px-4 text-center text-white"
                  style={{
                    background: "linear-gradient(135deg, #d97706, #b45309)",
                  }}
                >
                  <div className="max-w-[800px] mx-auto space-y-4">
                    <div className="size-16 bg-white/20 rounded-full flex items-center justify-center mx-auto shadow-sm border border-white/20">
                      <Info className="size-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold whitespace-pre-line">
                      {config?.productDetailsTitle || "প্রোডাক্ট ব্যবহারের নিয়মাবলী ও গুণগত মান"}
                    </h2>
                    <p className="text-white text-base md:text-lg font-medium leading-relaxed max-w-xl mx-auto whitespace-pre-line">
                      {config?.trustBannerDescription || "আমাদের প্রতিটি পণ্য ১০০% প্রিমিয়াম কোয়ালিটি সম্পন্ন এবং অত্যন্ত নিখুঁত ফিনিশিং সমৃদ্ধ।"}
                    </p>
                  </div>
                </section>
              );
            }

            // MODULE: Trust Banner (Arzamart style: bg-slate-900, 100% বিশ্বস্ততা, gold icon)
            case "trust-banner": {
              return (
                <section key={sec.id} id={sec.id} className="py-10 bg-slate-900 text-white border-y border-white/10">
                  <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
                    <div className="flex items-center gap-4">
                      <div className="size-16 bg-white/10 rounded-full flex items-center justify-center shrink-0">
                        <ShieldCheck className="size-8 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-amber-400">১০০% বিশ্বস্ততা</h3>
                        <p className="text-white/60 text-xs">হাজারো গ্রাহকের আস্থার প্রতীক</p>
                      </div>
                    </div>
                    <div className="h-px w-20 bg-white/10 hidden md:block" />
                    <p className="max-w-[500px] text-base md:text-lg italic text-white/90 whitespace-pre-line">
                      "{config?.trustBannerText || "দেখে চেক করে রিসিভ করতে পারবেন। পছন্দ না হলে ডেলিভারি চার্জ দিয়ে রিটার্ন করে দিতে পারবেন সহজেই।"}"
                    </p>
                  </div>
                </section>
              );
            }

            // MODULE: Product Selection (Arzamart Card Design with Top-Left Checkbox, Top-Right OFF badge, Size & Qty)
            case "product-select": {
              return (
                <section key={sec.id} id="product-select-section" className="py-14 md:py-20 px-4 md:px-8 bg-background border-b border-border">
                  <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-10 md:mb-12">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">
                        পণ্য নির্বাচন করুন
                      </h2>
                      <p className="text-muted-foreground font-medium text-sm">
                        চেকবক্সে ক্লিক করে পণ্য নির্বাচন করুন
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                      {allSelectableProducts.map((p) => {
                        const isSelected = isProductSelected(p);
                        const qty = getProductQuantity(p);
                        const selectedSize = getSelectedSize(p);
                        const uniqueSizes = getUniqueSizes(p);
                        const hasDiscount = p.compareAtPrice && p.compareAtPrice > p.price;

                        return (
                          <div
                            key={p.id}
                            className={`relative p-4 sm:p-5 transition-all duration-300 border-2 rounded-xl flex flex-col justify-between ${
                              isSelected
                                ? "border-blue-600 shadow-[0_10px_30px_rgba(37,99,235,0.15)] bg-card ring-1 ring-blue-600/30"
                                : "border-border bg-card hover:border-border/80 shadow-xs"
                            }`}
                          >
                            {/* Top-Left Arzamart Checkbox */}
                            <div
                              className="absolute -top-3 -left-3 z-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProductCheck(p);
                              }}
                            >
                              <div
                                className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 transition-all duration-200 cursor-pointer shadow-md ${
                                  isSelected
                                    ? "bg-blue-600 border-blue-600 text-white scale-105"
                                    : "bg-card border-border text-transparent hover:border-blue-500"
                                }`}
                              >
                                <Check className={`size-4 stroke-[3] ${isSelected ? "opacity-100" : "opacity-0"}`} />
                              </div>
                            </div>

                            {/* Top-Right OFF Badge */}
                            {hasDiscount && (
                              <div className="absolute top-3 right-3 z-10 bg-[#dc2626] text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-xs">
                                ৳{(p.compareAtPrice! - p.price)} OFF
                              </div>
                            )}

                            {/* Product Image with Details Overlay */}
                            <div
                              className="cursor-pointer mb-4 group relative overflow-hidden rounded-lg bg-muted/30 border border-border"
                              onClick={(e) => {
                                e.stopPropagation();
                                openProductDetails(p);
                              }}
                            >
                              <img
                                src={getImageUrl(p.imageUrl, "medium")}
                                alt={p.name}
                                width={300}
                                height={240}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-[180px] sm:h-[220px] object-contain transition-transform duration-300 group-hover:scale-105"
                                onError={handleImageError}
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="bg-background/95 text-foreground px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg">
                                  বিস্তারিত
                                </span>
                              </div>
                            </div>

                            {/* Title & Price */}
                            <div className="space-y-1 mb-4">
                              <h4 className="text-sm font-bold text-foreground line-clamp-1">
                                {p.name}
                              </h4>
                              <div className="flex items-center gap-2">
                                <span className="text-blue-600 dark:text-blue-400 font-bold text-base whitespace-nowrap">
                                  ৳{getProductPrice(p).toLocaleString()}
                                </span>
                                {hasDiscount && (
                                  <span className="text-muted-foreground line-through text-xs whitespace-nowrap">
                                    ৳{p.compareAtPrice!.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Size Selection (Arzamart buttons) */}
                            {uniqueSizes.length > 0 && (
                              <div className="mb-4">
                                <p className="text-muted-foreground mb-2 text-[10px] uppercase font-bold tracking-widest">
                                  সাইজ সিলেক্ট করুন
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {uniqueSizes.map((size) => {
                                    const isSizeActive = selectedSize === size;
                                    return (
                                      <button
                                        key={size}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          selectProductSize(p, size);
                                        }}
                                        className={`w-9 h-9 flex items-center justify-center transition-all border text-xs font-bold rounded-sm cursor-pointer ${
                                          isSizeActive
                                            ? "bg-blue-600 text-white border-blue-600 shadow-md scale-105"
                                            : "bg-transparent text-foreground border-border hover:border-blue-400"
                                        }`}
                                      >
                                        {size}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Quantity Selection (Arzamart counter) */}
                            <div className="flex items-center justify-between pt-3 border-t border-border/70">
                              <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">
                                Qty
                              </span>
                              <div className="flex items-center border border-border rounded-md overflow-hidden bg-background">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateProductQuantity(p, -1);
                                  }}
                                  className="w-9 h-9 flex items-center justify-center hover:bg-muted text-foreground text-sm font-bold cursor-pointer"
                                >
                                  -
                                </button>
                                <div className="w-9 h-9 flex items-center justify-center font-bold text-sm text-foreground">
                                  {qty || 1}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateProductQuantity(p, 1);
                                  }}
                                  className="w-9 h-9 flex items-center justify-center hover:bg-muted text-foreground text-sm font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            }

            // MODULE: Customer Reviews (Arzamart style)
            case "reviews": {
              return (
                <section key={sec.id} id={sec.id} className="py-14 md:py-20 px-4 md:px-8 bg-background border-t border-border">
                  <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-10">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">
                        Customer Reviews
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        আমাদের গ্রাহকরা কী বলছেন
                      </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      {[
                        {
                          name: "তানভীর হাসান",
                          rating: 5,
                          comment: "কোয়ালিটি খুবই ভালো! সময়মতো ডেলিভারি পেয়েছি এবং কাপড়ের ফিনিশিং প্রিমিয়াম ছিল।",
                        },
                        {
                          name: "ফারহানা আক্তার",
                          rating: 5,
                          comment: "ছবিতে যেমন দেখেছি হুবহু তেমনই পেয়েছি। রিটার্ন সুবিধার ভরসা থাকায় নিশ্চিন্তে অর্ডার করেছিলাম।",
                        },
                        {
                          name: "মো: রাশেদুল ইসলাম",
                          rating: 5,
                          comment: "ক্যাশ অন ডেলিভারিতে চেক করে নেওয়ার সুবিধাটা দারুণ। সার্ভিস ও ব্যবহার খুব চমৎকার!",
                        },
                      ].map((rev, idx) => (
                        <div
                          key={idx}
                          className="p-6 bg-card rounded-xl border border-border hover:border-blue-500/30 transition-colors shadow-xs space-y-3"
                        >
                          <div className="flex items-center gap-1 text-amber-400">
                            {[...Array(rev.rating)].map((_, i) => (
                              <Star key={i} className="size-4 fill-current" />
                            ))}
                          </div>
                          <p className="text-foreground text-sm font-medium leading-relaxed">
                            "{rev.comment}"
                          </p>
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <p className="text-muted-foreground text-xs font-semibold">{rev.name}</p>
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold">
                              <CheckCircle2 className="size-3.5" />
                              Verified
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            // MODULE: Custom Sections (Layouts A-E)
            case "custom": {
              return (
                <CustomSectionRenderer
                  key={sec.id}
                  section={sec}
                  onScrollToOrder={scrollToOrderForm}
                />
              );
            }

            // MODULE: Order Form (Arzamart Clean Card Box with Full Cart Summary & Direct Submit)
            case "order-form": {
              return (
                <section key={sec.id} id="order-form-section" className="py-16 px-4 bg-muted/20 border-t border-border">
                  <div className="w-full max-w-[550px] mx-auto bg-card shadow-2xl border border-border rounded-[24px] p-6 md:p-8">
                    <h2 className="text-2xl font-extrabold text-foreground mb-2 text-center">
                      অর্ডার করুন
                    </h2>
                    <p className="text-xs md:text-sm text-muted-foreground text-center mb-6 leading-relaxed">
                      অর্ডার করতে নিচের ফর্মে আপনার নাম, পূর্ণ ঠিকানা ও মোবাইল নম্বর লিখে "অর্ডার সম্পন্ন করুন" বাটনে ক্লিক করুন
                    </p>

                    {/* Product Cart inside Order Form */}
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-foreground mb-3">
                        আপনার কার্ট ({selectedProductList.length}টি পণ্য):
                      </h3>

                      <div className="space-y-3">
                        {selectedProductList.map((s) => (
                          <div
                            key={s.product.id}
                            className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-xl"
                          >
                            <img
                              src={getImageUrl(s.product.imageUrl, "thumb")}
                              alt={s.product.name}
                              width={56}
                              height={56}
                              className="w-14 h-14 object-contain rounded-lg bg-background border border-border shrink-0"
                              onError={handleImageError}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">
                                {s.product.name}
                              </p>
                              {s.selectedSize && (
                                <p className="text-[11px] text-muted-foreground">
                                  সাইজ: {s.selectedSize} × {s.quantity}
                                </p>
                              )}
                              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                ৳{getProductPrice(s.product).toLocaleString()} × {s.quantity}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => updateProductQuantity(s.product, -1)}
                                className="w-7 h-7 flex items-center justify-center rounded-full border border-border hover:bg-muted text-foreground text-sm font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-foreground">
                                {s.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateProductQuantity(s.product, 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-full border border-border hover:bg-muted text-foreground text-sm font-bold cursor-pointer"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSelections(s.product, 0)}
                                className="w-7 h-7 flex items-center justify-center rounded-full text-rose-600 hover:bg-rose-500/10 text-sm ml-1 cursor-pointer font-bold"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}

                        {selectedProductList.length === 0 && (
                          <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
                            <p className="text-xs text-muted-foreground italic mb-2">
                              কোনো পণ্য নির্বাচন করা হয়নি
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById("product-select-section");
                                if (el) el.scrollIntoView({ behavior: "smooth" });
                              }}
                              className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                            >
                              উপরে গিয়ে পণ্য নির্বাচন করুন
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <form onSubmit={handlePlaceOrder} className="space-y-5">
                      {/* Delivery Area select */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-semibold text-foreground">
                          ডেলিভারি এলাকা *
                        </label>
                        <select
                          value={selectedCity}
                          onChange={(e) => handleCityChange(e.target.value)}
                          className="w-full h-12 px-3.5 bg-background border border-border rounded-xl text-xs md:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:border-blue-600"
                        >
                          <option value="Dhaka">ঢাকার ভিতরে (Inside Dhaka) - ৳{insideDhakaFee}</option>
                          <option value="Outside Dhaka">ঢাকার বাইরে (Outside Dhaka) - ৳{outsideDhakaFee}</option>
                        </select>
                      </div>

                      {/* Price Summary Box */}
                      <div className="bg-muted/40 border border-border rounded-2xl p-4 md:p-5 space-y-2.5 text-xs">
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>সাবটোটাল:</span>
                          <span className="font-bold text-foreground">
                            ৳{subtotal.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>ডেলিভারি চার্জ:</span>
                          <span className="font-bold text-foreground">
                            {deliveryCharge === 0 ? "ফ্রি" : `৳${deliveryCharge}`}
                          </span>
                        </div>
                        <div className="border-t border-border my-1" />
                        <div className="flex justify-between items-center text-foreground font-extrabold text-sm md:text-base">
                          <span>সর্বমোট প্রদেয় বিল:</span>
                          <span className="text-blue-600 dark:text-blue-400 text-lg font-black">
                            ৳{grandTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Name Input */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-semibold text-foreground">নাম *</label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="আপনার নাম লিখুন"
                          className="w-full h-12 px-3.5 bg-background border border-border rounded-xl text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:border-blue-600"
                        />
                      </div>

                      {/* Mobile Input */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-semibold text-foreground">
                          মোবাইল নম্বর * (১১ ডিজিট)
                        </label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full h-12 px-3.5 bg-background border border-border rounded-xl text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:border-blue-600"
                        />
                      </div>

                      {/* Full Address Input */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-semibold text-foreground">
                          সম্পূর্ণ ঠিকানা *
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="বাসা/রোড নম্বর, এলাকা, জেলা"
                          className="w-full p-3.5 bg-background border border-border rounded-xl text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:border-blue-600 resize-none leading-relaxed"
                        />
                      </div>

                      {/* Submit Button (Arzamart style: Red bg-danger pill) */}
                      <button
                        type="submit"
                        disabled={isSubmitting || selectedProductList.length === 0}
                        className="w-full h-12 mt-2 bg-[#dc2626] hover:bg-[#b91c1c] active:scale-95 text-white font-bold text-base rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>অর্ডার প্রক্রিয়াকরণ...</span>
                          </>
                        ) : (
                          <span>অর্ডার সম্পন্ন করুন (৳{grandTotal.toLocaleString()})</span>
                        )}
                      </button>
                    </form>
                  </div>
                </section>
              );
            }

            default:
              return null;
          }
        })}
      </main>

      {/* 4. Footer */}
      <footer className="py-10 bg-slate-900 text-white/50 text-center text-xs space-y-1">
        <p>© {new Date().getFullYear()} {settings?.general?.websiteName || "ALZEENA"} · Built with Modular Design</p>
      </footer>

      {/* 5. STICKY BOTTOM BAR (Arzamart WhatsApp + Order CTA) */}
      <div className="fixed bottom-4 left-0 right-0 px-3 md:px-10 w-full flex justify-between gap-2 md:gap-3 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={whatsappUs}
            className="bg-[#25D366] hover:opacity-90 active:scale-95 text-white flex items-center gap-2 rounded-full shadow-2xl hover:-translate-y-0.5 transition-all cursor-pointer h-11 md:h-13 px-4 md:px-8 text-xs md:text-sm font-bold border-2 border-white/30"
          >
            <MessageCircle className="size-4 md:size-5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </div>
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={scrollToOrderForm}
            className="bg-[#dc2626] hover:bg-[#b91c1c] active:scale-95 text-white flex items-center justify-center gap-2 rounded-full shadow-2xl hover:-translate-y-0.5 transition-all h-11 md:h-13 px-6 md:px-10 text-xs md:text-sm font-bold border-2 border-white/30 cursor-pointer"
          >
            <ShoppingBag className="size-4 md:size-5" />
            <span>অর্ডার করুন এখনই</span>
          </button>
        </div>
      </div>

      {/* 6. Quick Details Modal */}
      {showDetailsModal && selectedProductForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowDetailsModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-5" />
            </button>

            <div className="aspect-square max-w-[240px] mx-auto rounded-xl overflow-hidden bg-muted/20 border border-border">
              <img
                src={getImageUrl(selectedProductForDetails.imageUrl, "large")}
                alt={selectedProductForDetails.name}
                width={300}
                height={300}
                className="w-full h-full object-contain"
                onError={handleImageError}
              />
            </div>

            <div className="space-y-1 text-center">
              <h3 className="text-lg font-bold text-foreground">
                {selectedProductForDetails.name}
              </h3>
              <p className="text-blue-600 font-extrabold text-lg">
                ৳{getProductPrice(selectedProductForDetails).toLocaleString()}
              </p>
            </div>

            {selectedProductForDetails.description && (
              <p className="text-xs text-muted-foreground leading-relaxed max-h-32 overflow-y-auto whitespace-pre-line bg-muted/20 p-3 rounded-lg border border-border/50">
                {selectedProductForDetails.description}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                toggleProductCheck(selectedProductForDetails);
                setShowDetailsModal(false);
              }}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all text-sm cursor-pointer"
            >
              {isProductSelected(selectedProductForDetails) ? "পণ্যটি যোগ করা আছে" : "পণ্যটি নির্বাচন করুন"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
