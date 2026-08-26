"use client";

import { useEffect, useState, useMemo, useCallback, use } from "react";
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
import { products as staticProducts } from "@/lib/shop-data";
import { useProducts } from "@/lib/products-store";
import { getImageUrl, handleImageError } from "@/lib/utils";
import { CustomSectionRenderer } from "@/components/admin/custom-section-renderer";
import { settingsService } from "@/lib/api/services/settings.service";
import { ordersService } from "@/lib/api/services/orders.service";
import {
  detectDeliveryZone,
  DELIVERY_ZONES,
  type DeliveryZone,
} from "@/lib/location-data";
import { SystemSettings } from "@/types/settings";
import { type Order } from "@/lib/orders";

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

interface SelectedCartItem {
  key: string;
  productId: string;
  selectedSize: string;
  quantity: number;
  product: UnifiedProduct;
}

interface ProductSelectionState {
  [itemKey: string]: SelectedCartItem;
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
  const { products: cachedProducts } = useProducts();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LandingPageData | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [allStoreProducts, setAllStoreProducts] = useState<UnifiedProduct[]>([]);

  // Multi-Size Selection State (keyed by `${productId}__${size}`)
  const [productSelections, setProductSelections] = useState<ProductSelectionState>({});
  const [activeCardSizes, setActiveCardSizes] = useState<{ [productId: string]: string }>({});

  // Quick Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<UnifiedProduct | null>(null);
  const [modalActiveImg, setModalActiveImg] = useState<string>("");
  const [modalSelectedSize, setModalSelectedSize] = useState<string>("");
  const [modalQty, setModalQty] = useState<number>(1);

  // Checkout Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Countdown timer state (Days, Hours, Minutes, Seconds)
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 1, minutes: 59, seconds: 59 });

  useEffect(() => {
    async function loadPage() {
      try {
        setLoading(true);
        const queryProductId = searchParams.get("productId");
        const [fetchedPageData, siteSettings] = await Promise.all([
          customLandingPageService.getBySlug(slug),
          settingsService.get().catch(() => null),
        ]);
        let pageData = fetchedPageData;

        // Fallback 1: If custom landing page endpoint with slug returned null, try queryProductId if provided
        if (!pageData?.product && queryProductId && queryProductId !== slug) {
          pageData = await customLandingPageService.getBySlug(queryProductId);
        }

        // Fallback 2: If still null, use cached products (no API call)
        if (!pageData?.product) {
          const searchKey = slug.toLowerCase();
          const rawProduct = cachedProducts.find(
            (p) =>
              p.slug.toLowerCase() === searchKey ||
              p.id?.toLowerCase() === searchKey ||
              p.name.toLowerCase().replace(/\s+/g, "-") === searchKey
          );
          if (rawProduct) {
            const rawMainImg = rawProduct.image || (rawProduct.images && rawProduct.images.length > 0 ? rawProduct.images[0] : "");

            pageData = {
              product: {
                id: rawProduct.id || queryProductId || slug,
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
        } else if (pageData.product) {
          if (!pageData.product.imageUrl) {
            const firstImg = pageData.product.images?.find((i) => i.isMain)?.imageUrl || pageData.product.images?.[0]?.imageUrl || "";
            if (firstImg) {
              pageData.product.imageUrl = firstImg;
            }
          }
        }

        // Set page data and display the page immediately
        setData(pageData);
        setSettings(siteSettings);
        setLoading(false);

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
          const sortSizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL", "5XL", "36", "38", "40", "42", "44", "46", "28", "30", "32", "34"];
          let smallestSize = mainProd.variants?.[0]?.name || "Standard";
          if (mainProd.variants && mainProd.variants.length > 0) {
            // Find smallest size by matching standard size order, or numeric value, or default to first
            const sortedVariants = [...mainProd.variants].sort((a, b) => {
              const aName = a.name.trim().toUpperCase();
              const bName = b.name.trim().toUpperCase();
              const aIndex = sortSizeOrder.indexOf(aName);
              const bIndex = sortSizeOrder.indexOf(bName);
              if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
              if (aIndex !== -1) return -1;
              if (bIndex !== -1) return 1;
              const aNum = parseInt(aName, 10);
              const bNum = parseInt(bName, 10);
              if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
              return 0;
            });
            smallestSize = sortedVariants[0].name;
          }

          setActiveCardSizes({ [mainProd.id]: smallestSize });

          // Auto-select this product with the smallest size (Qty: 1)
          const autoKey = `${mainProd.id}__${smallestSize}`;
          setProductSelections({
            [autoKey]: {
              key: autoKey,
              productId: mainProd.id,
              selectedSize: smallestSize,
              quantity: 1,
              product: mainProd,
            },
          });
        }

        // Populate allStoreProducts from cached products (no API call)
        if (cachedProducts.length > 0) {
          const mappedStoreProds: UnifiedProduct[] = cachedProducts.map((p) => ({
            id: p.id || p.slug,
            name: p.name,
            slug: p.slug,
            description: p.description || "",
            shortDescription: p.description || "",
            price: p.price,
            compareAtPrice: p.compareAt || null,
            imageUrl: p.image || (p.images?.[0] ?? ""),
            images: (p.images || [p.image || ""]).map((img, idx) => ({ imageUrl: img, isMain: idx === 0 })),
            variants: (p.sizes || []).map((s) => ({
              id: s,
              name: s,
              stockQuantity: p.sizeStock?.[s] ?? 10,
              priceOverride: p.sizePrices?.[s],
            })),
          }));
          setAllStoreProducts(mappedStoreProds);
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to load landing page");
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [slug, searchParams, cachedProducts]);

  // Support real-time postMessage preview updates from Designer
  useEffect(() => {
    if (!isPreview) return;

    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.type === "CLP_PREVIEW_UPDATE") {
        const { config: newConfig, sections: newSections, product: updatedProduct } = event.data;
        if (newConfig || updatedProduct) {
          setData((prev) => {
            const currentProd = updatedProduct || prev?.product;
            if (!prev) {
              if (currentProd) {
                const firstSize = currentProd.variants?.[0]?.name || "Standard";
                setActiveCardSizes({ [currentProd.id]: firstSize });
              }
              return {
                product: currentProd || { id: "", name: "", slug: "", description: "", shortDescription: "", price: 0, basePrice: 0, imageUrl: "", images: [], variants: [] },
                config: newConfig ? { ...newConfig, sectionsJson: newSections ? JSON.stringify(newSections) : undefined } : null,
              };
            }
            return {
              ...prev,
              product: updatedProduct || prev.product,
              config: {
                ...prev.config,
                ...(newConfig || {}),
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
    };

    const list: UnifiedProduct[] = [mainProd];

    // Check if admin has explicitly selected products for the product-select section
    const prodSec = activeSections.find((s) => s.type === "product-select");
    const configuredProductIds = (prodSec?.settings?.selectedProductIds as string[]) || [];

    if (configuredProductIds.length > 0) {
      configuredProductIds.forEach((targetId) => {
        if (!targetId || targetId === data.product.id || targetId === data.product.slug) return;

        // 1. Check data.relatedProducts
        const fromRelated = data.relatedProducts?.find(
          (rp) => rp.id === targetId || (rp.slug && rp.slug === targetId)
        );

        if (fromRelated) {
          if (!list.some((item) => item.id === fromRelated.id || (fromRelated.slug && item.slug === fromRelated.slug))) {
            list.push({
              id: fromRelated.id,
              name: fromRelated.name,
              slug: fromRelated.slug,
              price: fromRelated.price,
              compareAtPrice: fromRelated.compareAtPrice || null,
              imageUrl: fromRelated.imageUrl,
              variants: fromRelated.variants,
            });
          }
          return;
        }

        // 2. Check allStoreProducts
        const fromStore = allStoreProducts.find(
          (sp) => sp.id === targetId || sp.slug === targetId || (sp.name && targetId && sp.name.toLowerCase() === targetId.toLowerCase())
        );

        if (fromStore) {
          if (!list.some((item) => item.id === fromStore.id || (fromStore.slug && item.slug === fromStore.slug))) {
            list.push(fromStore);
          }
          return;
        }

        // 3. Fallback to staticProducts
        const fromStatic = staticProducts.find(
          (sp) => sp.id === targetId || sp.slug === targetId || (sp.name && targetId && sp.name.toLowerCase() === targetId.toLowerCase())
        );

        if (fromStatic) {
          if (!list.some((item) => item.id === fromStatic.id || item.slug === fromStatic.slug)) {
            list.push({
              id: fromStatic.id || fromStatic.slug,
              name: fromStatic.name,
              slug: fromStatic.slug,
              description: fromStatic.description,
              shortDescription: fromStatic.description,
              price: fromStatic.price,
              compareAtPrice: fromStatic.compareAt || null,
              imageUrl: fromStatic.image || (fromStatic.images?.[0] ?? ""),
              images: (fromStatic.images || [fromStatic.image]).map((img, idx) => ({ imageUrl: img, isMain: idx === 0 })),
              variants: (fromStatic.sizes || []).map((s) => ({
                id: s,
                name: s,
                stockQuantity: fromStatic.sizeStock?.[s] ?? 10,
                priceOverride: fromStatic.sizePrices?.[s],
              })),
            });
          }
        }
      });
    }

    return list;
  }, [data, activeSections, allStoreProducts]);

  // Selection Helper Methods
  const getItemKey = useCallback((productId: string, size?: string): string => {
    return `${productId}__${size || "Standard"}`;
  }, []);

  const getItemPrice = useCallback((p: UnifiedProduct, size?: string): number => {
    if (size && data?.config?.sizePrices?.[size]) {
      return data.config.sizePrices[size];
    }
    if (size && p.variants) {
      const v = p.variants.find((vr) => vr.name === size);
      if (v?.priceOverride) return v.priceOverride;
    }
    return p.price;
  }, [data?.config?.sizePrices]);

  const getQtyForSize = useCallback((productId: string, size?: string): number => {
    const key = getItemKey(productId, size);
    return productSelections[key]?.quantity ?? 0;
  }, [productSelections, getItemKey]);

  const getTotalQtyForProduct = useCallback((productId: string): number => {
    return Object.values(productSelections)
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  }, [productSelections]);

  const isProductSelected = useCallback((p: UnifiedProduct): boolean => {
    return getTotalQtyForProduct(p.id) > 0;
  }, [getTotalQtyForProduct]);

  const getProductSelectedSizes = useCallback((productId: string): SelectedCartItem[] => {
    return Object.values(productSelections).filter(
      (item) => item.productId === productId && item.quantity > 0
    );
  }, [productSelections]);

  const getActiveCardSize = useCallback((p: UnifiedProduct): string => {
    return activeCardSizes[p.id] || p.variants?.[0]?.name || "Standard";
  }, [activeCardSizes]);

  const getUniqueSizes = useCallback((p: UnifiedProduct): string[] => {
    if (!p.variants || p.variants.length === 0) return [];
    return Array.from(new Set(p.variants.map((v) => v.name)));
  }, []);

  const updateSizeQuantity = useCallback((product: UnifiedProduct, size: string, quantity: number) => {
    const targetSize = size || product.variants?.[0]?.name || "Standard";
    const key = getItemKey(product.id, targetSize);

    setProductSelections((prev) => {
      if (quantity <= 0) {
        if (!prev[key]) return prev;
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }

      return {
        ...prev,
        [key]: {
          key,
          productId: product.id,
          selectedSize: targetSize,
          quantity,
          product,
        },
      };
    });
  }, [getItemKey]);

  const selectCardSize = useCallback((p: UnifiedProduct, size: string) => {
    setActiveCardSizes((prev) => ({ ...prev, [p.id]: size }));
  }, []);

  const changeActiveCardSizeQuantity = useCallback((p: UnifiedProduct, delta: number) => {
    const activeSize = getActiveCardSize(p);
    const currentQty = getQtyForSize(p.id, activeSize);
    const newQty = Math.max(0, currentQty + delta);
    updateSizeQuantity(p, activeSize, newQty);
  }, [getActiveCardSize, getQtyForSize, updateSizeQuantity]);

  const toggleProductActiveSize = useCallback((p: UnifiedProduct) => {
    const activeSize = getActiveCardSize(p);
    const currentQty = getQtyForSize(p.id, activeSize);
    if (currentQty > 0) {
      updateSizeQuantity(p, activeSize, 0);
    } else {
      updateSizeQuantity(p, activeSize, 1);
    }
  }, [getActiveCardSize, getQtyForSize, updateSizeQuantity]);

  const selectedProductList = useMemo(() => {
    return Object.values(productSelections).filter((s) => s.quantity > 0);
  }, [productSelections]);

  const openProductDetails = (p: UnifiedProduct) => {
    setSelectedProductForDetails(p);
    const firstImg = p.imageUrl || p.images?.[0]?.imageUrl || "";
    setModalActiveImg(firstImg);
    const initialSize = getActiveCardSize(p);
    setModalSelectedSize(initialSize);
    const existingQty = getQtyForSize(p.id, initialSize);
    setModalQty(existingQty > 0 ? existingQty : 1);
    setShowDetailsModal(true);
  };

  // Delivery zone state
  const [selectedDeliveryZone, setSelectedDeliveryZone] = useState<DeliveryZone>("inside_dhaka");

  // Address change with auto-detect delivery zone
  const handleAddressChange = (addr: string) => {
    setCustomerAddress(addr);
    const detectedZone = detectDeliveryZone(addr);
    setSelectedDeliveryZone(detectedZone);
  };

  const deliveryCharge = useMemo(() => {
    const freeThreshold = data?.config?.freeShippingThresholdQuantity;
    const totalQty = selectedProductList.reduce((sum, item) => sum + item.quantity, 0);

    if (freeThreshold && freeThreshold > 0 && totalQty >= freeThreshold) {
      return 0; // Free delivery threshold reached
    }

    return DELIVERY_ZONES[selectedDeliveryZone]?.charge ?? 70;
  }, [selectedDeliveryZone, selectedProductList, data?.config?.freeShippingThresholdQuantity]);

  const subtotal = useMemo(() => {
    return selectedProductList.reduce((sum, item) => {
      const price = getItemPrice(item.product, item.selectedSize);
      return sum + price * item.quantity;
    }, 0);
  }, [selectedProductList, getItemPrice]);

  const grandTotal = subtotal + deliveryCharge;

  const scrollToOrderForm = () => {
    const el = document.getElementById("section-order-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Incomplete order tracking on CLP page
  const saveIncompleteDraft = useCallback((nameVal?: string, phoneVal?: string, addrVal?: string) => {
    if (selectedProductList.length === 0) return;
    const name = (nameVal !== undefined ? nameVal : customerName).trim();
    const phone = (phoneVal !== undefined ? phoneVal : customerPhone).trim();
    const addr = (addrVal !== undefined ? addrVal : customerAddress).trim();

    if (!name && !phone) return;

    const id = draftId || `INC-${Math.floor(10000 + Math.random() * 90000)}`;
    if (!draftId) setDraftId(id);

    const zoneLabel = DELIVERY_ZONES[selectedDeliveryZone]?.label || "ঢাকার ভিতরে";

    const draftOrder: Order = {
      id,
      customer: name || "Incomplete Customer",
      phone: phone || "",
      address: addr,
      city: zoneLabel,
      area: zoneLabel,
      note: notes.trim(),
      payment: "Cash on Delivery",
      status: "pending",
      date: new Date().toISOString().slice(0, 10),
      total: grandTotal,
      delivery: deliveryCharge,
      source: "checkout",
      items: selectedProductList.map((item) => {
        const unitPrice = getItemPrice(item.product, item.selectedSize);
        return {
          name: item.product.name,
          slug: item.product.slug || item.product.id,
          size: item.selectedSize || "Standard",
          qty: item.quantity,
          price: unitPrice,
        };
      }),
    };

    ordersService.saveIncomplete(draftOrder);
  }, [selectedProductList, customerName, customerPhone, customerAddress, draftId, notes, grandTotal, deliveryCharge, selectedDeliveryZone, getItemPrice]);

  useEffect(() => {
    if (selectedProductList.length === 0) return;
    const name = customerName.trim();
    const phone = customerPhone.trim();
    if (!name && !phone) return;

    const timer = setTimeout(() => {
      saveIncompleteDraft();
    }, 400);

    return () => clearTimeout(timer);
  }, [customerName, customerPhone, customerAddress, selectedProductList, saveIncompleteDraft]);

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
      const zoneLabel = DELIVERY_ZONES[selectedDeliveryZone]?.label || "ঢাকার ভিতরে";
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress: customerAddress.trim(),
        city: zoneLabel,
        area: zoneLabel,
        deliveryCharge: deliveryCharge,
        subtotal: subtotal,
        totalAmount: grandTotal,
        paymentMethod: "Cash on Delivery",
        notes: notes.trim(),
        items: selectedProductList.map((item) => {
          const unitPrice = getItemPrice(item.product, item.selectedSize);
          return {
            productId: item.product.id,
            productName: item.product.name,
            unitPrice: unitPrice,
            quantity: item.quantity,
            size: item.selectedSize || "Standard",
            variantName: item.selectedSize || "Standard",
            totalPrice: unitPrice * item.quantity,
          };
        }),
      };

      const res = await ordersService.createOrder(payload);
      const orderId = res?.orderNumber || `ORD-${Date.now()}`;

      // Clean up incomplete draft since order is completed
      if (draftId) {
        ordersService.removeIncomplete(draftId);
      }

      // Save local order cache so order-confirmation page has it immediately
      try {
        const localOrder: Order = {
          id: orderId,
          customer: customerName.trim(),
          phone: customerPhone.trim(),
          address: customerAddress.trim(),
          city: zoneLabel,
          area: zoneLabel,
          note: notes.trim(),
          payment: "Cash on Delivery",
          status: "pending",
          date: new Date().toISOString().slice(0, 10),
          total: grandTotal,
          delivery: deliveryCharge,
          source: "checkout",
          items: selectedProductList.map((item) => {
            const unitPrice = getItemPrice(item.product, item.selectedSize);
            return {
              name: item.product.name,
              slug: item.product.slug || item.product.id,
              size: item.selectedSize || "Standard",
              qty: item.quantity,
              price: unitPrice,
            };
          }),
        };
        const rawOrders = window.localStorage.getItem("arza-orders-v1");
        const ordersList = rawOrders ? JSON.parse(rawOrders) : [];
        window.localStorage.setItem(
          "arza-orders-v1",
          JSON.stringify([localOrder, ...ordersList.filter((o: Order) => o.id !== orderId)])
        );
      } catch {
        /* storage fallback */
      }

      toast.success("আপনার অর্ডারটি সফলভাবে গৃহীত হয়েছে!");
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
      {isMarquee && (() => {
        const marqueeSec = activeSections.find((s) => s.type === "marquee");
        const marqueeBg = marqueeSec?.settings?.backgroundColor as string;
        return (
          <div
            className="bg-gradient-to-r from-amber-500 via-rose-500 to-primary text-white py-1.5 md:py-2 px-3 md:px-4 overflow-hidden relative shadow-sm text-[11px] md:text-sm font-bold transition-colors"
            style={marqueeBg ? { backgroundColor: marqueeBg, backgroundImage: "none" } : undefined}
          >
            <div className="flex whitespace-nowrap animate-marquee">
              <span className="mx-3 md:mx-4">{marqueeText}</span>
              <span className="mx-3 md:mx-4">{marqueeText}</span>
              <span className="mx-3 md:mx-4">{marqueeText}</span>
            </div>
          </div>
        );
      })()}

      {/* 2. Sticky Countdown Urgency Bar (New red design with 4 units: Days, Hours, Minutes, Seconds) */}
      {isTimer && (() => {
        const countdownSec = activeSections.find((s) => s.type === "countdown");
        const countdownBg = countdownSec?.settings?.backgroundColor as string;
        return (
          <div
            className="sticky top-0 z-50 w-full bg-[#dc2626] text-white py-2 md:py-2.5 px-4 shadow-lg overflow-hidden transition-colors"
            style={countdownBg ? { backgroundColor: countdownBg } : undefined}
          >
            <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-center gap-2.5 md:gap-4 text-center">
              <span className="whitespace-pre-line text-sm sm:text-base md:text-lg font-black tracking-wide text-white drop-shadow-xs">
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
        );
      })()}

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
                  className="py-10 md:py-14 px-4 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent text-center transition-colors"
                  style={sec.settings?.backgroundColor ? { backgroundColor: sec.settings.backgroundColor as string, backgroundImage: "none" } : undefined}
                >
                  <div className="max-w-3xl mx-auto space-y-5">
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/15 text-primary text-sm md:text-base font-black border border-primary/30 shadow-xs">
                      <Sparkles className="size-4.5" />
                      <span>{config?.promoText || "🔥 বিশেষ ধামাকা অফার!"}</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
                      {product.name}
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl font-semibold text-foreground/90 leading-relaxed max-w-2xl mx-auto">
                      {product.shortDescription || product.description || "প্রিমিয়াম কোয়ালিটি এবং আধুনিক ডিজাইনের নির্ভরযোগ্য সমাধান। আজই সীমিত মূল্যে অর্ডার করুন!"}
                    </p>

                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById(nextSectionId) || document.getElementById("section-order-form");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black px-9 py-4 rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all text-base md:text-lg cursor-pointer"
                      >
                        <span>অর্ডার করতে এখানে চাপুন</span>
                        <ArrowRight className="size-6" />
                      </button>
                    </div>
                  </div>
                </section>
              );
            }

            // Previous Product Hero Section Design (with customHeroBgColor & reference image layout)
            case "product-hero": {
              const heroBgColor = (sec.settings?.backgroundColor as string) || config?.customHeroBgColor || "#9333ea";
              const isDefaultPurple = !sec.settings?.backgroundColor && (!config?.customHeroBgColor || config.customHeroBgColor.toLowerCase() === "#9333ea" || config.customHeroBgColor.toLowerCase() === "#a855f7");

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
                          <span className="inline-block text-xs md:text-sm font-extrabold uppercase tracking-wider text-amber-300 bg-black/30 px-3.5 py-1.5 rounded-full backdrop-blur-xs border border-white/20 mb-3">
                            {config.productDetailsTitle}
                          </span>
                        )}
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-sm">
                          🔥 {config?.featuredProductName || product.name}
                        </h2>
                      </div>

                      {/* Description / Feature Points */}
                      <div className="text-base sm:text-lg text-white font-medium leading-relaxed whitespace-pre-line bg-black/25 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-white/20 shadow-md">
                        {config?.customHeroDescription || product.shortDescription || product.description || "✨ সফট ও কমফোর্টেবল\n✨ স্মার্ট ও এলিগ্যান্ট ডিজাইন\n✨ Regular Fit — ডেইলি ইউজ ও আউটিং এর জন্য পারফেক্ট\n✨ দীর্ঘ সময় পরলেও আরামদায়ক ও স্টাইলিশ লুক"}
                      </div>

                      {/* CTA Order Button */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={scrollToOrderForm}
                          className="bg-white text-purple-950 hover:bg-slate-100 font-black px-9 py-4 rounded-xl shadow-2xl hover:scale-105 active:scale-95 transition-all text-base md:text-lg flex items-center justify-center gap-2.5 cursor-pointer border-2 border-white"
                        >
                          <ShoppingBag className="size-5 text-purple-800" />
                          <span>অর্ডার করতে ক্লিক করুন</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: Product Showcase Poster/Image */}
                    <div className="order-1 md:order-2 flex justify-center">
                      <div className="relative rounded-2xl overflow-hidden border-2 border-white/40 shadow-2xl bg-black/20 backdrop-blur-xs aspect-[4/5] sm:aspect-square max-w-md w-full">
                        {(config?.customHeroImageUrl || product.imageUrl) ? (
                          <img
                            src={getImageUrl(config?.customHeroImageUrl || product.imageUrl, "large")}
                            alt={config?.featuredProductName || product.name}
                            width={600}
                            height={600}
                            // @ts-expect-error fetchpriority attribute
                            fetchpriority="high"
                            loading="eager"
                            decoding="async"
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
                          <div className="absolute top-4 right-4 bg-rose-600 text-white text-xs sm:text-sm font-black px-4 py-1.5 rounded-full shadow-xl flex items-center gap-1.5 border border-white/30">
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
              return (
                <section
                  key={sec.id}
                  id={`section-${sec.id}`}
                  className="py-10 px-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-700 text-white text-center transition-colors"
                  style={sec.settings?.backgroundColor ? { backgroundColor: sec.settings.backgroundColor as string, backgroundImage: "none" } : undefined}
                >
                  <div className="max-w-2xl mx-auto space-y-3.5">
                    <h3 className="text-2xl md:text-3xl font-black tracking-tight">
                      {config?.promoText || "🔥 আজকের স্পেশাল কম্বো অফার!"}
                    </h3>

                    <p className="text-sm sm:text-base md:text-lg text-emerald-50 font-bold leading-relaxed">
                      {config?.freeShippingThresholdQuantity
                        ? `যেকোনো ${config.freeShippingThresholdQuantity}টি প্রোডাক্ট অর্ডার করলেই ফ্রি হোম ডেলিভারি!`
                        : "সীমিত সময়ের জন্য বিশেষ ছাড়ের সুযোগ গ্রহণ করুন।"}
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={scrollToOrderForm}
                        className="bg-white text-emerald-900 hover:bg-emerald-50 font-black px-8 py-3 rounded-xl shadow-lg hover:scale-105 transition-all text-sm md:text-base cursor-pointer"
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
                <section
                  key={sec.id}
                  id={`section-${sec.id}`}
                  className="py-9 px-4 md:px-8 bg-card transition-colors"
                  style={sec.settings?.backgroundColor ? { backgroundColor: sec.settings.backgroundColor as string } : undefined}
                >
                  <div className="max-w-4xl mx-auto p-6 md:p-7 bg-muted/60 rounded-2xl border border-border/80 flex flex-col md:flex-row items-center gap-5 text-center md:text-left shadow-xs">
                    <div className="size-16 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                      <ShieldCheck className="size-9" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h4 className="text-lg md:text-xl font-black text-foreground">১০০% নিরাপদ কেনাকাটা</h4>
                      <p className="text-sm sm:text-base font-semibold text-foreground/80 leading-relaxed">
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
                <section
                  key={sec.id}
                  id={`section-${sec.id}`}
                  className="py-7 px-4 md:px-8 bg-amber-500/15 border-y border-amber-500/30 text-center transition-colors"
                  style={sec.settings?.backgroundColor ? { backgroundColor: sec.settings.backgroundColor as string } : undefined}
                >
                  <div className="max-w-3xl mx-auto flex items-center justify-center gap-3 text-amber-950 dark:text-amber-100">
                    <ShieldCheck className="size-6 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm sm:text-base md:text-lg font-black leading-snug">
                      {(sec.settings?.text as string) || (sec.settings?.infoBannerText as string) || config?.trustBannerDescription || "পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধের সম্পূর্ণ নিশ্চয়তা!"}
                    </p>
                  </div>
                </section>
              );
            }

            // Product Selection: Keeping New Card Design & Interactive Size/Qty logic
            case "product-select": {
              return (
                <section
                  key={sec.id}
                  id={`section-${sec.id}`}
                  className="py-14 md:py-20 px-4 md:px-8 bg-background border-b border-border transition-colors"
                  style={sec.settings?.backgroundColor ? { backgroundColor: sec.settings.backgroundColor as string } : undefined}
                >
                  <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-10 md:mb-12">
                      <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2">
                        {(sec.settings?.sectionTitle as string) || "পণ্য নির্বাচন করুন"}
                      </h2>
                      <p className="text-muted-foreground font-medium text-sm">
                        চেকবক্সে ক্লিক করে পণ্য নির্বাচন করুন
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                      {allSelectableProducts.map((p) => {
                        const activeSize = getActiveCardSize(p);
                        const activeSizeQty = getQtyForSize(p.id, activeSize);
                        const totalProductQty = getTotalQtyForProduct(p.id);
                        const isSelected = totalProductQty > 0;
                        const uniqueSizes = getUniqueSizes(p);
                        const cardPrice = getItemPrice(p, activeSize);
                        const hasDiscount = p.compareAtPrice && p.compareAtPrice > cardPrice;
                        const chosenSizes = getProductSelectedSizes(p.id);

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
                                toggleProductActiveSize(p);
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
                                ৳{(p.compareAtPrice! - cardPrice)} OFF
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
                            <div className="space-y-1 mb-3">
                              <h4 className="text-sm font-bold text-foreground line-clamp-1">
                                {p.name}
                              </h4>
                              <div className="flex items-center gap-2">
                                <span className="text-primary font-bold text-base whitespace-nowrap">
                                  ৳{cardPrice.toLocaleString()}
                                </span>
                                {hasDiscount && (
                                  <span className="text-muted-foreground line-through text-xs whitespace-nowrap">
                                    ৳{p.compareAtPrice!.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              {chosenSizes.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 pt-1">
                                  <span className="text-[10px] text-muted-foreground font-semibold">নির্বাচিত:</span>
                                  {chosenSizes.map((cs) => (
                                    <span
                                      key={cs.key}
                                      className="inline-flex items-center text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded"
                                    >
                                      {cs.selectedSize} ({cs.quantity})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Size Selection */}
                            {uniqueSizes.length > 0 && (
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">
                                    সাইজ সিলেক্ট করুন
                                  </p>
                                  {activeSize && (
                                    <span className="text-[11px] font-bold text-primary">
                                      {activeSize} {activeSizeQty > 0 ? `(${activeSizeQty}টি কার্টে)` : ""}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {uniqueSizes.map((size) => {
                                    const isSizeActive = activeSize === size;
                                    const sizeInCartQty = getQtyForSize(p.id, size);
                                    return (
                                      <button
                                        key={size}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          selectCardSize(p, size);
                                        }}
                                        className={`relative min-w-9 h-9 px-2 flex items-center justify-center transition-all border text-xs font-bold rounded-sm cursor-pointer ${
                                          isSizeActive
                                            ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                            : "bg-card text-foreground border-border hover:border-primary/50"
                                        }`}
                                      >
                                        <span>{size}</span>
                                        {sizeInCartQty > 0 && !isSizeActive && (
                                          <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-emerald-600 text-[9px] text-white font-black flex items-center justify-center shadow-xs">
                                            {sizeInCartQty}
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Bottom Controls: Bistarito (Details) & Quantity Selection + Add Button */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/70">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openProductDetails(p);
                                }}
                                className="flex items-center gap-1 px-2.5 sm:px-3 h-8 sm:h-9 rounded-md bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-bold transition-all cursor-pointer hover:border-primary/50"
                              >
                                <span>বিস্তারিত</span>
                                <ChevronRight className="size-3.5 text-muted-foreground" />
                              </button>

                              <div className="flex items-center gap-1.5">
                                {/* Quantity Stepper */}
                                <div className="flex items-center border border-border rounded-md overflow-hidden bg-background">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      changeActiveCardSizeQuantity(p, -1);
                                    }}
                                    className="w-7 sm:w-8 h-8 sm:h-9 flex items-center justify-center hover:bg-muted cursor-pointer"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="size-2.5" />
                                  </button>
                                  <div className="w-7 sm:w-8 h-8 sm:h-9 flex items-center justify-center font-bold text-xs sm:text-sm text-foreground">
                                    {activeSizeQty || 0}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      changeActiveCardSizeQuantity(p, 1);
                                    }}
                                    className="w-7 sm:w-8 h-8 sm:h-9 flex items-center justify-center hover:bg-muted cursor-pointer"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="size-2.5" />
                                  </button>
                                </div>

                                {/* Add Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentQty = getQtyForSize(p.id, activeSize);
                                    const newQty = currentQty > 0 ? currentQty + 1 : 1;
                                    updateSizeQuantity(p, activeSize, newQty);
                                    toast.success(`${p.name} (${activeSize}) কার্টে যুক্ত হয়েছে!`, {
                                      description: `মোট পরিমাণ: ${newQty}টি · দাম: ৳${(cardPrice * newQty).toLocaleString()}`,
                                    });
                                  }}
                                  className="flex items-center gap-1 px-2.5 sm:px-3 h-8 sm:h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-md shadow-xs transition-all cursor-pointer active:scale-95"
                                  title={`${activeSize} সাইজ কার্টে যোগ করুন`}
                                >
                                  <ShoppingBag className="size-3.5" />
                                  <span>যুক্ত করুন</span>
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
                <section
                  key={sec.id}
                  id={`section-${sec.id}`}
                  className="py-12 px-4 md:px-8 bg-card transition-colors"
                  style={sec.settings?.backgroundColor ? { backgroundColor: sec.settings.backgroundColor as string } : undefined}
                >
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="text-center space-y-1.5">
                      <div className="flex items-center justify-center gap-1.5 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="size-5 fill-current" />
                        ))}
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                        কাস্টমারদের প্রতিক্রিয়া ও রিভিউ
                      </h3>
                      <p className="text-sm md:text-base font-semibold text-foreground/80">
                        সারা বাংলাদেশের শত শত সন্তুষ্ট গ্রাহক আমাদের প্রোডাক্ট ব্যবহার করছেন
                      </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-5 rounded-2xl bg-muted/60 border border-border space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-foreground">তানভীর হাসান</span>
                          <span className="text-xs text-emerald-600 font-extrabold">Verified Buyer</span>
                        </div>
                        <div className="flex gap-1 text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="size-3.5 fill-current" />
                          ))}
                        </div>
                        <p className="text-sm font-medium text-foreground/90 leading-relaxed">
                          "কোয়ালিটি খুবই ভালো! সময়মতো ডেলিভারি পেয়েছি এবং কাপড়ের ফিনিশিং প্রিমিয়াম ছিল।"
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl bg-muted/60 border border-border space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-foreground">ফারহানা আক্তার</span>
                          <span className="text-xs text-emerald-600 font-extrabold">Verified Buyer</span>
                        </div>
                        <div className="flex gap-1 text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="size-3.5 fill-current" />
                          ))}
                        </div>
                        <p className="text-sm font-medium text-foreground/90 leading-relaxed">
                          "ছবিতে যেমন দেখেছি হুবহু তেমনই পেয়েছি। রিটার্ন সুবিধার ভরসা থাকায় নিশ্চিন্তে অর্ডার করেছিলাম।"
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl bg-muted/60 border border-border space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-foreground">মো: রাশেদুল ইসলাম</span>
                          <span className="text-xs text-emerald-600 font-extrabold">Verified Buyer</span>
                        </div>
                        <div className="flex gap-1 text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="size-3.5 fill-current" />
                          ))}
                        </div>
                        <p className="text-sm font-medium text-foreground/90 leading-relaxed">
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
                <section
                  key={sec.id}
                  id="section-order-form"
                  className="py-12 px-4 md:px-8 bg-muted/30 transition-colors"
                  style={sec.settings?.backgroundColor ? { backgroundColor: sec.settings.backgroundColor as string } : undefined}
                >
                  <div className="max-w-5xl mx-auto bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
                    {/* Form Header */}
                    <div className="bg-primary text-primary-foreground p-6 md:p-7 text-center space-y-1.5">
                      <h3 className="text-2xl md:text-3xl font-black tracking-tight">
                        📝 সরাসরি অর্ডার করতে তথ্য পূরণ করুন
                      </h3>
                      <p className="text-sm md:text-base text-primary-foreground font-bold">
                        ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন
                      </p>
                    </div>

                    <form onSubmit={handlePlaceOrder} className="p-5 sm:p-7 md:p-9">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                        {/* Left Column (Customer Form Details): 7 cols on lg */}
                        <div className="lg:col-span-7 space-y-4 sm:space-y-5">
                          <h4 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2 pb-2.5 border-b border-border">
                            <Truck className="size-5 text-primary" />
                            ডেলিভারির তথ্য
                          </h4>

                          {/* Customer Name & Phone */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-sm font-black text-foreground">আপনার নাম *</label>
                              <input
                                type="text"
                                required
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                onBlur={(e) => saveIncompleteDraft(e.target.value, undefined)}
                                placeholder="যেমন: মোঃ করিম"
                                className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm sm:text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-sm font-black text-foreground">
                                মোবাইল নম্বর * (১১ ডিজিট)
                              </label>
                              <input
                                type="tel"
                                required
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                onBlur={(e) => saveIncompleteDraft(undefined, e.target.value)}
                                placeholder="01XXXXXXXXX"
                                className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm sm:text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                              />
                            </div>
                          </div>

                          {/* Full Address with Smart Delivery Detector */}
                          <div className="space-y-1.5">
                            <label className="text-sm font-black text-foreground">
                              পূর্ণাঙ্গ ঠিকানা (বাসা/রোড/এলাকা) *
                            </label>
                            <textarea
                              required
                              rows={2}
                              value={customerAddress}
                              onChange={(e) => handleAddressChange(e.target.value)}
                              placeholder="বাসা নম্বর, রোড, এলাকার বিস্তারিত লিখুন..."
                              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm sm:text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
                            />
                          </div>

                          {/* Delivery Zone Card - Single auto calculated based on address */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                ডেলিভারি মেথড
                              </label>
                              <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                                অটোমেটিক নির্ধারিত
                              </span>
                            </div>

                            <div className="p-3.5 sm:p-4 rounded-xl border-2 border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="size-4.5 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                                  <div className="size-2 bg-white rounded-full" />
                                </div>
                                <div>
                                  <span className="text-sm sm:text-base font-extrabold text-foreground block">
                                    {DELIVERY_ZONES[selectedDeliveryZone]?.label || "ঢাকার ভিতরে"} — {deliveryCharge === 0 ? "ফ্রি" : `${deliveryCharge} ৳`}
                                  </span>
                                  <span className="text-[11px] sm:text-xs text-muted-foreground">
                                    আপনার প্রদত্ত ঠিকানা অনুযায়ী চার্জ স্বয়ংক্রিয়ভাবে হিসাব করা হয়েছে
                                  </span>
                                </div>
                              </div>
                              <span className="text-sm sm:text-base font-black text-primary shrink-0">
                                {deliveryCharge === 0 ? "ফ্রি" : `৳${deliveryCharge}`}
                              </span>
                            </div>
                          </div>

                          {/* Note */}
                          <div className="space-y-1.5">
                            <label className="text-sm font-black text-foreground">নোট (ঐচ্ছিক)</label>
                            <input
                              type="text"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="অর্ডার সম্পর্কে কিছু জানাতে চাইলে লিখুন..."
                              className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm sm:text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                            />
                          </div>

                        </div>

                        {/* Right Column (Cart Summary & Total Pricing): 5 cols on lg */}
                        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
                          <div className="bg-muted/40 border border-border rounded-2xl p-5 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                              <label className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                                <ShoppingBag className="size-4.5 text-primary" />
                                আপনার কার্ট ({selectedProductList.length}টি পণ্য)
                              </label>
                            </div>

                            {/* Cart Products List */}
                            {selectedProductList.length === 0 ? (
                              <div className="py-6 px-4 text-center rounded-xl border border-dashed border-border bg-background/60 space-y-2">
                                <ShoppingBag className="size-7 text-muted-foreground/50 mx-auto" />
                                <p className="text-sm font-black text-foreground/80">এখনও কোনো পণ্য নির্বাচন করা হয়নি</p>
                                <p className="text-xs font-semibold text-muted-foreground">উপরের প্রোডাক্ট কার্ড থেকে সাইজ সিলেক্ট করে "যুক্ত করুন" বাটনে ক্লিক করুন</p>
                              </div>
                            ) : (
                              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                {selectedProductList.map((item) => (
                                  <div
                                    key={item.key}
                                    className="p-3 bg-background rounded-xl border border-border text-sm shadow-xs space-y-2.5"
                                  >
                                    {/* Top Row: Thumbnail + Product Full Name + Price */}
                                    <div className="flex items-start justify-between gap-2.5">
                                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                        <img
                                          src={getImageUrl(item.product.imageUrl || (item.product.images?.[0]?.imageUrl ?? ""), "thumb")}
                                          alt={item.product.name}
                                          width={48}
                                          height={48}
                                          loading="lazy"
                                          decoding="async"
                                          className="size-12 rounded-lg object-cover border border-border shrink-0 bg-muted/20"
                                          onError={handleImageError}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <p className="font-extrabold text-foreground text-xs sm:text-sm leading-snug line-clamp-2">
                                            {item.product.name}
                                          </p>
                                          {item.selectedSize && (
                                            <span className="inline-block mt-1 text-[11px] font-extrabold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
                                              সাইজ: {item.selectedSize}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className="font-black text-foreground text-sm sm:text-base">
                                          ৳{(getItemPrice(item.product, item.selectedSize) * item.quantity).toLocaleString()}
                                        </span>
                                        {item.quantity > 1 && (
                                          <span className="block text-[10px] text-muted-foreground">
                                            (৳{getItemPrice(item.product, item.selectedSize).toLocaleString()} × {item.quantity})
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Bottom Row: Quantity Stepper and Quick Controls */}
                                    <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                                      <span className="text-xs font-semibold text-muted-foreground">
                                        পরিমাণ (Quantity):
                                      </span>

                                      <div className="flex items-center border border-border rounded-lg bg-muted/40 overflow-hidden shadow-2xs">
                                        <button
                                          type="button"
                                          onClick={() => updateSizeQuantity(item.product, item.selectedSize, item.quantity - 1)}
                                          className="size-7 sm:size-8 flex items-center justify-center hover:bg-muted active:bg-muted/80 cursor-pointer font-bold text-foreground transition-colors"
                                          aria-label="Decrease quantity"
                                        >
                                          <Minus className="size-3.5" />
                                        </button>
                                        <span className="w-8 text-center font-black text-xs sm:text-sm bg-background py-1">
                                          {item.quantity}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => updateSizeQuantity(item.product, item.selectedSize, item.quantity + 1)}
                                          className="size-7 sm:size-8 flex items-center justify-center hover:bg-muted active:bg-muted/80 cursor-pointer font-bold text-foreground transition-colors"
                                          aria-label="Increase quantity"
                                        >
                                          <Plus className="size-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Pricing Breakdown */}
                            <div className="p-4 bg-background rounded-xl border border-border space-y-2.5 text-sm">
                              <div className="flex justify-between text-foreground/80 font-medium">
                                <span>প্রোডাক্ট সাবটোটাল</span>
                                <span className="font-extrabold text-foreground">
                                  ৳{subtotal.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between text-foreground/80 font-medium">
                                <span>ডেলিভারি চার্জ</span>
                                <span className="font-extrabold text-foreground">
                                  {deliveryCharge === 0 ? "ফ্রি" : `৳${deliveryCharge}`}
                                </span>
                              </div>
                              <div className="border-t border-border pt-3 flex justify-between text-base font-black text-foreground">
                                <span>সর্বমোট প্রদেয় বিল</span>
                                <span className="text-primary text-lg sm:text-xl font-black">
                                  ৳{grandTotal.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* Submit Button */}
                            <button
                              type="submit"
                              disabled={isSubmitting || selectedProductList.length === 0}
                              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all text-base sm:text-lg flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                            >
                              {isSubmitting ? (
                                <>
                                  <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>অর্ডার প্রসেস হচ্ছে...</span>
                                </>
                              ) : selectedProductList.length === 0 ? (
                                <>
                                  <ShoppingBag className="size-5.5" />
                                  <span>প্রথমে পণ্য নির্বাচন করুন</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="size-5.5" />
                                  <span>অর্ডার নিশ্চিত করুন (৳{grandTotal.toLocaleString()})</span>
                                </>
                              )}
                            </button>

                            {/* Trust Badges under Button */}
                            <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs font-semibold text-foreground/80 bg-muted/30 p-3.5 rounded-xl border border-border">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="size-4.5 text-emerald-600 shrink-0" /> ১০০% অরিজিনাল পণ্য
                              </span>
                              <span className="flex items-center gap-1.5">
                                <HeartHandshake className="size-4.5 text-blue-600 shrink-0" /> সহজ রিটার্ন সুবিধা
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Truck className="size-4.5 text-amber-600 shrink-0" /> দ্রুত ক্যাশ অন ডেলিভারি
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
        <p>{settings?.footer?.copyrightText || (settings?.general?.websiteName ? `© ${new Date().getFullYear()} ${settings.general.websiteName}. All Rights Reserved.` : `© ${new Date().getFullYear()}. All Rights Reserved.`)}</p>
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

        const modalUniqueSizes = getUniqueSizes(selectedProductForDetails);
        const modalSelectedQty = getQtyForSize(selectedProductForDetails.id, modalSelectedSize);
        const isSizeInCart = modalSelectedQty > 0;

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
                    <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs font-semibold text-foreground/80">
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border">
                        <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                        <span>১০০% অরিজিনাল পণ্য</span>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border">
                        <Truck className="size-4 text-blue-600 shrink-0" />
                        <span>ক্যাশ অন ডেলিভারি</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Title, Price, Attributes & Controls */}
                  <div className="space-y-4">
                    {/* Title & SKU */}
                    <div className="space-y-1.5">
                      <h3 className="text-xl sm:text-2xl font-black text-foreground leading-snug">
                        {selectedProductForDetails.name}
                      </h3>
                      {selectedProductForDetails.slug && (
                        <p className="text-xs text-muted-foreground font-mono">
                          আইটেম কোড: {selectedProductForDetails.slug}
                        </p>
                      )}
                    </div>

                    {/* Price Block */}
                    <div className="flex items-baseline gap-3 pb-3 border-b border-border/60">
                      <span className="text-2xl sm:text-3xl font-black text-primary">
                        ৳{modalSizePrice.toLocaleString()}
                      </span>
                      {modalHasDiscount && (
                        <span className="text-sm sm:text-base text-muted-foreground line-through font-medium">
                          ৳{selectedProductForDetails.compareAtPrice!.toLocaleString()}
                        </span>
                      )}
                      {modalHasDiscount && (
                        <span className="text-xs font-black text-rose-600 bg-rose-500/15 px-2.5 py-0.5 rounded-md">
                          {Math.round(((selectedProductForDetails.compareAtPrice! - modalSizePrice) / selectedProductForDetails.compareAtPrice!) * 100)}% ছাড়
                        </span>
                      )}
                    </div>

                    {/* Stock Status */}
                    <div className="text-sm">
                      {modalStock > 0 || selectedProductForDetails.isPreOrder ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          ইন স্টক
                        </span>
                      ) : (
                        <span className="text-rose-600 font-black inline-flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-rose-500" />
                          আউট অফ স্টক
                        </span>
                      )}
                    </div>

                    {/* Size Selector */}
                    {modalUniqueSizes.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-black text-foreground">সাইজ সিলেক্ট করুন:</span>
                          {modalSelectedSize && (
                            <span className="font-bold text-primary">
                              {modalSelectedSize} {isSizeInCart ? `(${modalSelectedQty}টি কার্টে)` : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {modalUniqueSizes.map((sz) => {
                            const isSzActive = modalSelectedSize === sz;
                            const szCartQty = getQtyForSize(selectedProductForDetails.id, sz);
                            return (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => {
                                  setModalSelectedSize(sz);
                                  const existingQty = getQtyForSize(selectedProductForDetails.id, sz);
                                  setModalQty(existingQty > 0 ? existingQty : 1);
                                }}
                                className={`relative min-w-11 h-10 px-3 flex items-center justify-center transition-all border text-sm font-bold rounded-lg cursor-pointer ${
                                  isSzActive
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                                    : "bg-card text-foreground border-border hover:border-primary/50"
                                }`}
                              >
                                <span>{sz}</span>
                                {szCartQty > 0 && !isSzActive && (
                                  <span className="absolute -top-1.5 -right-1.5 size-4.5 rounded-full bg-emerald-600 text-[10px] text-white font-black flex items-center justify-center shadow-xs">
                                    {szCartQty}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm font-black text-foreground">পরিমাণ (Quantity):</span>
                      <div className="flex items-center border border-border rounded-xl overflow-hidden bg-background">
                        <button
                          type="button"
                          onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                          className="size-9 flex items-center justify-center hover:bg-muted cursor-pointer transition-colors"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <div className="w-10 text-center font-black text-sm text-foreground">
                          {modalQty}
                        </div>
                        <button
                          type="button"
                          onClick={() => setModalQty((q) => q + 1)}
                          className="size-9 flex items-center justify-center hover:bg-muted cursor-pointer transition-colors"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Description Text */}
                    {(selectedProductForDetails.description || selectedProductForDetails.shortDescription) && (
                      <div className="space-y-1.5 pt-2 border-t border-border/60">
                        <span className="text-xs font-extrabold text-foreground/80 uppercase tracking-wider">
                          বিবরণ:
                        </span>
                        <p className="text-sm font-medium text-foreground/90 leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto bg-muted/40 p-3 rounded-xl border border-border/60">
                          {selectedProductForDetails.description || selectedProductForDetails.shortDescription}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="px-5 py-3.5 border-t border-border bg-muted/20 flex items-center gap-3 flex-shrink-0">
                {isSizeInCart && (
                  <button
                    type="button"
                    onClick={() => {
                      updateSizeQuantity(selectedProductForDetails, modalSelectedSize, 0);
                      setShowDetailsModal(false);
                      toast.info(`${selectedProductForDetails.name} (সাইজ: ${modalSelectedSize}) কার্ট থেকে সরানো হয়েছে`);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold cursor-pointer transition-colors"
                  >
                    এই সাইজটি বাদ দিন
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    updateSizeQuantity(
                      selectedProductForDetails,
                      modalSelectedSize,
                      modalQty
                    );
                    setShowDetailsModal(false);
                    toast.success(
                      `${selectedProductForDetails.name} (${modalSelectedSize || "Standard"}) অর্ডারে সফলভাবে যুক্ত হয়েছে!`,
                      {
                        description: `সাইজ: ${modalSelectedSize || "Standard"} · পরিমাণ: ${modalQty}টি`,
                      }
                    );
                  }}
                  className="flex-1 h-11 bg-primary hover:opacity-90 text-primary-foreground font-black rounded-xl shadow-md hover:shadow-lg transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="size-4" />
                  <span>
                    {isSizeInCart
                      ? `সিলেকশন আপডেট করুন (৳${(modalSizePrice * modalQty).toLocaleString()})`
                      : `অর্ডারে যুক্ত করুন (৳${(modalSizePrice * modalQty).toLocaleString()})`}
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
