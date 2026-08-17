"use client";

import { useState } from "react";
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
} from "lucide-react";
import {
  LandingSection,
  CustomLandingPageConfig,
} from "@/lib/api/services/custom-landing-page.service";
import { CustomSectionEditor } from "./custom-section-editor";
import { AddComponentModal } from "./add-component-modal";

interface CustomLandingPageEditorProps {
  config: CustomLandingPageConfig;
  sections: LandingSection[];
  onConfigChange: (newConfig: CustomLandingPageConfig) => void;
  onSectionsChange: (newSections: LandingSection[]) => void;
  isSaving?: boolean;
  onSave?: () => void;
}

export function CustomLandingPageEditor({
  config,
  sections,
  onConfigChange,
  onSectionsChange,
  isSaving,
  onSave,
}: CustomLandingPageEditorProps) {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
                          className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          সেকশন শিরোনাম
                        </label>
                        <input
                          type="text"
                          value={config.productDetailsTitle || ""}
                          onChange={(e) =>
                            onConfigChange({ ...config, productDetailsTitle: e.target.value })
                          }
                          className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* Discount CTA Editor */}
                  {sec.type === "discount-cta" && (
                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          অফার মূল্য (৳)
                        </label>
                        <input
                          type="number"
                          value={config.promoPrice || ""}
                          onChange={(e) =>
                            onConfigChange({
                              ...config,
                              promoPrice: parseFloat(e.target.value) || undefined,
                            })
                          }
                          placeholder="ডিসকাউন্ট রেট"
                          className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          আগের মূল্য (৳)
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
                          placeholder="রেগুলার প্রাইস"
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

                  {/* Custom Dynamic Section (Layout A-E) */}
                  {sec.type === "custom" && (
                    <CustomSectionEditor section={sec} onChange={handleCustomSectionChange} />
                  )}

                  {/* Other default sections */}
                  {(sec.type === "product-select" ||
                    sec.type === "reviews" ||
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
