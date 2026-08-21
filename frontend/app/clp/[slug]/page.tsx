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
import { products as staticProducts, getColorHex } from "@/lib/shop-data";
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
  colors?: string[];
  isPreOrder?: boolean;
}

interface ProductSelectionState {
  [productId: string]: {
    quantity: number;
    selectedSize: string;
    selectedColor: string;
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

  // Selection State
  const [productSelections, setProductSelections] = useState<ProductSelectionState>({});
  const [lastSelectedSizes, setLastSelectedSizes] = useState<{ [productId: string]: string }>({});
  const [lastSelectedColors, setLastSelectedColors] = useState<{ [productId: string]: string }>({});

  // Quick Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<UnifiedProduct | null>(null);
  const [modalActiveImg, setModalActiveImg] = useState<string>("");
  const [modalSelectedSize, setModalSelectedSize] = useState<string>("");
  const [modalSelectedColor, setModalSelectedColor] = useState<string>("");
  const [modalQty, setModalQty] = useState<number>(1);

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
            const fallbackColors = rawProduct.colors && rawProduct.colors.length > 0
              ? rawProduct.colors
              : ["Black", "White", "Navy", "Olive", "Maroon"];

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
                colors: fallbackColors,
              },
              config: null,
            };
          }
        } else if (pageData.product) {
          if (!pageData.product.imageUrl) {
            const firstImg = pageData.product.images?.find((i) => i.isMain)?.imageUrl || pageData.product.images?.[0]?.imageUrl || "";
            if (firstImg) {
              pageData.product.imageUrl = firstImg;
            }
          }
          if (!pageData.product.colors || pageData.product.colors.length === 0) {
            const matchedStatic = staticProducts.find((sp) => sp.slug === pageData?.product.slug || sp.id === pageData?.product.id || sp.name.toLowerCase() === pageData?.product.name.toLowerCase());
            pageData.product.colors = matchedStatic?.colors || ["Black", "White", "Navy", "Olive", "Maroon"];
          }
        }

        // Also fetch other active products from store so customer can always pick additional products
        try {
          const prodsRes = await productsService.getAll();
          if (Array.isArray(prodsRes) && prodsRes.length > 0) {
            const currentProdId = pageData?.product?.id;
            const extraProds: RelatedProductItem[] = prodsRes
              .filter((p) => p.id !== currentProdId && p.slug !== slug)
              .map((p) => ({
                id: p.id || p.slug,
                name: p.name,
                slug: p.slug,
                price: p.price,
                compareAtPrice: p.compareAt || null,
                imageUrl: p.image || (p.images?.[0] ?? ""),
                variants: (p.sizes || []).map((s) => ({
                  id: s,
                  name: s,
                  stockQuantity: p.sizeStock?.[s] ?? 10,
                  priceOverride: p.sizePrices?.[s],
                })),
                colors: p.colors || staticProducts.find((sp) => sp.slug === p.slug || sp.id === p.id)?.colors || ["Black", "White", "Navy", "Olive", "Maroon"],
              }));

            if (pageData) {
              if (!pageData.relatedProducts || pageData.relatedProducts.length === 0) {
                pageData.relatedProducts = extraProds;
              } else {
                extraProds.forEach((ep) => {
                  if (!pageData?.relatedProducts?.some((rp) => rp.id === ep.id)) {
                    pageData?.relatedProducts?.push(ep);
                  }
                });
              }
            }
          }
        } catch {
          const currentProdId = pageData?.product?.id;
          const staticFallback: RelatedProductItem[] = staticProducts
            .filter((p) => (p.id || p.slug) !== currentProdId && p.slug !== slug)
            .map((p) => ({
              id: p.id || p.slug,
              name: p.name,
              slug: p.slug,
              price: p.price,
              compareAtPrice: p.compareAt || null,
              imageUrl: p.image || p.images?.[0] || "",
              variants: (p.sizes || []).map((s) => ({ id: s, name: s, stockQuantity: 10 })),
              colors: p.colors || ["Black", "White", "Navy", "Olive", "Maroon"],
            }));

          if (pageData && (!pageData.relatedProducts || pageData.relatedProducts.length === 0)) {
            pageData.relatedProducts = staticFallback;
          }
        }

        setData(pageData);
        setSettings(siteSettings);

        if (pageData?.product) {
          const mainProdColors = pageData.product.colors || staticProducts.find((sp) => sp.slug === pageData?.product.slug || sp.id === pageData?.product.id)?.colors || ["Black", "White", "Navy", "Olive", "Maroon"];
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
            colors: mainProdColors,
          };
          const firstSize = mainProd.variants?.[0]?.name || "";
          const firstColor = mainProd.colors?.[0] || "";

          setProductSelections({
            [mainProd.id]: {
              quantity: 1,
              selectedSize: firstSize,
              selectedColor: firstColor,
              product: mainProd,
            },
          });
          if (firstSize) {
            setLastSelectedSizes({ [mainProd.id]: firstSize });
          }
          if (firstColor) {
            setLastSelectedColors({ [mainProd.id]: firstColor });
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

  // All selectable products pool (Main Product + Admin Configured Selected Products)
  const allSelectableProducts = useMemo(() => {
    if (!data?.product) return [];
    const mainProdColors = data.product.colors || staticProducts.find((sp) => sp.slug === data.product.slug || sp.id === data.product.id || sp.name.toLowerCase() === data.product.name.toLowerCase())?.colors || ["Black", "White", "Navy", "Olive", "Maroon"];
    const mainProd: UnifiedProduct = {
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
      colors: mainProdColors,
    };

    const list: UnifiedProduct[] = [mainProd];

    // Check if admin has explicitly selected products for the product-select section
    const prodSec = activeSections.find((s) => s.type === "product-select");
    const configuredProductIds = (prodSec?.settings?.selectedProductIds as string[]) || [];

    if (configuredProductIds.length > 0) {
      // If admin configured specific products, include ONLY those matching selectedProductIds (plus main product is always first)
      if (data.relatedProducts && data.relatedProducts.length > 0) {
        data.relatedProducts.forEach((rp) => {
          const isMatched = configuredProductIds.includes(rp.id) || (rp.slug && configuredProductIds.includes(rp.slug));
          if (isMatched && !list.some((item) => item.id === rp.id || (rp.slug && item.slug === rp.slug))) {
            const rpColors = rp.colors || staticProducts.find((sp) => sp.slug === rp.slug || sp.id === rp.id || sp.name.toLowerCase() === rp.name.toLowerCase())?.colors || ["Black", "White", "Navy", "Olive", "Maroon"];
            list.push({
              id: rp.id,
              name: rp.name,
              slug: rp.slug,
              price: rp.price,
              compareAtPrice: rp.compareAtPrice || null,
              imageUrl: rp.imageUrl,
              variants: rp.variants,
              colors: rpColors,
            });
          }
        });
      }
    }

    return list;
  }, [data, activeSections]);

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

  const getSelectedColor = (p: UnifiedProduct): string => {
    return productSelections[p.id]?.selectedColor || lastSelectedColors[p.id] || p.colors?.[0] || getUniqueColors(p)[0] || "";
  };

  const getUniqueColors = (p: UnifiedProduct): string[] => {
    if (p.colors && p.colors.length > 0) return p.colors;
    const staticMatch = staticProducts.find((sp) => sp.slug === p.slug || sp.id === p.id || sp.name.toLowerCase() === p.name.toLowerCase());
    if (staticMatch?.colors && staticMatch.colors.length > 0) return staticMatch.colors;
    return ["Black", "White", "Navy", "Olive", "Maroon"];
  };

  const updateSelections = (product: UnifiedProduct, quantity: number, size?: string, color?: string) => {
    setProductSelections((prev) => {
      const current = prev[product.id];
      const newSize = size !== undefined ? size : (current?.selectedSize || lastSelectedSizes[product.id] || product.variants?.[0]?.name || "");
      const newColor = color !== undefined ? color : (current?.selectedColor || lastSelectedColors[product.id] || product.colors?.[0] || getUniqueColors(product)[0] || "");

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
          selectedColor: newColor,
          product,
        },
      };
    });
  };

  const toggleProductCheck = (p: UnifiedProduct) => {
    const currentQty = productSelections[p.id]?.quantity ?? 0;
    const currentSize = productSelections[p.id]?.selectedSize || lastSelectedSizes[p.id] || p.variants?.[0]?.name || "";
    const currentColor = productSelections[p.id]?.selectedColor || lastSelectedColors[p.id] || p.colors?.[0] || getUniqueColors(p)[0] || "";

    if (currentQty > 0) {
      if (currentSize) {
        setLastSelectedSizes((prev) => ({ ...prev, [p.id]: currentSize }));
      }
      if (currentColor) {
        setLastSelectedColors((prev) => ({ ...prev, [p.id]: currentColor }));
      }
      updateSelections(p, 0);
    } else {
      const rememberedSize = lastSelectedSizes[p.id] || p.variants?.[0]?.name || "";
      const rememberedColor = lastSelectedColors[p.id] || p.colors?.[0] || getUniqueColors(p)[0] || "";
      updateSelections(p, 1, rememberedSize, rememberedColor);
    }
  };

  const selectProductSize = (p: UnifiedProduct, size: string) => {
    setLastSelectedSizes((prev) => ({ ...prev, [p.id]: size }));
    const currentQty = productSelections[p.id]?.quantity ?? 0;
    const currentColor = getSelectedColor(p);
    updateSelections(p, currentQty > 0 ? currentQty : 1, size, currentColor);
  };

  const selectProductColor = (p: UnifiedProduct, color: string) => {
    setLastSelectedColors((prev) => ({ ...prev, [p.id]: color }));
    const currentQty = productSelections[p.id]?.quantity ?? 0;
    const currentSize = getSelectedSize(p);
    updateSelections(p, currentQty > 0 ? currentQty : 1, currentSize, color);
  };

  const updateProductQuantity = (p: UnifiedProduct, delta: number) => {
    const currentQty = productSelections[p.id]?.quantity ?? 0;
    const newQty = Math.max(0, currentQty + delta);
    const size = getSelectedSize(p);
    const color = getSelectedColor(p);
    updateSelections(p, newQty, size, color);
  };

  const selectedProductList = useMemo(() => {
    return Object.values(productSelections).filter((s) => s.quantity > 0);
  }, [productSelections]);

  const openProductDetails = (p: UnifiedProduct) => {
    setSelectedProductForDetails(p);
    const firstImg = p.imageUrl || p.images?.[0]?.imageUrl || "";
    setModalActiveImg(firstImg);
    const currSize = getSelectedSize(p);
    const currColor = getSelectedColor(p);
    const currQty = getProductQuantity(p) || 1;
    setModalSelectedSize(currSize);
    setModalSelectedColor(currColor);
    setModalQty(currQty);
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
          const variantParts = [item.selectedColor, item.selectedSize].filter(Boolean);
          return {
            productId: item.product.id,
            productName: item.product.name,
            unitPrice: unitPrice,
            quantity: item.quantity,
            color: item.selectedColor || "",
            size: item.selectedSize || "",
            variantName: variantParts.join(" - ") || item.selectedSize || "",
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

  const { product, config } = data;
  const isMarquee = config?.isMarqueeVisible ?? true;
  const marqueeText =
    config?.marqueeText ||
    "🔥 সীমিত স্টক — মাত্র ৩৪টি বাকি! 🚚 সারা বাংলাদেশে ক্যাশ অন ডেলিভারি 💥 আজকের জন্য বিশেষ ছাড় ⚡";
  const isTimer = config?.isTimerVisible ?? true;
  const timerTitle = config?.headerTitle || "অফারটি শেষ হতে মাত্র কিছুক্ষণ বাকি আছে:";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* 1. Scrolling Marquee Bar (Previous gradient design) */}
      {isMarquee && (
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-primary text-white py-1.5 md:py-2 px-3 md:px-4 overflow-hidden relative shadow-sm text-[11px] md:text-sm font-bold">
          <div className="flex whitespace-nowrap animate-marquee">
            <span className="mx-3 md:mx-4">{marqueeText}</span>
            <span className="mx-3 md:mx-4">{marqueeText}</span>
            <span className="mx-3 md:mx-4">{marqueeText}</span>
          </div>
        </div>
      )}

      {/* 2. Sticky Countdown Urgency Bar (New red design with 4 units: Days, Hours, Minutes, Seconds) */}
      {isTimer && (
        <div className="sticky top-0 z-50 w-full bg-[#dc2626] text-white py-1.5 md:py-2 px-4 shadow-lg overflow-hidden">
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3">
            <span className="whitespace-pre-line text-xs md:text-sm font-bold">
              {timerTitle}
            </span>
            <div className="flex justify-center gap-1.5 md:gap-2">
              {[
                { val: timeLeft.days, label: "দিন" },
                { val: timeLeft.hours, label: "ঘন্টা" },
                { val: timeLeft.minutes, label: "মিনিট" },
                { val: timeLeft.seconds, label: "সেকেন্ড" },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="flex flex-col items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-white/25 backdrop-blur-xs rounded-md shadow-xs"
                >
                  <span className="text-sm md:text-lg font-extrabold leading-none">
                    {String(unit.val).padStart(2, "0")}
                  </span>
                  <span className="text-[9px] md:text-[10px] mt-0.5 opacity-90">{unit.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Render Active Sections */}
      <main className="divide-y divide-border/60">
        {activeSections.map((sec) => {
          switch (sec.type) {
            // Previous Hero Section Design
            case "hero": {
              const heroIdx = activeSections.findIndex((s) => s.id === sec.id);
              const nextSec = activeSections.slice(heroIdx + 1).find((s) => s.visible);
              const nextSectionId = nextSec ? `section-${nextSec.id}` : "section-order-form";

              return (
                <section
                  key={sec.id}
                  id={`section-${sec.id}`}
                  className="py-8 md:py-12 px-4 bg-gradient-to-b from-primary/5 to-transparent text-center"
                >
                  <div className="max-w-3xl mx-auto space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-bold border border-primary/20">
                      <Sparkles className="size-4" />
                      <span>{config?.promoText || "🔥 বিশেষ ধামাকা অফার!"}</span>
                    </div>

                    <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight leading-snug">
                      {product.name}
                    </h1>

                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
                      {product.shortDescription || product.description || "প্রিমিয়াম কোয়ালিটি এবং আধুনিক ডিজাইনের নির্ভরযোগ্য সমাধান। আজই সীমিত মূল্যে অর্ডার করুন!"}
                    </p>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(nextSectionId) || document.getElementById("section-order-form");
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

            // Previous Product Hero Section Design (with customHeroBgColor & reference image layout)
            case "product-hero": {
              const heroBgColor = config?.customHeroBgColor || "#9333ea";
              const isDefaultPurple = !config?.customHeroBgColor || config.customHeroBgColor.toLowerCase() === "#9333ea" || config.customHeroBgColor.toLowerCase() === "#a855f7";

              return (
                <section
                  key={sec.id}
                  id={`section-${sec.id}`}
                  className="py-12 md:py-16 px-4 md:px-8 text-white relative overflow-hidden transition-colors"
                  style={{
                    backgroundColor: heroBgColor,
                    backgroundImage: isDefaultPurple
                      ? "radial-gradient(circle at 20% 50%, rgba(217, 70, 239, 0.3) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.4) 0%, transparent 60%)"
                      : undefined,
                  }}
                >
                  <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-14 items-center">
                    {/* Left: Product Details & Description */}
                    <div className="space-y-6 order-2 md:order-1">
                      <div>
                        {config?.productDetailsTitle && (
                          <span className="inline-block text-xs font-bold uppercase tracking-widest text-amber-300 bg-black/20 px-3 py-1 rounded-full backdrop-blur-xs border border-white/10 mb-2">
                            {config.productDetailsTitle}
                          </span>
                        )}
                        <h2 className="text-2xl md:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-xs">
                          🔥 {config?.featuredProductName || product.name}
                        </h2>
                      </div>

                      {/* Description / Feature Points */}
                      <div className="text-sm md:text-base text-white/95 leading-relaxed whitespace-pre-line bg-black/15 backdrop-blur-md p-5 rounded-2xl border border-white/15 shadow-inner">
                        {config?.customHeroDescription || product.shortDescription || product.description || "✨ সফট ও কমফোর্টেবল\n✨ স্মার্ট ও এলিগ্যান্ট ডিজাইন\n✨ Regular Fit — ডেইলি ইউজ ও আউটিং এর জন্য পারফেক্ট\n✨ দীর্ঘ সময় পরলেও আরামদায়ক ও স্টাইলিশ লুক"}
                      </div>

                      {/* CTA Order Button */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={scrollToOrderForm}
                          className="bg-white text-purple-900 hover:bg-slate-100 font-extrabold px-8 py-3.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-base flex items-center justify-center gap-2 cursor-pointer border-2 border-white/50"
                        >
                          <ShoppingBag className="size-5 text-purple-700" />
                          <span>অর্ডার করতে ক্লিক করুন</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: Product Showcase Poster/Image */}
                    <div className="order-1 md:order-2 flex justify-center">
                      <div className="relative rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black/10 backdrop-blur-xs aspect-[4/5] sm:aspect-square max-w-md w-full">
                        {(config?.customHeroImageUrl || product.imageUrl) ? (
                          <img
                            src={getImageUrl(config?.customHeroImageUrl || product.imageUrl, "large")}
                            alt={config?.featuredProductName || product.name}
                            width={600}
                            height={600}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/70">
                            <Package className="size-16" />
                          </div>
                        )}

                        {/* Discount Badge */}
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <div className="absolute top-4 right-4 bg-rose-600 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-xl flex items-center gap-1 border border-white/20">
                            <BadgePercent className="size-4" />
                            <span>
                              ৳{Math.round(product.compareAtPrice - product.price)} ছাড়
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              );
            }

            // Previous Discount CTA Design
            case "discount-cta": {
              const mrp = config?.originalPrice || product.compareAtPrice || product.basePrice || product.price;
              const mainSelectedSize = productSelections[product.id]?.selectedSize || "";
              const sizePrice = (mainSelectedSize && config?.sizePrices?.[mainSelectedSize])
                || (mainSelectedSize && product.variants?.find((v) => v.name === mainSelectedSize)?.priceOverride)
                || product.price;
              const hasDiscount = mrp > sizePrice;
              const discountPercent = hasDiscount ? Math.round(((mrp - sizePrice) / mrp) * 100) : 0;

              return (
                <section
                  key={sec.id}
                  id={`section-${sec.id}`}
                  className="py-8 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-center"
                >
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
                    {mainSelectedSize && (
                      <p className="text-xs text-emerald-200">
                        সাইজ: <span className="font-bold text-white">{mainSelectedSize}</span>
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

            // Previous Trust Banner Design
            case "trust-banner": {
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
            }

            // Previous Info Banner Design
            case "info-banner": {
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
            }

            // Product Selection: Keeping New Card Design & Interactive Size/Qty logic
            case "product-select": {
              return (
                <section key={sec.id} id={`section-${sec.id}`} className="py-14 md:py-20 px-4 md:px-8 bg-background border-b border-border">
                  <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-10 md:mb-12">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">
                        {(sec.settings?.sectionTitle as string) || "পণ্য নির্বাচন করুন"}
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
                        const selectedColor = getSelectedColor(p);
                        const uniqueColors = getUniqueColors(p);
                        const hasDiscount = p.compareAtPrice && p.compareAtPrice > p.price;

                        return (
                          <div
                            key={p.id}
                            className={`relative p-4 sm:p-5 transition-all duration-300 border-2 rounded-xl flex flex-col justify-between ${
                              isSelected
                                ? "border-primary shadow-[0_10px_30px_rgba(37,99,235,0.15)] bg-card ring-1 ring-primary/30"
                                : "border-border bg-card hover:border-border/80 shadow-xs"
                            }`}
                          >
                            {/* Top-Left Checkbox */}
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
                                    ? "bg-primary border-primary text-primary-foreground scale-105"
                                    : "bg-card border-border text-transparent hover:border-primary"
                                }`}
                              >
                                <Check className={`size-4 stroke-[3] ${isSelected ? "opacity-100" : "opacity-0"}`} />
                              </div>
                            </div>

                            {/* Top-Right OFF Badge */}
                            {hasDiscount && (
                              <div className="absolute top-3 right-3 z-10 bg-rose-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-xs">
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
                                <span className="text-primary font-bold text-base whitespace-nowrap">
                                  ৳{getProductPrice(p).toLocaleString()}
                                </span>
                                {hasDiscount && (
                                  <span className="text-muted-foreground line-through text-xs whitespace-nowrap">
                                    ৳{p.compareAtPrice!.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Color Selection */}
                            {uniqueColors.length > 0 && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">
                                    কালার সিলেক্ট করুন
                                  </p>
                                  {selectedColor && (
                                    <span className="text-[11px] font-bold text-primary">
                                      {selectedColor}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {uniqueColors.map((col) => {
                                    const isColorActive = selectedColor === col;
                                    const colHex = getColorHex(col);
                                    return (
                                      <button
                                        key={col}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          selectProductColor(p, col);
                                        }}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                                          isColorActive
                                            ? "bg-primary text-primary-foreground border-primary shadow-xs scale-105"
                                            : "bg-card text-foreground border-border hover:border-primary/50"
                                        }`}
                                      >
                                        <span
                                          className="size-2.5 rounded-full border border-black/20 shrink-0"
                                          style={{ backgroundColor: colHex }}
                                        />
                                        <span>{col}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Size Selection */}
                            {uniqueSizes.length > 0 && (
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">
                                    সাইজ সিলেক্ট করুন
                                  </p>
                                  {selectedSize && (
                                    <span className="text-[11px] font-bold text-primary">
                                      {selectedSize}
                                    </span>
                                  )}
                                </div>
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
                                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                            : "bg-card text-foreground border-border hover:border-primary/50"
                                        }`}
                                      >
                                        {size}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Quantity Selection */}
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
                                  className="w-9 h-9 flex items-center justify-center hover:bg-muted cursor-pointer"
                                >
                                  <Minus className="size-2.5" />
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
                                  className="w-9 h-9 flex items-center justify-center hover:bg-muted cursor-pointer"
                                >
                                  <Plus className="size-2.5" />
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

            // Previous Reviews Design
            case "reviews": {
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
            }

            // Custom Dynamic Section (Layout A-E)
            case "custom": {
              return (
                <CustomSectionRenderer
                  key={sec.id}
                  section={sec}
                  onScrollToOrder={scrollToOrderForm}
                />
              );
            }

            // Previous Order Form Design (Compact 2-Column on Desktop/Tablet with Cart on Right)
            case "order-form": {
              return (
                <section key={sec.id} id="section-order-form" className="py-12 px-4 md:px-8 bg-muted/30">
                  <div className="max-w-5xl mx-auto bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
                    {/* Form Header */}
                    <div className="bg-primary text-primary-foreground p-5 md:p-6 text-center space-y-1">
                      <h3 className="text-xl md:text-2xl font-black">
                        📝 সরাসরি অর্ডার করতে তথ্য পূরণ করুন
                      </h3>
                      <p className="text-xs md:text-sm text-primary-foreground/90 font-medium">
                        ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন
                      </p>
                    </div>

                    <form onSubmit={handlePlaceOrder} className="p-5 md:p-8">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                        {/* Left Column (Customer Form Details): 7 cols on lg */}
                        <div className="lg:col-span-7 space-y-4">
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                            <Truck className="size-4 text-primary" />
                            ডেলিভারির তথ্য
                          </h4>

                          {/* Customer Name & Phone */}
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

                          {/* City & Area Selection */}
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

                          {/* Full Address */}
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

                          {/* Note */}
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

                        </div>

                        {/* Right Column (Cart Summary & Total Pricing): 5 cols on lg */}
                        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
                          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b border-border">
                              <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <ShoppingBag className="size-4 text-primary" />
                                আপনার কার্ট ({selectedProductList.length}টি পণ্য)
                              </label>
                            </div>

                            {/* Cart Products List */}
                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                              {selectedProductList.map((item) => (
                                <div
                                  key={item.product.id}
                                  className="flex items-center justify-between gap-2.5 p-2.5 bg-background rounded-lg border border-border text-xs shadow-sm"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img
                                      src={getImageUrl(item.product.imageUrl || (item.product.images?.[0]?.imageUrl ?? ""), "thumb")}
                                      alt={item.product.name}
                                      width={40}
                                      height={40}
                                      loading="lazy"
                                      decoding="async"
                                      className="size-10 rounded-md object-cover border border-border shrink-0"
                                      onError={handleImageError}
                                    />
                                    <div className="min-w-0">
                                      <p className="font-bold text-foreground truncate text-xs">{item.product.name}</p>
                                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                        {item.selectedColor && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-muted text-foreground border border-border px-1.5 py-0.2 rounded">
                                            <span
                                              className="size-2 rounded-full border border-black/20 shrink-0"
                                              style={{ backgroundColor: getColorHex(item.selectedColor) }}
                                            />
                                            {item.selectedColor}
                                          </span>
                                        )}
                                        {item.selectedSize && (
                                          <span className="inline-block text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.2 rounded">
                                            সাইজ: {item.selectedSize}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex items-center border border-border rounded bg-muted/40">
                                      <button
                                        type="button"
                                        onClick={() => updateProductQuantity(item.product, -1)}
                                        className="size-6 flex items-center justify-center hover:bg-muted cursor-pointer"
                                      >
                                        <Minus className="size-2.5" />
                                      </button>
                                      <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                                      <button
                                        type="button"
                                        onClick={() => updateProductQuantity(item.product, 1)}
                                        className="size-6 flex items-center justify-center hover:bg-muted cursor-pointer"
                                      >
                                        <Plus className="size-2.5" />
                                      </button>
                                    </div>

                                    <span className="font-bold text-foreground text-xs min-w-14 text-right">
                                      ৳{(getProductPrice(item.product) * item.quantity).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Pricing Breakdown */}
                            <div className="p-3.5 bg-background rounded-xl border border-border space-y-2 text-xs">
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
                              disabled={isSubmitting || selectedProductList.length === 0}
                              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3.5 rounded-xl shadow-xl hover:shadow-2xl transition-all text-sm md:text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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

                            {/* Trust Badges under Button */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="size-4 text-emerald-600 shrink-0" /> ১০০% অরিজিনাল পণ্য
                              </span>
                              <span className="flex items-center gap-1.5">
                                <HeartHandshake className="size-4 text-blue-600 shrink-0" /> সহজ রিটার্ন সুবিধা
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Truck className="size-4 text-amber-600 shrink-0" /> দ্রুত ক্যাশ অন ডেলিভারি
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
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
      <footer className="py-6 px-4 border-t border-border bg-card text-center text-xs text-muted-foreground space-y-1">
        <p>© {new Date().getFullYear()} {settings?.general?.websiteName || "ALZEENA"}. All Rights Reserved.</p>
        <p>সারা বাংলাদেশে নিরাপদ ক্যাশ অন ডেলিভারি সেবা।</p>
      </footer>

      {/* 5. Rich Quick Details Modal */}
      {showDetailsModal && selectedProductForDetails && (() => {
        const modalAllImages = Array.from(
          new Set(
            [
              selectedProductForDetails.imageUrl,
              ...(selectedProductForDetails.images?.map((i) => i.imageUrl) || []),
            ].filter(Boolean)
          )
        ) as string[];
        const activeDisplayImg = modalActiveImg || selectedProductForDetails.imageUrl || modalAllImages[0] || "";

        const modalSizePrice =
          (modalSelectedSize && data?.config?.sizePrices?.[modalSelectedSize]) ||
          (modalSelectedSize &&
            selectedProductForDetails.variants?.find((v) => v.name === modalSelectedSize)?.priceOverride) ||
          selectedProductForDetails.price;

        const modalHasDiscount =
          selectedProductForDetails.compareAtPrice &&
          selectedProductForDetails.compareAtPrice > modalSizePrice;
        const modalDiscountAmt = modalHasDiscount
          ? Math.round(selectedProductForDetails.compareAtPrice! - modalSizePrice)
          : 0;

        const modalStock = modalSelectedSize
          ? selectedProductForDetails.variants?.find((v) => v.name === modalSelectedSize)?.stockQuantity ?? 15
          : 15;

        const modalUniqueColors = getUniqueColors(selectedProductForDetails);
        const modalUniqueSizes = getUniqueSizes(selectedProductForDetails);
        const isAlreadySelected = isProductSelected(selectedProductForDetails);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    প্রোডাক্ট বিস্তারিত তথ্য
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  aria-label="Close modal"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 items-start">
                  {/* Left Column: Image Gallery & Badges */}
                  <div className="space-y-3">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-muted/20 border border-border">
                      <img
                        src={getImageUrl(activeDisplayImg, "large")}
                        alt={selectedProductForDetails.name}
                        width={400}
                        height={400}
                        className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                        onError={handleImageError}
                      />

                      {/* Discount Badge */}
                      {modalHasDiscount && (
                        <div className="absolute top-2.5 right-2.5 bg-rose-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-md shadow-md">
                          ৳{modalDiscountAmt} ছাড়
                        </div>
                      )}
                    </div>

                    {/* Image Thumbnails */}
                    {modalAllImages.length > 1 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {modalAllImages.map((imgUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setModalActiveImg(imgUrl)}
                            className={`size-12 rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                              activeDisplayImg === imgUrl
                                ? "border-primary ring-1 ring-primary scale-105"
                                : "border-border/60 hover:border-primary/50 opacity-70 hover:opacity-100"
                            }`}
                          >
                            <img
                              src={getImageUrl(imgUrl, "thumb")}
                              alt=""
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                              onError={handleImageError}
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Trust Highlights */}
                    <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] text-muted-foreground font-medium">
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 border border-border/40">
                        <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                        <span>১০০% অরিজিনাল পণ্য</span>
                      </div>
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/30 border border-border/40">
                        <Truck className="size-3.5 text-blue-600 shrink-0" />
                        <span>ক্যাশ অন ডেলিভারি</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Title, Price, Attributes & Controls */}
                  <div className="space-y-4">
                    {/* Title & SKU */}
                    <div className="space-y-1">
                      <h3 className="text-lg sm:text-xl font-extrabold text-foreground leading-snug">
                        {selectedProductForDetails.name}
                      </h3>
                      {selectedProductForDetails.slug && (
                        <p className="text-[11px] text-muted-foreground font-mono">
                          আইটেম কোড: {selectedProductForDetails.slug}
                        </p>
                      )}
                    </div>

                    {/* Price Block */}
                    <div className="flex items-baseline gap-2.5 pb-3 border-b border-border/60">
                      <span className="text-2xl font-black text-primary">
                        ৳{modalSizePrice.toLocaleString()}
                      </span>
                      {modalHasDiscount && (
                        <span className="text-sm text-muted-foreground line-through">
                          ৳{selectedProductForDetails.compareAtPrice!.toLocaleString()}
                        </span>
                      )}
                      {modalHasDiscount && (
                        <span className="text-[11px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded">
                          {Math.round(((selectedProductForDetails.compareAtPrice! - modalSizePrice) / selectedProductForDetails.compareAtPrice!) * 100)}% ছাড়
                        </span>
                      )}
                    </div>

                    {/* Stock Status */}
                    <div className="text-xs">
                      {modalStock > 5 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          ইন স্টক ({modalStock}টি পণ্য এভেইলেবল)
                        </span>
                      ) : modalStock > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold inline-flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                          লিমিটেড স্টক (মাত্র {modalStock}টি বাকি আছে)
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold inline-flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-rose-500" />
                          আউট অফ স্টক
                        </span>
                      )}
                    </div>

                    {/* Color Selector */}
                    {modalUniqueColors.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">কালার সিলেক্ট করুন:</span>
                          {modalSelectedColor && (
                            <span className="font-semibold text-primary">{modalSelectedColor}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {modalUniqueColors.map((col) => {
                            const isColActive = modalSelectedColor === col;
                            const colHex = getColorHex(col);
                            return (
                              <button
                                key={col}
                                type="button"
                                onClick={() => setModalSelectedColor(col)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition-all cursor-pointer ${
                                  isColActive
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs scale-105"
                                    : "bg-card text-foreground border-border hover:border-primary/50"
                                }`}
                              >
                                <span
                                  className="size-2.5 rounded-full border border-black/20 shrink-0"
                                  style={{ backgroundColor: colHex }}
                                />
                                <span>{col}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Size Selector */}
                    {modalUniqueSizes.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">সাইজ সিলেক্ট করুন:</span>
                          {modalSelectedSize && (
                            <span className="font-semibold text-primary">{modalSelectedSize}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {modalUniqueSizes.map((sz) => {
                            const isSzActive = modalSelectedSize === sz;
                            return (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => setModalSelectedSize(sz)}
                                className={`w-10 h-9 flex items-center justify-center transition-all border text-xs font-bold rounded-md cursor-pointer ${
                                  isSzActive
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs scale-105"
                                    : "bg-card text-foreground border-border hover:border-primary/50"
                                }`}
                              >
                                {sz}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-bold text-foreground">পরিমাণ (Quantity):</span>
                      <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
                        <button
                          type="button"
                          onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                          className="size-8 flex items-center justify-center hover:bg-muted cursor-pointer transition-colors"
                        >
                          <Minus className="size-3" />
                        </button>
                        <div className="w-8 text-center font-bold text-xs text-foreground">
                          {modalQty}
                        </div>
                        <button
                          type="button"
                          onClick={() => setModalQty((q) => q + 1)}
                          className="size-8 flex items-center justify-center hover:bg-muted cursor-pointer transition-colors"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>

                    {/* Description Text */}
                    {(selectedProductForDetails.description || selectedProductForDetails.shortDescription) && (
                      <div className="space-y-1 pt-2 border-t border-border/60">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          বিবরণ:
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line max-h-28 overflow-y-auto bg-muted/20 p-2.5 rounded-lg border border-border/40">
                          {selectedProductForDetails.description || selectedProductForDetails.shortDescription}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="px-5 py-3.5 border-t border-border bg-muted/20 flex items-center gap-3 flex-shrink-0">
                {isAlreadySelected && (
                  <button
                    type="button"
                    onClick={() => {
                      updateSelections(selectedProductForDetails, 0);
                      setShowDetailsModal(false);
                      toast.info(`${selectedProductForDetails.name} সিলেকশন থেকে সরানো হয়েছে`);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold cursor-pointer transition-colors"
                  >
                    বাদ দিন
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    updateSelections(
                      selectedProductForDetails,
                      modalQty,
                      modalSelectedSize,
                      modalSelectedColor
                    );
                    setShowDetailsModal(false);
                    toast.success(
                      `${selectedProductForDetails.name} অর্ডারে সফলভাবে যুক্ত হয়েছে!`,
                      {
                        description: `কালার: ${modalSelectedColor || "Standard"} · সাইজ: ${modalSelectedSize || "Standard"} · পরিমাণ: ${modalQty}টি`,
                      }
                    );
                  }}
                  className="flex-1 h-11 bg-primary hover:opacity-90 text-primary-foreground font-black rounded-xl shadow-md hover:shadow-lg transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="size-4" />
                  <span>
                    {isAlreadySelected
                      ? `সিলেকশন আপডেট করুন (৳${(modalSizePrice * modalQty).toLocaleString()})`
                      : `অর্ডারে সিলেক্ট করুন (৳${(modalSizePrice * modalQty).toLocaleString()})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
