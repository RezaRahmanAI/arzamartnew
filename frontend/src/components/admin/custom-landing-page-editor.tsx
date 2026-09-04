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
  Palette,
  GripVertical,
} from "lucide-react";
import {
  LandingSection,
  CustomLandingPageConfig,
  CLPReview,
} from "@/lib/api/services/custom-landing-page.service";
import { Product } from "@/lib/shop-data";
import { useProducts } from "@/lib/products-store";
import { ImageUploader } from "@/components/image-uploader";
import { ColorGradientPicker } from "./color-gradient-picker";
import { TextStyleControl, TextStyleValue } from "./text-style-control";
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
  const { products: availableStoreProducts } = useProducts();
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");

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
                  {/* Universal Section Background Color Selector */}
                  {(() => {
                    const currentSectionBg =
                      (sec.settings?.backgroundColor as string) ||
                      (sec.type === "product-hero" ? config.customHeroBgColor || "#9333ea" : "");

                    const updateSectionBg = (newBg: string) => {
                      const updatedSec = {
                        ...sec,
                        settings: { ...sec.settings, backgroundColor: newBg },
                      };
                      if (sec.type === "product-hero") {
                        onConfigChange({ ...config, customHeroBgColor: newBg });
                      }
                      onSectionsChange(sections.map((s) => (s.id === sec.id ? updatedSec : s)));
                    };

                    return (
                      <ColorGradientPicker
                        value={currentSectionBg}
                        onChange={updateSectionBg}
                        label="সেকশন ব্যাকগ্রাউন্ড কালার / গ্র্যাডিয়েন্ট"
                        defaultColor={sec.type === "product-hero" ? "#9333ea" : "#ffffff"}
                      />
                    );
                  })()}

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

                      {/* Multi-Image Hero Gallery Uploader */}
                      <div className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                            <span>হিরো প্রোডাক্ট ছবি গ্যালারি (Multiple Images)</span>
                          </label>
                          <span className="text-[10px] text-primary font-bold">
                            {(config.customHeroImages?.length || (config.customHeroImageUrl ? 1 : 0))}টি ছবি
                          </span>
                        </div>

                        {/* List existing hero images */}
                        {config.customHeroImages && config.customHeroImages.length > 0 && (
                          <div className="grid grid-cols-4 gap-1.5 pt-1">
                            {config.customHeroImages.map((imgUrl, imgIdx) => (
                              <div key={imgIdx} className="relative aspect-square rounded-lg border border-border overflow-hidden group bg-background">
                                <img
                                  src={getImageUrl(imgUrl, "thumb")}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextImages = config.customHeroImages!.filter((_, i) => i !== imgIdx);
                                    onConfigChange({
                                      ...config,
                                      customHeroImages: nextImages,
                                      customHeroImageUrl: nextImages[0] || "",
                                    });
                                  }}
                                  className="absolute top-1 right-1 size-5 bg-destructive text-destructive-foreground rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                                  title="ছবি বাদ দিন"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                                {imgIdx === 0 && (
                                  <span className="absolute bottom-0 inset-x-0 bg-primary/90 text-primary-foreground text-[8px] font-bold text-center py-0.2">
                                    মেইন
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <ImageUploader
                          value=""
                          onChange={(url) => {
                            if (!url) return;
                            const current = config.customHeroImages || (config.customHeroImageUrl ? [config.customHeroImageUrl] : []);
                            const next = [...current, url];
                            onConfigChange({
                              ...config,
                              customHeroImages: next,
                              customHeroImageUrl: next[0] || url,
                            });
                          }}
                          label="নতুন ছবি যোগ করুন (গ্যালারিতে)"
                          sublabel="এখানে যুক্ত করা ছবিগুলো গ্রাহক স্লাইডার/থাম্বনেইল হিসেবে দেখতে পাবে।"
                          folder="landing-pages"
                        />

                        {((config.customHeroImages && config.customHeroImages.length > 0) || config.customHeroImageUrl) && (
                          <button
                            type="button"
                            onClick={() =>
                              onConfigChange({
                                ...config,
                                customHeroImageUrl: "",
                                customHeroImages: [],
                              })
                            }
                            className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                          >
                            মূল প্রোডাক্টের ডিফল্ট ছবিতে ফিরে যান (Reset Gallery)
                          </button>
                        )}
                      </div>

                      {/* Section Title & Typography */}
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

                      {/* Custom Product Name */}
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

                      {/* Issue 2: Custom Description Toggle & Textarea */}
                      <div className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase">
                            কাস্টম ডেসক্রিপশন সেকশন
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.isCustomHeroDescriptionVisible ?? true}
                              onChange={(e) =>
                                onConfigChange({
                                  ...config,
                                  isCustomHeroDescriptionVisible: e.target.checked,
                                })
                              }
                              className="size-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                            />
                            <span className="text-[11px] font-bold text-foreground">
                              {(config.isCustomHeroDescriptionVisible ?? true) ? "প্রদর্শিত (Yes)" : "লুকানো (No)"}
                            </span>
                          </label>
                        </div>

                        {(config.isCustomHeroDescriptionVisible ?? true) && (
                          <div className="space-y-1">
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
                              * ফাঁকা রাখলে আসল প্রোডাক্টের ডেসক্রিপশন স্বয়ংক্রিয়ভাবে দেখাবে।
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Typography Style Control for Hero */}
                      <TextStyleControl
                        label="হিরো সেকশন টেক্সট টাইপোগ্রাফি"
                        value={sec.settings?.textStyle as TextStyleValue}
                        onChange={(newStyle) => {
                          const updatedSec = {
                            ...sec,
                            settings: { ...sec.settings, textStyle: newStyle },
                          };
                          onSectionsChange(sections.map((s) => (s.id === sec.id ? updatedSec : s)));
                        }}
                      />
                    </div>
                  )}

                  {/* Discount CTA Editor */}
                  {sec.type === "discount-cta" && (
                    <div className="space-y-3 pt-1 text-xs">
                      {/* Promo Text */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          অফার শিরোনাম (হেডিং)
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

                      {/* Issue 4: Editable Discount CTA Subtext */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          ডিসকাউন্ট অফার বার্তা (যখন ফ্রি শিপিং নেই)
                        </label>
                        <input
                          type="text"
                          value={config.discountCtaText || ""}
                          onChange={(e) =>
                            onConfigChange({ ...config, discountCtaText: e.target.value })
                          }
                          placeholder="সীমিত সময়ের জন্য বিশেষ ছাড়ের সুযোগ গ্রহণ করুন।"
                          className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          * ডিফল্ট: "সীমিত সময়ের জন্য বিশেষ ছাড়ের সুযোগ গ্রহণ করুন।"
                        </p>
                      </div>

                      {/* Free Shipping Threshold & Custom Delivery CTA */}
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

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          ফ্রি ডেলিভারি বার্তা (টেমপ্লেট)
                        </label>
                        <input
                          type="text"
                          value={config.freeDeliveryCtaText || ""}
                          onChange={(e) =>
                            onConfigChange({ ...config, freeDeliveryCtaText: e.target.value })
                          }
                          placeholder="যেকোনো {qty}টি প্রোডাক্ট অর্ডার করলেই ফ্রি হোম ডেলিভারি!"
                          className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          * {`{qty}`} চিহ্নের জায়গায় কোয়ান্টিটি সংখ্যাটি বসবে।
                        </p>
                      </div>

                      {/* Typography Style Control for CTA */}
                      <TextStyleControl
                        label="ডিসকাউন্ট CTA টেক্সট স্টাইল"
                        value={sec.settings?.textStyle as TextStyleValue}
                        onChange={(newStyle) => {
                          const updatedSec = {
                            ...sec,
                            settings: { ...sec.settings, textStyle: newStyle },
                          };
                          onSectionsChange(sections.map((s) => (s.id === sec.id ? updatedSec : s)));
                        }}
                      />
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
                                const pIdentifier = String(p.slug || p.id || "");
                                if (!pIdentifier) return null;
                                const isMainProduct = Boolean(
                                  (product?.slug && p.slug === product.slug) ||
                                  (product?.id && p.id === product.id)
                                );
                                const selectedIds = (sec.settings?.selectedProductIds as string[]) || [];
                                const isChecked = isMainProduct || selectedIds.includes(pIdentifier);

                                return (
                                  <label
                                    key={pIdentifier}
                                    className={`flex items-center gap-2.5 p-1.5 rounded-md hover:bg-muted/40 cursor-pointer transition-colors ${
                                      isMainProduct ? "bg-emerald-500/10 border border-emerald-500/20" : ""
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={isMainProduct}
                                      checked={isChecked}
                                      onChange={(e) => {
                                        let newSelected: string[];
                                        if (e.target.checked) {
                                          newSelected = Array.from(new Set([...selectedIds, pIdentifier]));
                                        } else {
                                          newSelected = selectedIds.filter((id) => id !== pIdentifier && id !== p.id && id !== p.slug);
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

                  {/* Custom Dynamic Section Editor */}
                  {sec.type === "custom" && (
                    <CustomSectionEditor
                      section={sec}
                      onChange={handleCustomSectionChange}
                    />
                  )}

                  {/* Issue 6: Customer Reviews Section Editor (Add / Remove / Photo Proof) */}
                  {sec.type === "reviews" && (
                    <div className="space-y-3 pt-1 text-xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                          <Star className="size-3.5 text-amber-500" />
                          <span>কাস্টমার রিভিউ তালিকা ({config.reviews?.length || 0})</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const newRev: CLPReview = {
                              id: `rev-${Date.now()}`,
                              name: "নতুন গ্রাহক",
                              rating: 5,
                              comment: "অসাধারণ প্রোডাক্ট! দ্রুত ডেলিভারি পেয়েছি।",
                              verified: true,
                            };
                            const next = [...(config.reviews || []), newRev];
                            onConfigChange({ ...config, reviews: next });
                          }}
                          className="px-2 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer hover:opacity-90"
                        >
                          <Plus className="size-3" />
                          <span>রিভিউ যোগ করুন</span>
                        </button>
                      </div>

                      {/* List of Reviews */}
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {(config.reviews || []).map((rev, revIdx) => (
                          <div key={rev.id} className="p-2.5 rounded-lg border border-border bg-background space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-muted-foreground">রিভিউ #{revIdx + 1}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = (config.reviews || []).filter((_, i) => i !== revIdx);
                                  onConfigChange({ ...config, reviews: next });
                                }}
                                className="text-destructive hover:bg-destructive/10 p-1 rounded cursor-pointer transition-colors"
                                title="Delete Review"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-0.5">
                                <label className="text-[10px] text-muted-foreground">নাম</label>
                                <input
                                  type="text"
                                  value={rev.name}
                                  onChange={(e) => {
                                    const next = [...(config.reviews || [])];
                                    next[revIdx] = { ...next[revIdx], name: e.target.value };
                                    onConfigChange({ ...config, reviews: next });
                                  }}
                                  className="w-full h-7 px-2 bg-card border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>

                              <div className="space-y-0.5">
                                <label className="text-[10px] text-muted-foreground">রেটিং (১-৫ স্টার)</label>
                                <select
                                  value={rev.rating}
                                  onChange={(e) => {
                                    const next = [...(config.reviews || [])];
                                    next[revIdx] = { ...next[revIdx], rating: Number(e.target.value) };
                                    onConfigChange({ ...config, reviews: next });
                                  }}
                                  className="w-full h-7 px-2 bg-card border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                >
                                  {[5, 4, 3, 2, 1].map((st) => (
                                    <option key={st} value={st}>
                                      {st} Star {st === 5 ? "⭐⭐⭐⭐⭐" : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="space-y-0.5">
                              <label className="text-[10px] text-muted-foreground">মন্তব্য / রিভিউ টেক্সট</label>
                              <textarea
                                rows={2}
                                value={rev.comment}
                                onChange={(e) => {
                                  const next = [...(config.reviews || [])];
                                  next[revIdx] = { ...next[revIdx], comment: e.target.value };
                                  onConfigChange({ ...config, reviews: next });
                                }}
                                className="w-full p-1.5 bg-card border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                              />
                            </div>

                            {/* Photo Proof */}
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground">ছবি প্রুফ (ঐচ্ছিক)</label>
                              {rev.imageUrl ? (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={getImageUrl(rev.imageUrl, "thumb")}
                                    alt=""
                                    className="size-8 rounded object-cover border border-border shrink-0"
                                  />
                                  <input
                                    type="text"
                                    value={rev.imageUrl}
                                    onChange={(e) => {
                                      const next = [...(config.reviews || [])];
                                      next[revIdx] = { ...next[revIdx], imageUrl: e.target.value };
                                      onConfigChange({ ...config, reviews: next });
                                    }}
                                    className="flex-1 h-7 px-2 bg-card border border-border rounded text-[10px] text-foreground font-mono"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...(config.reviews || [])];
                                      next[revIdx] = { ...next[revIdx], imageUrl: "" };
                                      onConfigChange({ ...config, reviews: next });
                                    }}
                                    className="text-destructive text-[10px] hover:underline cursor-pointer"
                                  >
                                    মুছুন
                                  </button>
                                </div>
                              ) : (
                                <ImageUploader
                                  value=""
                                  onChange={(url) => {
                                    const next = [...(config.reviews || [])];
                                    next[revIdx] = { ...next[revIdx], imageUrl: url };
                                    onConfigChange({ ...config, reviews: next });
                                  }}
                                  label="গ্রাহকের ছবি আপলোড করুন"
                                  sublabel="প্রোডাক্ট পরিহিত বা আনবক্সিং ছবি"
                                  folder="landing-pages"
                                />
                              )}
                            </div>
                          </div>
                        ))}

                        {(!config.reviews || config.reviews.length === 0) && (
                          <div className="py-3 text-center text-muted-foreground text-[11px] bg-muted/20 rounded-lg">
                            এখনো কোনো কাস্টম রিভিউ যোগ করা হয়নি (ডিফল্ট রিভিউগুলো প্রদর্শিত হবে)।
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Order form default section */}
                  {sec.type === "order-form" && (
                    <div className="py-2 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg">
                      অর্ডার ফর্ম সেকশনটি স্বয়ংক্রিয়ভাবে অপটিমাইজড এবং লাইভ চেকআউট ও ইনস্ট্যান্ট অর্ডারের সাথে কানেক্টেড।
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
