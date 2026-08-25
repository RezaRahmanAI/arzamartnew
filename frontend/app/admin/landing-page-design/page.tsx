"use client";

import { useEffect, useState, useTransition, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  customLandingPageService,
  CustomLandingPageConfig,
  LandingSection,
  DEFAULT_LANDING_SECTIONS,
  LandingPageProduct,
  LandingPageData,
} from "@/lib/api/services/custom-landing-page.service";
import { apiClient } from "@/lib/api/client";
import { products as staticProducts } from "@/lib/shop-data";
import { useProducts } from "@/lib/products-store";
import { CustomLandingPageEditor } from "@/components/admin/custom-landing-page-editor";

function DesignerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get("productId") || "";
  const slug = searchParams.get("slug") || "";
  const { products: allProducts } = useProducts();

  const [loading, setLoading] = useState(true);
  const [isSaving, startSaving] = useTransition();
  const [product, setProduct] = useState<LandingPageProduct | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [config, setConfig] = useState<CustomLandingPageConfig>({
    productId: productId,
    isTimerVisible: true,
    relativeTimerTotalMinutes: 120,
    headerTitle: "অফারটি শেষ হতে মাত্র কিছুক্ষণ বাকি আছে!",
    promoText: "🔥 বিশেষ ধামাকা অফার!",
    isProductDetailsVisible: true,
    productDetailsTitle: "🔥 প্রোডাক্ট ডিটেইলস",
    isFabricVisible: true,
    isDesignVisible: true,
    isTrustBannerVisible: true,
    trustBannerText: "দেখে চেক করে রিসিভ করতে পারবেন। পছন্দ না হলে ডেলিভারি চার্জ দিয়ে রিটার্ন করে দিতে পারবেন সহজেই।",
    isFeaturedOrderVisible: true,
    isMarqueeVisible: true,
    marqueeText: "🔥 সীমিত স্টক — মাত্র ৩৪টি বাকি! 🚚 সারা বাংলাদেশে ক্যাশ অন ডেলিভারি 💥 আজকের জন্য বিশেষ ছাড় ⚡",
  });

  const [sections, setSections] = useState<LandingSection[]>(DEFAULT_LANDING_SECTIONS);

  useEffect(() => {
    if (!productId && !slug) {
      toast.error("No product selected for landing page design");
      return;
    }

    const loadDesignerData = async () => {
      try {
        setLoading(true);
        // 1. Try loading by slug or productId from CLP endpoint
        let pageData: LandingPageData | null = null;
        if (slug) {
          pageData = await customLandingPageService.getBySlug(slug);
        }
        if (!pageData?.product && productId && productId !== slug) {
          pageData = await customLandingPageService.getBySlug(productId);
        }

        // 2. Fallback: If not found by custom landing page endpoint, use cached products (no API call)
        if (!pageData?.product) {
          const lookupKey = slug || productId;
          const fallbackProduct = allProducts.find(
            (p) => p.slug === lookupKey || p.id === lookupKey || p.name.toLowerCase().replace(/\s+/g, "-") === lookupKey
          );
          if (fallbackProduct) {
            const fallbackMainImg = fallbackProduct.image || (fallbackProduct.images && fallbackProduct.images.length > 0 ? fallbackProduct.images[0] : "");
            pageData = {
              product: {
                id: fallbackProduct.id || productId,
                name: fallbackProduct.name,
                slug: fallbackProduct.slug,
                description: fallbackProduct.description || "",
                shortDescription: fallbackProduct.description || "",
                price: fallbackProduct.price,
                compareAtPrice: fallbackProduct.compareAt || null,
                basePrice: fallbackProduct.mrp || fallbackProduct.price,
                discountPrice: fallbackProduct.price < (fallbackProduct.mrp || fallbackProduct.price) ? fallbackProduct.price : null,
                imageUrl: fallbackMainImg,
                images: (fallbackProduct.images || (fallbackMainImg ? [fallbackMainImg] : [])).map((img, idx) => ({ imageUrl: img, isMain: idx === 0 })),
                variants: (fallbackProduct.sizes || []).map((s) => ({
                  id: s,
                  name: s,
                  stockQuantity: fallbackProduct.sizeStock?.[s] ?? 10,
                  priceOverride: fallbackProduct.sizePrices?.[s],
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

        if (pageData?.product) {
          setProduct(pageData.product);
        }

        // Load existing config (from pageData or fetch if missing)
        const pId = pageData?.product?.id || productId;
        let existingConfig = pageData?.config;
        if (!existingConfig && pId) {
          existingConfig = await customLandingPageService.getConfig(pId);
        }

        if (existingConfig) {
          setConfig({
            ...existingConfig,
            productId: pId,
          });

          if (existingConfig.sectionsJson) {
            try {
              const parsed = JSON.parse(existingConfig.sectionsJson);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setSections(parsed);
              }
            } catch (e) {
              console.error("Failed to parse sectionsJson", e);
            }
          }
        } else {
          setConfig((prev) => ({
            ...prev,
            productId: pId,
            featuredProductName: pageData?.product?.name,
            promoPrice: pageData?.product?.price,
            originalPrice: pageData?.product?.compareAtPrice || pageData?.product?.basePrice,
          }));
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to load designer data");
      } finally {
        setLoading(false);
      }
    };

    loadDesignerData();
  }, [productId, slug, allProducts]);

  // Send real-time updates to iframe preview on every change
  const sendPreviewUpdate = useCallback(
    (updatedConfig: CustomLandingPageConfig, updatedSections: LandingSection[]) => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "CLP_PREVIEW_UPDATE",
            config: updatedConfig,
            sections: updatedSections,
            product,
          },
          "*"
        );
      }
    },
    [product]
  );

  const handleConfigChange = (newConfig: CustomLandingPageConfig) => {
    setConfig(newConfig);
    sendPreviewUpdate(newConfig, sections);
  };

  const handleSectionsChange = (newSections: LandingSection[]) => {
    setSections(newSections);
    sendPreviewUpdate(config, newSections);
  };

  // Listen for iframe ready message to push latest state immediately
  useEffect(() => {
    function handleReady(e: MessageEvent) {
      if (e.data && e.data.type === "CLP_PREVIEW_READY") {
        sendPreviewUpdate(config, sections);
      }
    }
    window.addEventListener("message", handleReady);
    return () => window.removeEventListener("message", handleReady);
  }, [config, sections, sendPreviewUpdate]);

  const handleSave = () => {
    if (!product?.id && !productId && !slug) {
      toast.error("Cannot save without a valid product ID");
      return;
    }

    startSaving(async () => {
      try {
        const payload: CustomLandingPageConfig = {
          ...config,
          productId: product?.id || productId,
          productSlug: product?.slug || slug,
          sectionsJson: JSON.stringify(sections),
        };

        await customLandingPageService.saveConfig(payload);
        toast.success("Landing page layout saved successfully!");
        setPreviewKey((k) => k + 1); // Refresh preview iframe
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to save landing page");
      }
    });
  };

  const previewLookup = product?.slug || slug || productId;
  const targetId = product?.id || productId || "";
  const previewUrl = previewLookup
    ? `/clp/${previewLookup}?preview=true${targetId ? `&productId=${targetId}` : ""}&v=${previewKey}`
    : "";

  const getDeviceFrameClass = () => {
    switch (previewDevice) {
      case "mobile":
        return "w-[375px] h-[720px] max-h-[88vh] rounded-[20px] border-[6px] border-slate-900 shadow-2xl";
      case "tablet":
        return "w-[768px] h-[820px] max-h-[88vh] rounded-[16px] border-[6px] border-slate-900 shadow-2xl";
      default:
        return "w-full h-full max-h-[92vh] rounded-xl border border-border shadow-lg";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background text-foreground animate-in fade-in">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Products</span>
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-foreground">Custom Landing Page Designer</h1>
            {product && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20 truncate max-w-xs">
                {product.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {product && (
            <a
              href={`/clp/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-all cursor-pointer shadow-2xs"
            >
              <ExternalLink className="size-3.5" />
              <span>Live Site</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                <span>Save Layout</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace: Split View */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-muted/20">
          <div className="size-9 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-muted-foreground">Loading interactive workspace...</p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Pane: Visual Section Editor */}
          <div className="w-80 md:w-96 flex-shrink-0 h-full overflow-hidden">
            <CustomLandingPageEditor
              config={config}
              sections={sections}
              onConfigChange={handleConfigChange}
              onSectionsChange={handleSectionsChange}
              isSaving={isSaving}
              onSave={handleSave}
              product={product}
              onSyncProductPrices={async (sizePrices: Record<string, number>) => {
                if (!product?.id || !product?.slug) return;
                try {
                  const updatedVariants = (product.variants || []).map((v) => ({
                    ...v,
                    priceOverride: sizePrices[v.name] ?? v.priceOverride,
                  }));
                  await apiClient.put(`/products/${product.slug}`, {
                    ...product,
                    variants: updatedVariants,
                  });
                  setProduct({ ...product, variants: updatedVariants });
                } catch (err) {
                  console.error("Failed to sync product prices:", err);
                }
              }}
            />
          </div>

          {/* Right Pane: Interactive Live Device Simulator */}
          <div className="flex-1 flex flex-col items-center p-4 bg-muted/40 h-full overflow-hidden relative">
            {/* Simulator Controls */}
            <div className="flex items-center justify-between w-full mb-3 px-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-xs uppercase font-bold tracking-widest text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                <span>Interactive Live Preview</span>
              </div>

              {/* Device Toggler */}
              <div className="flex items-center gap-1 bg-card border border-border p-1 rounded-lg shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    previewDevice === "desktop"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Desktop View (Full Screen)"
                >
                  <Monitor className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("tablet")}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    previewDevice === "tablet"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Tablet View (iPad/Tablet)"
                >
                  <Tablet className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    previewDevice === "mobile"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Mobile View (iPhone/Android)"
                >
                  <Smartphone className="size-4" />
                </button>
              </div>
            </div>

            {/* Viewport Frame */}
            <div className="flex-1 w-full flex items-center justify-center overflow-auto min-h-0 p-2">
              <div className={`transition-all duration-300 overflow-hidden bg-background ${getDeviceFrameClass()}`}>
                {previewUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    className="w-full h-full border-0 bg-background"
                    title="Landing Page Preview"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    No preview available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLandingPageDesignPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-xs text-muted-foreground">
          Loading designer...
        </div>
      }
    >
      <DesignerContent />
    </Suspense>
  );
}
