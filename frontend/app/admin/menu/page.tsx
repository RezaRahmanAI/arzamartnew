"use client";

import React, { useState } from "react";
import { useSettings } from "@/context/settings-context";
import { useCategories } from "@/lib/categories-store";
import { MenuItem } from "@/types/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Menu,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Save,
  RotateCcw,
  ExternalLink,
  FolderOpen,
  Link as LinkIcon,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

const DEFAULT_HEADER_MENU: MenuItem[] = [
  { id: "nav_1", label: "Panjabi", url: "/category/panjabi", type: "category", active: true, displayOrder: 1 },
  { id: "nav_2", label: "Saree", url: "/category/saree", type: "category", active: true, displayOrder: 2 },
  { id: "nav_3", label: "Salwar Kameez", url: "/category/salwar-kameez", type: "category", active: true, displayOrder: 3 },
  { id: "nav_4", label: "Kurti", url: "/category/kurti", type: "category", active: true, displayOrder: 4 },
  { id: "nav_5", label: "Offers", url: "/offers", type: "custom", active: true, displayOrder: 5 },
];

export default function AdminMenuPage() {
  const { draftSettings, updateSection, saveSettings, resetDrafts, isSaving, hasUnsavedChanges } = useSettings();
  const { categories } = useCategories();

  const menuFromDraft = draftSettings?.navigation?.headerMenu;
  const currentMenu: MenuItem[] =
    Array.isArray(menuFromDraft) && menuFromDraft.length > 0
      ? menuFromDraft
      : DEFAULT_HEADER_MENU;

  // New item form state
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState<"category" | "custom">("custom");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState("");
  const [openInNewTab, setOpenInNewTab] = useState(false);

  const handleUpdateItems = (updated: MenuItem[]) => {
    const sorted = updated.map((item, idx) => ({ ...item, displayOrder: idx + 1 }));
    updateSection("navigation", { headerMenu: sorted });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    let finalLabel = newLabel.trim();
    let finalUrl = newUrl.trim();

    if (newType === "category") {
      const cat = categories.find((c) => c.slug === selectedCategorySlug);
      if (!cat) {
        toast.error("Please select a category");
        return;
      }
      finalLabel = finalLabel || cat.name;
      finalUrl = `/category/${cat.slug}`;
    }

    if (!finalLabel || !finalUrl) {
      toast.error("Please provide both label and URL");
      return;
    }

    // Ensure URL has leading slash if internal
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://") && !finalUrl.startsWith("/")) {
      finalUrl = `/${finalUrl}`;
    }

    const newItem: MenuItem = {
      id: `nav_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: finalLabel,
      url: finalUrl,
      type: newType,
      target: openInNewTab ? "_blank" : "_self",
      active: true,
      displayOrder: currentMenu.length + 1,
    };

    handleUpdateItems([...currentMenu, newItem]);
    setNewLabel("");
    setNewUrl("");
    setSelectedCategorySlug("");
    setOpenInNewTab(false);
    toast.success("Menu item added to header navigation");
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const newItems = [...currentMenu];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;

    handleUpdateItems(newItems);
  };

  const handleToggleActive = (id: string) => {
    const updated = currentMenu.map((item) =>
      item.id === id ? { ...item, active: !item.active } : item
    );
    handleUpdateItems(updated);
  };

  const handleDelete = (id: string) => {
    const updated = currentMenu.filter((item) => item.id !== id);
    handleUpdateItems(updated);
    toast.success("Menu item removed");
  };

  const handleItemChange = <K extends keyof MenuItem>(id: string, field: K, value: MenuItem[K]) => {
    const updated = currentMenu.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    handleUpdateItems(updated);
  };

  const applyPresetUrl = (label: string, url: string) => {
    setNewType("custom");
    setNewLabel(label);
    setNewUrl(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Menu className="size-5 text-primary" /> Header Navigation Builder
          </h2>
          <p className="text-xs text-muted-foreground">
            Customize header navigation links, categories, and custom campaign URLs.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {hasUnsavedChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetDrafts}
              className="gap-1 text-xs"
            >
              <RotateCcw className="size-3.5" /> Reset
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => saveSettings()}
            disabled={isSaving || !hasUnsavedChanges}
            className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="size-4" />
            {isSaving ? "Saving..." : "Save Navigation"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Add Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2 pb-2 border-b border-border">
              <Plus className="size-4 text-primary" /> Add New Menu Item
            </h3>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-muted-foreground">Quick Presets</Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPresetUrl("Offers", "/offers")}
                  className="text-[11px] px-2 py-1 bg-secondary/80 hover:bg-primary/10 hover:text-primary rounded border border-border transition-colors font-medium"
                >
                  ⚡ /offers
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetUrl("Track Order", "/account")}
                  className="text-[11px] px-2 py-1 bg-secondary/80 hover:bg-primary/10 hover:text-primary rounded border border-border transition-colors font-medium"
                >
                  📦 /account
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetUrl("Hot Deals", "/offers?tag=hot")}
                  className="text-[11px] px-2 py-1 bg-secondary/80 hover:bg-primary/10 hover:text-primary rounded border border-border transition-colors font-medium"
                >
                  🔥 /hot-deals
                </button>
              </div>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Link Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType("category")}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all ${
                      newType === "category"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <FolderOpen className="size-3.5" /> Store Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType("custom")}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all ${
                      newType === "custom"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <LinkIcon className="size-3.5" /> Custom URL
                  </button>
                </div>
              </div>

              {newType === "category" ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Select Category</Label>
                  <select
                    value={selectedCategorySlug}
                    onChange={(e) => {
                      setSelectedCategorySlug(e.target.value);
                      const cat = categories.find((c) => c.slug === e.target.value);
                      if (cat && !newLabel) setNewLabel(cat.name);
                    }}
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name} ({cat.slug})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Menu Label (নাম)</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Winter Collection or Offers"
                  className="h-9 text-xs"
                />
              </div>

              {newType === "custom" && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Target URL (লিংক)</Label>
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="e.g. /offers, /clp/special-deal or https://..."
                    className="h-9 text-xs font-mono"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="new-tab">
                  Open in new tab? (_blank)
                </Label>
                <Switch
                  id="new-tab"
                  checked={openInNewTab}
                  onCheckedChange={setOpenInNewTab}
                />
              </div>

              <Button type="submit" size="sm" className="w-full gap-2 text-xs font-bold mt-2">
                <Plus className="size-4" /> Add to Header Navigation
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: Menu List & Reordering */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Menu className="size-4 text-primary" /> Header Menu Items ({currentMenu.length})
              </h3>
              <span className="text-[11px] text-muted-foreground">
                Edit items inline and click Save Navigation
              </span>
            </div>

            {currentMenu.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs">
                No header menu items found. Add your first item using the form on the left.
              </div>
            ) : (
              <div className="space-y-3">
                {currentMenu.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex flex-col gap-3 p-3.5 rounded-xl border transition-all ${
                      item.active
                        ? "border-border bg-background"
                        : "border-border/50 bg-muted/40 opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMove(index, "up")}
                            className="p-1 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:hover:text-muted-foreground rounded hover:bg-secondary transition-colors"
                            title="Move up"
                          >
                            <MoveUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === currentMenu.length - 1}
                            onClick={() => handleMove(index, "down")}
                            className="p-1 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:hover:text-muted-foreground rounded hover:bg-secondary transition-colors"
                            title="Move down"
                          >
                            <MoveDown className="size-3.5" />
                          </button>
                        </div>

                        <div className="size-7 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs text-muted-foreground">
                          #{index + 1}
                        </div>

                        <span className="text-xs font-bold text-foreground">
                          {item.label || "Untitled Link"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleItemChange(
                              item.id,
                              "target",
                              item.target === "_blank" ? "_self" : "_blank"
                            )
                          }
                          className={`text-[11px] px-2 py-1 rounded border transition-colors flex items-center gap-1 font-medium ${
                            item.target === "_blank"
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-muted/50 border-border text-muted-foreground"
                          }`}
                          title="Toggle open in new tab"
                        >
                          <ExternalLink className="size-3" />
                          <span>{item.target === "_blank" ? "New Tab" : "Same Tab"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(item.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                            item.active
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                          title={item.active ? "Click to hide from header" : "Click to show on header"}
                        >
                          {item.active ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                          <span>{item.active ? "Visible" : "Hidden"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                          title="Delete menu item"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/50">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Label (ডিসপ্লে নাম)</Label>
                        <Input
                          value={item.label}
                          onChange={(e) => handleItemChange(item.id, "label", e.target.value)}
                          placeholder="Menu Label"
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Target URL (গন্তব্য লিংক)</Label>
                        <Input
                          value={item.url}
                          onChange={(e) => handleItemChange(item.id, "url", e.target.value)}
                          placeholder="/path or https://..."
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
