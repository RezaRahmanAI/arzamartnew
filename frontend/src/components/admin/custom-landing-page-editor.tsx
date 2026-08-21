"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Plus,
  Trash2,
  Sparkles,
  Clock,
  MessageSquare,
  ShoppingBag,
  Percent,
  Info,
  ShieldCheck,
  Boxes,
  Star,
  CheckCircle2,
  Layers,
  Search,
} from "lucide-react";
import {
  LandingSection,
  CustomLandingPageConfig,
} from "@/lib/api/services/custom-landing-page.service";
import { productsService } from "@/lib/api/services/products.service";
import { Product, products as staticProducts } from "@/lib/shop-data";
import { ImageUploader } from "@/components/image-uploader";
import { getImageUrl } from "@/lib/utils";
import dynamic from "next/dynamic";

const CustomSectionEditor = dynamic(
  () => import("./custom-section-editor").then((m) => m.CustomSectionEditor),
  { ssr: false }
);

const AddComponentModal = dynamic(
  () => import("./add-component-modal").then((m) => m.AddComponentModal),
  { ssr: false }
);

interface CustomLandingPageEditorProps {
  config: CustomLandingPageConfig;
  sections: LandingSection[];
  onConfigChange: (newConfig: CustomLandingPageConfig) => void;
  onSectionsChange: (newSections: LandingSection[]) => void;
  isSaving?: boolean;
  onSave?: () => void;
  product?: { id?: string; name?: string; slug?: string; imageUrl?: string; description?: string; shortDescription?: string; variants?: { id: string; name: string; priceOverride?: number }[]; price?: number; compareAtPrice?: number | null } | null;
  onSyncProductPrices?: (sizePrices: Record<string, number>) => void;
}

export function CustomLandingPageEditor({
  config,
  sections,
  onConfigChange,
  onSectionsChange,
  isSaving,
  onSave,
  product,
  onSyncProductPrices,
}: CustomLandingPageEditorProps) {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [availableStoreProducts, setAvailableStoreProducts] = useState<Product[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        const prods = await productsService.getAll();
        if (Array.isArray(prods) && prods.length > 0) {
          setAvailableStoreProducts(prods);
        } else {
          setAvailableStoreProducts(staticProducts);
        }
      } catch {
        setAvailableStoreProducts(staticProducts);
      }
    }
    loadProducts();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedSectionId((prev) => (prev === id ? null : id));
  };

  const toggleSectionVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s));
    onSectionsChange(updated);

    const toggled = updated.find((s) => s.id === id);
    if (toggled?.type === "marquee") {
      onConfigChange({ ...config, isMarqueeVisible: toggled.visible });
    } else if (toggled?.type === "countdown") {
      onConfigChange({ ...config, isTimerVisible: toggled.visible });
    }
  };

  const moveSection = (index: number, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sections.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...sections];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onSectionsChange(updated);
  };

  const removeSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sections.filter((s) => s.id !== id);
    onSectionsChange(updated);
    if (expandedSectionId === id) setExpandedSectionId(null);
  };

  const handleAddSection = (newSection: LandingSection) => {
    onSectionsChange([...sections, newSection]);
    setExpandedSectionId(newSection.id);
  };

  const handleCustomSectionChange = (updatedSection: LandingSection) => {
    const updated = sections.map((s) => (s.id === updatedSection.id ? updatedSection : s));
    onSectionsChange(updated);
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "marquee":
        return <MessageSquare className="size-4 text-sky-500" />;
      case "countdown":
        return <Clock className="size-4 text-amber-500" />;
      case "hero":
        return <Sparkles className="size-4 text-emerald-500" />;
      case "product-hero":
        return <ShoppingBag className="size-4 text-purple-500" />;
      case "discount-cta":
        return <Percent className="size-4 text-green-500" />;
      case "info-banner":
        return <Info className="size-4 text-blue-500" />;
      case "trust-banner":
        return <ShieldCheck className="size-4 text-teal-500" />;
      case "product-select":
        return <Boxes className="size-4 text-indigo-500" />;
      case "reviews":
        return <Star className="size-4 text-yellow-500" />;
      case "order-form":
        return <CheckCircle2 className="size-4 text-rose-500" />;
      default:
        return <Layers className="size-4 text-primary" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground border-r border-border select-none">
      {/* Editor Top Actions */}
      <div className="p-3.5 border-b border-border bg-muted/20 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Landing Page Layout ({sections.length})
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="size-3.5" />
          <span>Add Section</span>
        </button>
      </div>

      {/* Accordion Sections List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sections.map((sec, index) => {
          const isExpanded = expandedSectionId === sec.id;
          return (
            <div
              key={sec.id}
              className={`rounded-xl border transition-all ${
                isExpanded
                  ? "border-primary bg-primary/5 shadow-xs"
                  : sec.visible
                  ? "border-border bg-card hover:border-primary/40"
                  : "border-border/60 bg-muted/40 opacity-70"
              }`}
            >
              {/* Accordion Header */}
              <div
                onClick={() => toggleExpand(sec.id)}
                className="flex items-center justify-between p-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                    {getSectionIcon(sec.type)}
                  </div>
                  <span className="text-xs font-semibold text-foreground truncate">
                    {sec.label}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Reorder Up */}
                  <button
                    type="button"
                    onClick={(e) => moveSection(index, "up", e)}
                    disabled={index === 0}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 cursor-pointer"
                    title="Move Up"
                  >
                    <MoveUp className="size-3" />
                  </button>

                  {/* Reorder Down */}
                  <button
                    type="button"
                    onClick={(e) => moveSection(index, "down", e)}
                    disabled={index === sections.length - 1}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 cursor-pointer"
                    title="Move Down"
                  >
                    <MoveDown className="size-3" />
                  </button>

                  {/* Visibility Toggle */}
                  <button
                    type="button"
                    onClick={(e) => toggleSectionVisibility(sec.id, e)}
                    className={`p-1 rounded cursor-pointer ${
                      sec.visible
                        ? "text-primary hover:bg-primary/10"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    title={sec.visible ? "Visible on Page" : "Hidden"}
                  >
                    {sec.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </button>

                  {/* Delete (Custom Section) */}
                  {sec.type === "custom" && (
                    <button
                      type="button"
                      onClick={(e) => removeSection(sec.id, e)}
                      className="p-1 rounded text-destructive hover:bg-destructive/10 cursor-pointer"
                      title="Delete Section"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}

                  {/* Accordion Arrow */}
                  <div className="p-1 text-muted-foreground">
                    {isExpanded ? (
                      <ChevronUp className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )}
                  </div>
                </div>
              </div>

              {/* Accordion Body Editor */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-border/60 space-y-3 animate-in fade-in-50">
                  {/* Marquee Bar Editor */}
                  {sec.type === "marquee" && (
                    <div className="space-y-2 pt-1 text-xs">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Marquee Ticker Text
                      </label>
                      <textarea
                        rows={2}
                        value={config.marqueeText || ""}
                        onChange={(e) =>
                          onConfigChange({ ...config, marqueeText: e.target.value })
                        }
                        placeholder="অফার ব্যানার টেক্সট..."
                        className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}

                  {/* Countdown Timer Editor */}
                  {sec.type === "countdown" && (
                    <div className="space-y-3 pt-1 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          কাউন্টডাউন হেডার টাইটেল
                        </label>
                        <input
                          type="text"
                          value={config.headerTitle || ""}
                          onChange={(e) =>
                            onConfigChange({ ...config, headerTitle: e.target.value })
                          }
                          className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          সময়কাল (মোট মিনিট)
                        </label>
                        <input
                          type="number"
                          value={config.relativeTimerTotalMinutes ?? 120}
                          onChange={(e) =>
                            onConfigChange({
                              ...config,
                              relativeTimerTotalMinutes: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* Hero / Promo Editor */}
                  {sec.type === "hero" && (
                    <div className="space-y-2 pt-1 text-xs">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        প্রোমো / অফার টেক্সট
                      </label>
                      <input
                        type="text"
                        value={config.promoText || ""}
                        onChange={(e) =>
                          onConfigChange({ ...config, promoText: e.target.value })
                        }
                        placeholder="যেমন: আজকের বিশেষ অফার!"
                        className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}

                  {/* Product Hero Editor */}
                  {sec.type === "product-hero" && (
                    <div className="space-y-3 pt-1 text-xs">
                      {/* Live Preview Card */}
                      {product && (
                        <div className="rounded-lg border border-border bg-background overflow-hidden">
                          <div className="grid grid-cols-2 gap-0">
                            {/* Image */}
                            <div className="aspect-square bg-muted/40 relative overflow-hidden">
                              {(config.customHeroImageUrl || product.imageUrl) ? (
                                <img
                                  src={getImageUrl(config.customHeroImageUrl || product.imageUrl)}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">No Image</div>
                              )}
                              {config.customHeroImageUrl && (
                                <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded shadow">
                                  কাস্টম ইমেজ
                                </span>
                              )}
                            </div>
                            {/* Details */}
                            <div className="p-2 space-y-1.5 flex flex-col justify-center">
                              <span className="text-[9px] font-bold text-primary uppercase tracking-widest">
                                {config?.productDetailsTitle || "🔥 প্রোডাক্ট ডিটেইলস"}
                              </span>
                              <p className="text-[11px] font-black text-foreground leading-tight">
                                {config?.featuredProductName || product.name}
                              </p>
                              {(config.customHeroDescription || product.shortDescription || product.description) && (
                                <p className="text-[9px] text-muted-foreground leading-snug line-clamp-3">
                                  {config.customHeroDescription || product.shortDescription || product.description}
                                </p>
                              )}
                              <span className="text-[8px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded inline-block w-fit">
                                ক্যাশ অন ডেলিভারি
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Background Color Picker */}
                      <div className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
                          <span>সেকশন ব্যাকগ্রাউন্ড কালার</span>
                          <span className="text-[10px] font-mono text-foreground font-normal">{config.customHeroBgColor || "#9333ea"}</span>
                        </label>
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.customHeroBgColor || "#9333ea"}
                            onChange={(e) =>
                              onConfigChange({ ...config, customHeroBgColor: e.target.value })
                            }
                            className="size-8 rounded border border-border cursor-pointer bg-transparent p-0.5"
                          />
                          
                          {/* Quick Color Presets */}
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {[
                              { label: "Purple (ছবি অনুযায়ী)", color: "#9333ea" },
                              { label: "Magenta / Rose", color: "#c026d3" },
                              { label: "Deep Violet", color: "#6b21a8" },
                              { label: "Emerald Green", color: "#059669" },
                              { label: "Navy Blue", color: "#1e3a8a" },
                              { label: "Dark Slate", color: "#0f172a" },
                              { label: "Fire Red", color: "#dc2626" },
                            ].map((p) => (
                              <button
                                key={p.color}
                                type="button"
                                title={p.label}
                                onClick={() => onConfigChange({ ...config, customHeroBgColor: p.color })}
                                className={`size-6 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                                  (config.customHeroBgColor || "#9333ea").toLowerCase() === p.color.toLowerCase()
                                    ? "border-white ring-2 ring-primary scale-110"
                                    : "border-border"
                                }`}
                                style={{ backgroundColor: p.color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Custom Image Uploader */}
                      <div className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-2">
                        <ImageUploader
                          value={config.customHeroImageUrl || ""}
                          onChange={(url) =>
                            onConfigChange({ ...config, customHeroImageUrl: url })
                          }
                          label="হিরো সেকশনের প্রোডাক্ট ছবি পরিবর্তন করুন"
                          sublabel="ডিফল্ট ছবির বদলে ল্যান্ডিং পেজে এই কাস্টম ছবিটি বড় আকারে দেখানো হবে।"
                          folder="landing-pages"
                        />
                        {config.customHeroImageUrl && (
                          <button
                            type="button"
                            onClick={() => onConfigChange({ ...config, customHeroImageUrl: "" })}
                            className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                          >
                            মূল প্রোডাক্টের ছবিতে ফিরে যান (Reset)
                          </button>
                        )}
                      </div>

                      {/* Editable Fields */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          সেকশন শিরোনাম (ঐচ্ছিক)
                        </label>
                        <input
                          type="text"
                          value={config.productDetailsTitle || ""}
                          onChange={(e) =>
                            onConfigChange({ ...config, productDetailsTitle: e.target.value })
                          }
                          placeholder="🔥 প্রোডাক্ট ডিটেইলস"
                          className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          কাস্টম প্রোডাক্ট শিরোনাম (ঐচ্ছিক)
                        </label>
                        <input
                          type="text"
                          value={config.featuredProductName || ""}
                          onChange={(e) =>
                            onConfigChange({ ...config, featuredProductName: e.target.value })
                          }
                          placeholder={product?.name || "প্রোডাক্ট নাম"}
                          className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          কাস্টম বর্ণনা / ডেসক্রিপশন (ঐচ্ছিক)
                        </label>
                        <textarea
                          rows={3}
                          value={config.customHeroDescription || ""}
                          onChange={(e) =>
                            onConfigChange({ ...config, customHeroDescription: e.target.value })
                          }
                          placeholder={product?.shortDescription || product?.description || "কাস্টম ডেসক্রিপশন লিখুন..."}
                          className="w-full p-2 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          * এটি শুধু এই ল্যান্ডিং পেজে দেখাবে, আসল প্রোডাক্টের ডাটায় কোনো পরিবর্তন হবে না।
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Discount CTA Editor */}
                  {sec.type === "discount-cta" && (
                    <div className="space-y-2 pt-1 text-xs">
                      {/* MRP / Original Price */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          MRP / আগের মূল্য (৳)
                        </label>
                        <input
                          type="number"
                          value={config.originalPrice || ""}
                          onChange={(e) =>
                            onConfigChange({
                              ...config,
                              originalPrice: parseFloat(e.target.value) || undefined,
                            })
                          }
                          placeholder="যেমন: ১২০০"
                          className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {!config.originalPrice && product?.compareAtPrice && (
                          <p className="text-[10px] text-muted-foreground italic">
                            প্রোডাক্ট MRP থেকে: ৳{product.compareAtPrice.toLocaleString()}
                          </p>
                        )}
                      </div>

                      {/* Size-wise Selling Prices */}
                      {product?.variants && product.variants.length > 0 && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase">
                            সাইজ অনুযায়ী বিক্রয় মূল্য (৳)
                          </label>
                          <div className="space-y-1">
                            {product.variants.map((v) => {
                              const currentPrice = config.sizePrices?.[v.name] ?? v.priceOverride ?? product.price ?? 0;
                              return (
                                <div key={v.id} className="flex items-center gap-2">
                                  <span className="w-16 text-[11px] font-semibold text-muted-foreground truncate">
                                    {v.name}
                                  </span>
                                  <input
                                    type="number"
                                    value={currentPrice || ""}
                                    onChange={(e) => {
                                      const newPrice = parseFloat(e.target.value) || 0;
                                      const newSizePrices = { ...(config.sizePrices || {}), [v.name]: newPrice };
                                      onConfigChange({ ...config, sizePrices: newSizePrices });
                                      onSyncProductPrices?.(newSizePrices);
                                    }}
                                    placeholder="৳"
                                    className="flex-1 h-7 px-2 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-muted-foreground italic">
                            মান পরিবর্তন করলে প্রোডাক্ট সাইজ প্রাইসও আপডেট হবে
                          </p>
                        </div>
                      )}

                      {/* Promo Text */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          অফার টেক্সট
                        </label>
                        <input
                          type="text"
                          value={config.promoText || ""}
                          onChange={(e) =>
                            onConfigChange({ ...config, promoText: e.target.value })
                          }
                          placeholder="🔥 আজকের স্পেশাল কম্বো অফার!"
                          className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      {/* Free Shipping Threshold */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          ফ্রি ডেলিভারি কোয়ান্টিটি
                        </label>
                        <input
                          type="number"
                          value={config.freeShippingThresholdQuantity || ""}
                          onChange={(e) =>
                            onConfigChange({
                              ...config,
                              freeShippingThresholdQuantity: parseInt(e.target.value) || null,
                            })
                          }
                          placeholder="যেমন: 2"
                          className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* Trust Banner Editor */}
                  {sec.type === "trust-banner" && (
                    <div className="space-y-2 pt-1 text-xs">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        বিশ্বাসযোগ্যতার বার্তা / রিটার্ন পলিসি
                      </label>
                      <textarea
                        rows={3}
                        value={config.trustBannerText || ""}
                        onChange={(e) =>
                          onConfigChange({ ...config, trustBannerText: e.target.value })
                        }
                        placeholder="দেখে চেক করে রিসিভ করতে পারবেন..."
                        className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}

                  {/* Info Banner Editor */}
                  {sec.type === "info-banner" && (
                    <div className="space-y-2 pt-1 text-xs">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        ইনফো ব্যানার মেসেজ / বার্তা
                      </label>
                      <textarea
                        rows={2}
                        value={
                          (sec.settings?.text as string) ??
                          (sec.settings?.infoBannerText as string) ??
                          config.trustBannerDescription ??
                          "পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধের সম্পূর্ণ নিশ্চয়তা!"
                        }
                        onChange={(e) => {
                          const updatedSec = {
                            ...sec,
                            settings: { ...sec.settings, text: e.target.value },
                          };
                          onSectionsChange(sections.map((s) => (s.id === sec.id ? updatedSec : s)));
                        }}
                        placeholder="পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধের সম্পূর্ণ নিশ্চয়তা!"
                        className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}

                  {/* Product Selection Section Editor */}
                  {sec.type === "product-select" && (
                    <div className="space-y-3 pt-1 text-xs">
                      {/* Search & Actions */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase">
                            পণ্য তালিকা ({availableStoreProducts.length})
                          </label>
                          <span className="text-[11px] font-bold text-primary">
                            {((sec.settings?.selectedProductIds as string[]) || []).length}টি সিলেক্টেড
                          </span>
                        </div>

                        <div className="relative">
                          <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                          <input
                            type="text"
                            value={productSearchQuery}
                            onChange={(e) => setProductSearchQuery(e.target.value)}
                            placeholder="প্রোডাক্ট খুঁজুন..."
                            className="w-full h-8 pl-8 pr-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        {/* Product Checkboxes List */}
                        <div className="max-h-60 overflow-y-auto space-y-1.5 border border-border rounded-lg p-2 bg-background/50 divide-y divide-border/40">
                          {availableStoreProducts
                            .filter((p) =>
                              p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
                            )
                            .map((p) => {
                              const isMainProduct = Boolean((product?.id && p.id === product.id) || (product?.slug && p.slug === product.slug));
                              const selectedIds = (sec.settings?.selectedProductIds as string[]) || [];
                              const isChecked = Boolean(isMainProduct || (p.id && selectedIds.includes(p.id)) || (p.slug && selectedIds.includes(p.slug)));

                              return (
                                <label
                                  key={p.id || p.slug}
                                  className={`flex items-center gap-2.5 p-1.5 rounded-md hover:bg-muted/40 cursor-pointer transition-colors ${
                                    isMainProduct ? "bg-emerald-500/10 border border-emerald-500/20" : ""
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={isMainProduct}
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const pKey = p.id || p.slug;
                                      let newSelected: string[];
                                      if (e.target.checked) {
                                        newSelected = [...selectedIds.filter((id) => id !== p.id && id !== p.slug), pKey];
                                      } else {
                                        newSelected = selectedIds.filter((id) => id !== p.id && id !== p.slug);
                                      }
                                      const updatedSec = {
                                        ...sec,
                                        settings: { ...sec.settings, selectedProductIds: newSelected },
                                      };
                                      onSectionsChange(sections.map((s) => (s.id === sec.id ? updatedSec : s)));
                                    }}
                                    className="rounded border-border text-primary focus:ring-primary size-4 cursor-pointer"
                                  />
                                  <img
                                    src={getImageUrl(p.image || (p.images?.[0] ?? ""), "thumb")}
                                    alt={p.name}
                                    width={32}
                                    height={32}
                                    className="size-8 rounded object-cover border border-border shrink-0 bg-background"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold text-foreground text-xs truncate">{p.name}</p>
                                      {isMainProduct && (
                                        <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded shrink-0">
                                          মূল প্রোডাক্ট
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                      ৳{p.price.toLocaleString()}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}

                          {availableStoreProducts.length === 0 && (
                            <div className="py-4 text-center text-xs text-muted-foreground">
                              প্রোডাক্ট লোড হচ্ছে...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other default sections */}
                  {(sec.type === "reviews" ||
                    sec.type === "order-form" ||
                    sec.type === "info-banner") && (
                    <div className="py-2 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg">
                      এই সেকশনটি স্বয়ংক্রিয়ভাবে অপটিমাইজড এবং লাইভ ডাটার সাথে কানেক্টেড।
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Component Modal */}
      <AddComponentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddSection={handleAddSection}
      />
    </div>
  );
}
