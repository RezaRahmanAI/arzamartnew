"use client";

import React, { useState } from "react";
import { useSettings } from "@/context/settings-context";
import { SystemSettings, ShippingRule } from "@/types/settings";
import { Input } from "@/components/ui/input";
import { ImageUploader } from "@/components/image-uploader";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Globe,
  Palette,
  PhoneCall,
  Truck,
  Share2,
  Building2,
  Search,
  PanelBottom as LayoutFooter,
  ShoppingCart,
  BellRing,
  ShieldCheck,
  RotateCcw,
  Save,
  Trash2,
  Plus,
  Pencil,
  RefreshCw,
  History,
  Check,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SettingsCategoryKey = keyof SystemSettings | "auditLogs";

interface CategoryTab {
  key: SettingsCategoryKey;
  label: string;
  description: string;
  icon: React.ElementType;
}

const CATEGORIES: CategoryTab[] = [
  { key: "general", label: "General Settings", description: "Website identity, currency, status & locale settings", icon: Globe },
  { key: "branding", label: "Branding & Appearance", description: "Logos, color palette, typography & theme styling", icon: Palette },
  { key: "contact", label: "Contact Information", description: "Support channels, office address & Google Maps", icon: PhoneCall },
  { key: "shipping", label: "Shipping Settings", description: "Shipping rates, delivery rules & COD availability", icon: Truck },
  { key: "socialMedia", label: "Social Media Links", description: "Social accounts, messenger & channel handles", icon: Share2 },
  { key: "business", label: "Business Information", description: "Trade license, BIN, VAT & legal tax details", icon: Building2 },
  { key: "seo", label: "SEO & Analytics", description: "Meta tags, verification codes, GA4 & Pixel IDs", icon: Search },
  { key: "footer", label: "Footer Settings", description: "Footer content, menus, badges & copyright text", icon: LayoutFooter },
  { key: "orders", label: "Order & Checkout", description: "Order limits, guest checkout & payment methods", icon: ShoppingCart },
  { key: "notifications", label: "Notification Channels", description: "SMS gateway, SMTP email server & WhatsApp API", icon: BellRing },
  { key: "advanced", label: "Advanced System & Logs", description: "Cache controls, debug mode & change audit history", icon: ShieldCheck },
];

export default function AdminSettingsPage() {
  const {
    draftSettings,
    auditLogs,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    updateSection,
    saveSettings,
    resetDrafts,
    resetSectionDraft,
    resetSectionToDefaults,
    resetToFactoryDefaults,
    clearSystemCache,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<SettingsCategoryKey>("general");
  const [searchFilter, setSearchFilter] = useState("");
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetScope, setResetScope] = useState<"current" | "all">("current");

  const currentCategory = CATEGORIES.find((c) => c.key === activeTab);
  const isSystemSettingsTab = activeTab !== "auditLogs";

  const handleConfirmReset = async () => {
    setResetModalOpen(false);
    if (resetScope === "current") {
      if (isSystemSettingsTab) {
        await resetSectionToDefaults(activeTab as keyof SystemSettings, true);
      }
    } else {
      await resetToFactoryDefaults(true);
    }
  };

  const [newShippingRule, setNewShippingRule] = useState<{ name: string; charge: number; deliveryTime: string }>({
    name: "",
    charge: 60,
    deliveryTime: "2-3 Days",
  });
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [editingShippingRule, setEditingShippingRule] = useState<ShippingRule | null>(null);

  // ─── Source Pages & Social Pages CRUD state ───
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [editingSourceOrigName, setEditingSourceOrigName] = useState<string | null>(null);
  const [editingSourceNewName, setEditingSourceNewName] = useState<string>("");
  const [newPageInputs, setNewPageInputs] = useState<Record<string, string>>({});

  const handleAddSource = () => {
    const name = newSourceName.trim();
    if (!name) {
      toast.error("Please enter a source name");
      return;
    }
    const existing = draftSettings.socialMedia.sources || {};
    if (existing[name]) {
      toast.error(`Source "${name}" already exists`);
      return;
    }
    updateSection("socialMedia", { sources: { ...existing, [name]: [] } });
    setNewSourceName("");
    setShowSourceModal(false);
    setExpandedSource(name);
    toast.success(`Source "${name}" added!`);
  };

  const handleDeleteSource = (sourceName: string) => {
    const existing = { ...(draftSettings.socialMedia.sources || {}) };
    delete existing[sourceName];
    updateSection("socialMedia", { sources: existing });
    if (expandedSource === sourceName) setExpandedSource(null);
    toast.info(`Source "${sourceName}" removed`);
  };

  const handleAddPage = (sourceName: string) => {
    const pageName = (newPageInputs[sourceName] || "").trim();
    if (!pageName) {
      toast.error("Please enter a page name");
      return;
    }
    const existing = { ...(draftSettings.socialMedia.sources || {}) };
    const pages = [...(existing[sourceName] || [])];
    if (pages.includes(pageName)) {
      toast.error(`Page "${pageName}" already exists under ${sourceName}`);
      return;
    }
    pages.push(pageName);
    existing[sourceName] = pages;
    updateSection("socialMedia", { sources: existing });
    setNewPageInputs((prev) => ({ ...prev, [sourceName]: "" }));
    toast.success(`Page "${pageName}" added to ${sourceName}`);
  };

  const handleDeletePage = (sourceName: string, pageIdx: number) => {
    const existing = { ...(draftSettings.socialMedia.sources || {}) };
    const pages = [...(existing[sourceName] || [])];
    const removed = pages.splice(pageIdx, 1);
    existing[sourceName] = pages;
    updateSection("socialMedia", { sources: existing });
    toast.info(`Removed "${removed[0]}" from ${sourceName}`);
  };

  // Filter categories by search input
  const filteredCategories = CATEGORIES.filter(
    (c) =>
      c.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading System Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-sm sticky top-0 z-10 backdrop-blur-md bg-card/95">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Centralized System Settings</h2>
              {hasUnsavedChanges && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 border border-amber-500/20 animate-pulse">
                  <AlertCircle className="size-3" /> Unsaved Changes
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Manage global configurations for the entire platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => resetDrafts()}
            disabled={!hasUnsavedChanges || isSaving}
            className="h-9 text-xs"
            title="Discard unsaved edits in current draft"
          >
            <RotateCcw className="size-3.5 mr-1" />
            Discard
          </Button>

          {isSystemSettingsTab ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  className="h-9 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Reset Defaults</span>
                  <ChevronDown className="size-3 ml-0.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs font-bold text-foreground">
                  Reset Settings ({currentCategory?.label})
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => resetSectionToDefaults(activeTab as keyof SystemSettings, false)}
                  className="text-xs cursor-pointer"
                >
                  <RotateCcw className="size-3.5 mr-2 text-primary" />
                  Reset {currentCategory?.label} (Draft)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setResetScope("current");
                    setResetModalOpen(true);
                  }}
                  className="text-xs cursor-pointer text-destructive focus:text-destructive"
                >
                  <AlertTriangle className="size-3.5 mr-2" />
                  Reset {currentCategory?.label} in Database...
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setResetScope("all");
                    setResetModalOpen(true);
                  }}
                  className="text-xs cursor-pointer text-destructive font-semibold focus:text-destructive"
                >
                  <AlertTriangle className="size-3.5 mr-2" />
                  Full System Reset (All Tabs)...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setResetScope("all");
                setResetModalOpen(true);
              }}
              disabled={isSaving}
              className="h-9 text-xs text-destructive hover:bg-destructive/10"
            >
              System Reset...
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={() => saveSettings()}
            disabled={!hasUnsavedChanges || isSaving}
            className="h-9 text-xs bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="size-3.5 mr-1.5" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main 2-Column Module Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Categories Submenu & Search (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="rounded-xl border border-border bg-card p-3 shadow-card space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search settings category..."
                className="h-9 pl-8 text-xs"
                autoComplete="off"
                name="settings_search_query_no_autofill"
              />
            </div>

            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
              {filteredCategories.map((cat) => {
                const IconComponent = cat.icon;
                const isActive = activeTab === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveTab(cat.key)}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all cursor-pointer ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                        : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <IconComponent className={`size-4 mt-0.5 shrink-0 ${isActive ? "text-primary-foreground" : "text-primary"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold leading-snug truncate">{cat.label}</div>
                      <div className={`text-[11px] leading-tight line-clamp-1 mt-0.5 ${isActive ? "opacity-90" : "opacity-70"}`}>
                        {cat.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Active Category Config Panel (8 Cols) */}
        <div className="lg:col-span-8">
          <div className="rounded-xl border border-border bg-card shadow-card p-5 space-y-6">
            {/* 1. GENERAL SETTINGS */}
            {activeTab === "general" && (
              <div className="space-y-5">
                <div className="border-b border-border/60 pb-3">
                  <h3 className="text-base font-bold text-foreground">General Settings</h3>
                  <p className="text-xs text-muted-foreground">Configure site identity, default currency, timezones, and maintenance mode</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Website Name</Label>
                    <Input
                      value={draftSettings.general.websiteName}
                      onChange={(e) => updateSection("general", { websiteName: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Short Name / Brand Abbreviation</Label>
                    <Input
                      value={draftSettings.general.websiteShortName}
                      onChange={(e) => updateSection("general", { websiteShortName: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Website Tagline</Label>
                  <Input
                    value={draftSettings.general.tagline}
                    onChange={(e) => updateSection("general", { tagline: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Global Site Description (SEO Summary)</Label>
                  <Textarea
                    value={draftSettings.general.description}
                    onChange={(e) => updateSection("general", { description: e.target.value })}
                    rows={3}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Website Operational Status</Label>
                    <select
                      value={draftSettings.general.websiteStatus}
                      onChange={(e) => updateSection("general", { websiteStatus: e.target.value as "live" | "maintenance" })}
                      className="h-9 w-full rounded border border-border bg-background px-2 text-xs font-medium"
                    >
                      <option value="live">Live (Active Online)</option>
                      <option value="maintenance">Maintenance Mode</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Default Currency</Label>
                    <div className="flex gap-2">
                      <Input
                        value={draftSettings.general.defaultCurrency}
                        onChange={(e) => updateSection("general", { defaultCurrency: e.target.value })}
                        className="h-9 text-xs"
                      />
                      <Input
                        value={draftSettings.general.currencySymbol}
                        onChange={(e) => updateSection("general", { currencySymbol: e.target.value })}
                        placeholder="Symbol"
                        className="h-9 w-20 text-xs font-bold text-center"
                      />
                    </div>
                  </div>
                </div>

                {draftSettings.general.websiteStatus === "maintenance" && (
                  <div className="space-y-1 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <Label className="text-xs font-semibold text-amber-700">Maintenance Banner Message</Label>
                    <Textarea
                      value={draftSettings.general.maintenanceMessage}
                      onChange={(e) => updateSection("general", { maintenanceMessage: e.target.value })}
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
                  <div className="space-y-1">
                    <Label className="text-xs">Timezone</Label>
                    <Input
                      value={draftSettings.general.timeZone}
                      onChange={(e) => updateSection("general", { timeZone: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date Format</Label>
                    <Input
                      value={draftSettings.general.dateFormat}
                      onChange={(e) => updateSection("general", { dateFormat: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Time Format</Label>
                    <select
                      value={draftSettings.general.timeFormat}
                      onChange={(e) => updateSection("general", { timeFormat: e.target.value })}
                      className="h-9 w-full rounded border border-border bg-background px-2 text-xs"
                    >
                      <option value="12-hour">12-hour (1:30 PM)</option>
                      <option value="24-hour">24-hour (13:30)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 2. BRANDING SETTINGS */}
            {activeTab === "branding" && (
              <div className="space-y-5">
                <div className="border-b border-border/60 pb-3">
                  <h3 className="text-base font-bold text-foreground">Branding & Appearance</h3>
                  <p className="text-xs text-muted-foreground">Manage logos, brand primary colors, border radius, and typography</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <ImageUploader
                    label="Header Logo"
                    sublabel="Upload your primary brand logo"
                    value={draftSettings.branding.headerLogo}
                    onChange={(val) => updateSection("branding", { headerLogo: val })}
                  />
                  <ImageUploader
                    label="Footer Logo"
                    sublabel="Upload logo for the website footer"
                    value={draftSettings.branding.footerLogo}
                    onChange={(val) => updateSection("branding", { footerLogo: val })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <ImageUploader
                    label="Dark Mode Logo"
                    sublabel="Upload a logo optimized for dark backgrounds"
                    value={draftSettings.branding.darkLogo}
                    onChange={(val) => updateSection("branding", { darkLogo: val })}
                  />
                  <ImageUploader
                    label="Favicon (.ico / .png)"
                    sublabel="Upload small icon for browser tabs"
                    size="sm"
                    value={draftSettings.branding.favicon}
                    onChange={(val) => updateSection("branding", { favicon: val })}
                  />
                </div>

                {/* Color Palette Controls */}
                <div className="pt-2 border-t border-border/60 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Theme Color Palette</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Primary Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftSettings.branding.primaryColor}
                          onChange={(e) => updateSection("branding", { primaryColor: e.target.value })}
                          className="size-8 rounded border border-border cursor-pointer shrink-0"
                        />
                        <Input
                          value={draftSettings.branding.primaryColor}
                          onChange={(e) => updateSection("branding", { primaryColor: e.target.value })}
                          className="h-8 text-xs uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Secondary Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftSettings.branding.secondaryColor}
                          onChange={(e) => updateSection("branding", { secondaryColor: e.target.value })}
                          className="size-8 rounded border border-border cursor-pointer shrink-0"
                        />
                        <Input
                          value={draftSettings.branding.secondaryColor}
                          onChange={(e) => updateSection("branding", { secondaryColor: e.target.value })}
                          className="h-8 text-xs uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Accent Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftSettings.branding.accentColor}
                          onChange={(e) => updateSection("branding", { accentColor: e.target.value })}
                          className="size-8 rounded border border-border cursor-pointer shrink-0"
                        />
                        <Input
                          value={draftSettings.branding.accentColor}
                          onChange={(e) => updateSection("branding", { accentColor: e.target.value })}
                          className="h-8 text-xs uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Button Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftSettings.branding.buttonColor}
                          onChange={(e) => updateSection("branding", { buttonColor: e.target.value })}
                          className="size-8 rounded border border-border cursor-pointer shrink-0"
                        />
                        <Input
                          value={draftSettings.branding.buttonColor}
                          onChange={(e) => updateSection("branding", { buttonColor: e.target.value })}
                          className="h-8 text-xs uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notification & Toast Colors */}
                <div className="pt-2 border-t border-border/60 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notification & Alert Toast Colors</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Customize popup alert colors for completed actions, success states, and failed/error states.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Success / Completed Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftSettings.branding.toastSuccessColor || "#10b981"}
                          onChange={(e) => updateSection("branding", { toastSuccessColor: e.target.value })}
                          className="size-8 rounded border border-border cursor-pointer shrink-0"
                        />
                        <Input
                          value={draftSettings.branding.toastSuccessColor || "#10b981"}
                          onChange={(e) => updateSection("branding", { toastSuccessColor: e.target.value })}
                          className="h-8 text-xs uppercase"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Used when actions/orders complete successfully</p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-rose-600 dark:text-rose-400">Error / Didn&apos;t Work Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftSettings.branding.toastErrorColor || "#ef4444"}
                          onChange={(e) => updateSection("branding", { toastErrorColor: e.target.value })}
                          className="size-8 rounded border border-border cursor-pointer shrink-0"
                        />
                        <Input
                          value={draftSettings.branding.toastErrorColor || "#ef4444"}
                          onChange={(e) => updateSection("branding", { toastErrorColor: e.target.value })}
                          className="h-8 text-xs uppercase"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Used when an error occurs or action fails</p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-blue-600 dark:text-blue-400">Info / Notice Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draftSettings.branding.toastInfoColor || "#3b82f6"}
                          onChange={(e) => updateSection("branding", { toastInfoColor: e.target.value })}
                          className="size-8 rounded border border-border cursor-pointer shrink-0"
                        />
                        <Input
                          value={draftSettings.branding.toastInfoColor || "#3b82f6"}
                          onChange={(e) => updateSection("branding", { toastInfoColor: e.target.value })}
                          className="h-8 text-xs uppercase"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Used for neutral info alerts & reminders</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Border Radius</Label>
                    <select
                      value={draftSettings.branding.borderRadius}
                      onChange={(e) => updateSection("branding", { borderRadius: e.target.value })}
                      className="h-9 w-full rounded border border-border bg-background px-2 text-xs"
                    >
                      <option value="4px">Compact (4px)</option>
                      <option value="8px">Standard (8px)</option>
                      <option value="12px">Rounded (12px)</option>
                      <option value="9999px">Fully Pill (Fully Curved)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Font Family</Label>
                    <select
                      value={draftSettings.branding.fontFamily}
                      onChange={(e) => updateSection("branding", { fontFamily: e.target.value })}
                      className="h-9 w-full rounded border border-border bg-background px-2 text-xs"
                    >
                      <option value="Inter, sans-serif">Inter (Modern Clean)</option>
                      <option value="DM Sans, sans-serif">DM Sans (Friendly Geometric)</option>
                      <option value="Bricolage Grotesque, sans-serif">Bricolage Grotesque (Expressive Display)</option>
                      <option value="Roboto, sans-serif">Roboto (Classic Standard)</option>
                    </select>
                  </div>
                </div>

                {/* Live Swatch Preview */}
                <div className="p-4 bg-secondary/30 rounded-xl border border-border space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Eye className="size-4 text-primary" /> Live Palette & Styling Preview
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      style={{
                        backgroundColor: draftSettings.branding.buttonColor,
                        borderRadius: draftSettings.branding.borderRadius,
                      }}
                      className="px-4 py-2 text-xs font-bold text-white shadow"
                    >
                      Primary Button Action
                    </button>
                    <div
                      style={{
                        backgroundColor: draftSettings.branding.accentColor,
                        borderRadius: draftSettings.branding.borderRadius,
                      }}
                      className="px-3 py-1 text-xs font-semibold text-white"
                    >
                      Accent Badge
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. CONTACT INFORMATION */}
            {activeTab === "contact" && (
              <div className="space-y-5">
                <div className="border-b border-border/60 pb-3">
                  <h3 className="text-base font-bold text-foreground">Contact Information</h3>
                  <p className="text-xs text-muted-foreground">Manage support numbers, sales email, physical office address and map location</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Company Registered Name</Label>
                    <Input
                      value={draftSettings.contact.companyName}
                      onChange={(e) => updateSection("contact", { companyName: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Owner / Administrator Name</Label>
                    <Input
                      value={draftSettings.contact.ownerName}
                      onChange={(e) => updateSection("contact", { ownerName: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Support Phone</Label>
                    <Input
                      value={draftSettings.contact.supportPhone}
                      onChange={(e) => updateSection("contact", { supportPhone: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Sales Phone</Label>
                    <Input
                      value={draftSettings.contact.salesPhone}
                      onChange={(e) => updateSection("contact", { salesPhone: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">WhatsApp Official Number</Label>
                    <Input
                      value={draftSettings.contact.whatsAppNumber}
                      onChange={(e) => updateSection("contact", { whatsAppNumber: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Info Email Address</Label>
                    <Input
                      type="email"
                      value={draftSettings.contact.emailAddress}
                      onChange={(e) => updateSection("contact", { emailAddress: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Support Email Address</Label>
                    <Input
                      type="email"
                      value={draftSettings.contact.supportEmail}
                      onChange={(e) => updateSection("contact", { supportEmail: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Office Physical Address</Label>
                  <Textarea
                    value={draftSettings.contact.officeAddress}
                    onChange={(e) => updateSection("contact", { officeAddress: e.target.value })}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Google Map Embed URL</Label>
                  <Input
                    value={draftSettings.contact.googleMapEmbedUrl}
                    onChange={(e) => updateSection("contact", { googleMapEmbedUrl: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* 4. SHIPPING SETTINGS */}
            {activeTab === "shipping" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-foreground">Shipping & Delivery Management</h3>
                    <p className="text-xs text-muted-foreground">Configure unlimited custom shipping rules, rates, and free shipping triggers</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowShippingModal(true)}
                    className="h-8 text-xs font-semibold"
                  >
                    <Plus className="size-3.5 mr-1" /> Add Shipping Method
                  </Button>
                </div>

                {/* Free Shipping & COD Global Rules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-secondary/20 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">Enable Free Shipping</div>
                      <div className="text-[11px] text-muted-foreground">Auto-apply free delivery on orders above threshold</div>
                    </div>
                    <Switch
                      checked={draftSettings.shipping.enableFreeShipping}
                      onCheckedChange={(checked) => updateSection("shipping", { enableFreeShipping: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">Cash on Delivery (COD)</div>
                      <div className="text-[11px] text-muted-foreground">Allow customers to pay upon delivery</div>
                    </div>
                    <Switch
                      checked={draftSettings.shipping.cashOnDeliveryAvailable}
                      onCheckedChange={(checked) => updateSection("shipping", { cashOnDeliveryAvailable: checked })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Free Shipping Order Amount Threshold (৳)</Label>
                  <Input
                    type="number"
                    value={draftSettings.shipping.freeShippingThreshold}
                    onChange={(e) => updateSection("shipping", { freeShippingThreshold: Number(e.target.value) })}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Custom Shipping Rules Table */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Active Shipping Methods ({draftSettings.shipping.rules.length})</Label>
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-secondary/40 border-b border-border font-semibold text-muted-foreground">
                        <tr>
                          <th className="py-2.5 px-3">Method Name</th>
                          <th className="py-2.5 px-2">Charge (৳)</th>
                          <th className="py-2.5 px-2">Delivery Time</th>
                          <th className="py-2.5 px-2">Status</th>
                          <th className="py-2.5 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {draftSettings.shipping.rules.map((rule) => (
                          <tr key={rule.id} className="hover:bg-secondary/20">
                            <td className="py-2.5 px-3 font-bold text-foreground">{rule.name}</td>
                            <td className="py-2.5 px-2 font-semibold">৳{rule.charge}</td>
                            <td className="py-2.5 px-2 text-muted-foreground">{rule.estimatedDeliveryTime}</td>
                            <td className="py-2.5 px-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const nextStatus: "active" | "inactive" = rule.status === "active" ? "inactive" : "active";
                                  const updated: ShippingRule[] = draftSettings.shipping.rules.map((r) =>
                                    r.id === rule.id ? { ...r, status: nextStatus } : r
                                  );
                                  updateSection("shipping", { rules: updated });
                                  toast.info(`${rule.name} is now ${nextStatus}`);
                                }}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                  rule.status === "active"
                                    ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                {rule.status.toUpperCase()}
                              </button>
                            </td>
                            <td className="py-2.5 px-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingShippingRule({ ...rule })}
                                  className="size-6 inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded cursor-pointer transition-colors"
                                  title={`Edit ${rule.name}`}
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = draftSettings.shipping.rules.filter((r) => r.id !== rule.id);
                                    updateSection("shipping", { rules: updated });
                                    toast.info(`Removed ${rule.name}`);
                                  }}
                                  className="size-6 inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer transition-colors"
                                  title={`Delete ${rule.name}`}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Edit Shipping Rule Modal / Quick Form */}
                {editingShippingRule && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                      <span>Edit Shipping Rule: {editingShippingRule.name}</span>
                      <button
                        type="button"
                        onClick={() => setEditingShippingRule(null)}
                        className="text-muted-foreground text-xs hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Method Name</Label>
                        <Input
                          value={editingShippingRule.name}
                          onChange={(e) => setEditingShippingRule({ ...editingShippingRule, name: e.target.value })}
                          className="h-8 text-xs font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Charge (৳)</Label>
                        <Input
                          type="number"
                          value={editingShippingRule.charge}
                          onChange={(e) => setEditingShippingRule({ ...editingShippingRule, charge: Number(e.target.value) })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Delivery Time</Label>
                        <Input
                          value={editingShippingRule.estimatedDeliveryTime}
                          onChange={(e) => setEditingShippingRule({ ...editingShippingRule, estimatedDeliveryTime: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold">Status</Label>
                        <select
                          value={editingShippingRule.status}
                          onChange={(e) => setEditingShippingRule({ ...editingShippingRule, status: e.target.value as "active" | "inactive" })}
                          className="h-8 w-full rounded border border-border bg-background px-2 text-xs font-semibold"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingShippingRule(null)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (!editingShippingRule.name.trim()) {
                            toast.error("Please enter a method name");
                            return;
                          }
                          const updated = draftSettings.shipping.rules.map((r) =>
                            r.id === editingShippingRule.id ? editingShippingRule : r
                          );
                          updateSection("shipping", { rules: updated });
                          setEditingShippingRule(null);
                          toast.success("Shipping Rule Updated!");
                        }}
                        className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        Update Rule
                      </Button>
                    </div>
                  </div>
                )}

                {/* Add Custom Shipping Rule Modal / Quick Form */}
                {showShippingModal && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-primary flex items-center justify-between">
                      <span>Add New Shipping Rule</span>
                      <button type="button" onClick={() => setShowShippingModal(false)} className="text-muted-foreground text-xs hover:underline">
                        Cancel
                      </button>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        placeholder="Method Name (e.g. Same Day)"
                        value={newShippingRule.name}
                        onChange={(e) => setNewShippingRule({ ...newShippingRule, name: e.target.value })}
                        className="h-8 text-xs"
                      />
                      <Input
                        type="number"
                        placeholder="Charge Amount (৳)"
                        value={newShippingRule.charge}
                        onChange={(e) => setNewShippingRule({ ...newShippingRule, charge: Number(e.target.value) })}
                        className="h-8 text-xs"
                      />
                      <Input
                        placeholder="Estimated Time (e.g. 1-2 Days)"
                        value={newShippingRule.deliveryTime}
                        onChange={(e) => setNewShippingRule({ ...newShippingRule, deliveryTime: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (!newShippingRule.name.trim()) {
                          toast.error("Please enter a method name");
                          return;
                        }
                        const newRule: ShippingRule = {
                          id: `ship_${Date.now()}`,
                          name: newShippingRule.name,
                          charge: newShippingRule.charge,
                          estimatedDeliveryTime: newShippingRule.deliveryTime,
                          status: "active",
                          displayOrder: draftSettings.shipping.rules.length + 1,
                        };
                        updateSection("shipping", { rules: [...draftSettings.shipping.rules, newRule] });
                        setNewShippingRule({ name: "", charge: 60, deliveryTime: "2-3 Days" });
                        setShowShippingModal(false);
                        toast.success("Shipping Rule Added!");
                      }}
                      className="h-8 text-xs font-bold"
                    >
                      Save Rule
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 5. SOCIAL MEDIA SETTINGS */}
            {activeTab === "socialMedia" && (
              <div className="space-y-5">
                <div className="border-b border-border/60 pb-3">
                  <h3 className="text-base font-bold text-foreground">Social Media Links</h3>
                  <p className="text-xs text-muted-foreground">Manage active links and channels for Facebook, Instagram, TikTok, WhatsApp & Messenger</p>
                </div>

                <div className="space-y-3">
                  {draftSettings.socialMedia.platforms.map((plat, idx) => (
                    <div key={plat.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-secondary/20 rounded-lg border border-border">
                      <div className="flex items-center gap-3 min-w-[140px]">
                        <span className="text-xs font-bold text-foreground">{plat.platform}</span>
                      </div>
                      <Input
                        value={plat.url}
                        onChange={(e) => {
                          const updated = [...draftSettings.socialMedia.platforms];
                          updated[idx] = { ...plat, url: e.target.value };
                          updateSection("socialMedia", { platforms: updated });
                        }}
                        placeholder={`https://${plat.platform.toLowerCase()}.com/yourhandle`}
                        className="h-8 text-xs flex-1"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <Label className="text-[11px] text-muted-foreground">Active</Label>
                        <Switch
                          checked={plat.active}
                          onCheckedChange={(checked) => {
                            const updated = [...draftSettings.socialMedia.platforms];
                            updated[idx] = { ...plat, active: checked };
                            updateSection("socialMedia", { platforms: updated });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ─── Source Pages & Social Pages CRUD ─── */}
                <div className="pt-4 border-t border-border/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Source Pages & Social Pages</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Manage order source channels and their associated social pages. These appear in the Manual Order form.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowSourceModal(true)}
                      className="h-8 text-xs font-semibold"
                    >
                      <Plus className="size-3.5 mr-1" /> Add Source
                    </Button>
                  </div>

                  {/* Add Source Modal */}
                  {showSourceModal && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-primary flex items-center justify-between">
                        <span>Add New Source Page</span>
                        <button type="button" onClick={() => { setShowSourceModal(false); setNewSourceName(""); }} className="text-muted-foreground text-xs hover:underline cursor-pointer">
                          Cancel
                        </button>
                      </h4>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Source name (e.g. Messenger, Daraz, etc.)"
                          value={newSourceName}
                          onChange={(e) => setNewSourceName(e.target.value)}
                          className="h-8 text-xs flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSource();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddSource}
                          className="h-8 text-xs font-bold"
                        >
                          Add Source
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Sources Accordion List */}
                  <div className="space-y-2">
                    {Object.keys(draftSettings.socialMedia.sources || {}).length === 0 && (
                      <div className="py-4 px-3 text-center border border-dashed border-border/80 rounded-lg bg-secondary/10">
                        <p className="text-xs text-muted-foreground">No source pages configured yet. Click "Add Source" to create one.</p>
                      </div>
                    )}

                    {Object.entries(draftSettings.socialMedia.sources || {}).map(([sourceName, pages]) => (
                      <div key={sourceName} className="rounded-lg border border-border overflow-hidden">
                        {/* Source Header */}
                        <div
                          className="flex items-center justify-between gap-2 px-3 py-2.5 bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
                          onClick={() => setExpandedSource(expandedSource === sourceName ? null : sourceName)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Share2 className="size-3.5 text-primary shrink-0" />
                            {editingSourceOrigName === sourceName ? (
                              <div className="flex items-center gap-1.5 flex-1 max-w-xs" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={editingSourceNewName}
                                  onChange={(e) => setEditingSourceNewName(e.target.value)}
                                  className="h-7 text-xs font-bold"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const newName = editingSourceNewName.trim();
                                      if (!newName) {
                                        toast.error("Source name cannot be empty");
                                        return;
                                      }
                                      const existing = { ...(draftSettings.socialMedia.sources || {}) };
                                      if (newName !== sourceName) {
                                        existing[newName] = existing[sourceName] || [];
                                        delete existing[sourceName];
                                        updateSection("socialMedia", { sources: existing });
                                        if (expandedSource === sourceName) setExpandedSource(newName);
                                        toast.success(`Renamed to "${newName}"`);
                                      }
                                      setEditingSourceOrigName(null);
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 text-[10px] px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newName = editingSourceNewName.trim();
                                    if (!newName) {
                                      toast.error("Source name cannot be empty");
                                      return;
                                    }
                                    const existing = { ...(draftSettings.socialMedia.sources || {}) };
                                    if (newName !== sourceName) {
                                      existing[newName] = existing[sourceName] || [];
                                      delete existing[sourceName];
                                      updateSection("socialMedia", { sources: existing });
                                      if (expandedSource === sourceName) setExpandedSource(newName);
                                      toast.success(`Renamed to "${newName}"`);
                                    }
                                    setEditingSourceOrigName(null);
                                  }}
                                >
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs font-bold text-foreground truncate">{sourceName}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSourceOrigName(sourceName);
                                    setEditingSourceNewName(sourceName);
                                  }}
                                  className="text-muted-foreground hover:text-primary p-0.5 rounded cursor-pointer"
                                  title="Rename source"
                                >
                                  <Pencil className="size-3" />
                                </button>
                              </>
                            )}
                            <span className="text-[10px] font-semibold text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded shrink-0">
                              {pages.length} page{pages.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSource(sourceName);
                              }}
                              className="size-6 inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer transition-colors"
                              title={`Delete ${sourceName}`}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                            <svg
                              className={`size-4 text-muted-foreground transition-transform duration-200 ${expandedSource === sourceName ? "rotate-180" : ""}`}
                              xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </div>

                        {/* Expanded Source — Social Pages List + Add Page */}
                        {expandedSource === sourceName && (
                          <div className="px-3 py-3 space-y-2 bg-card border-t border-border/60">
                            {pages.length === 0 && (
                              <p className="text-[11px] text-muted-foreground italic py-1">No social pages added for this source yet.</p>
                            )}
                            {pages.map((pageName, pageIdx) => (
                              <div key={pageIdx} className="flex items-center gap-2 group">
                                <div className="flex-1 flex items-center gap-2 bg-secondary/20 rounded border border-border px-2.5 py-1.5">
                                  <Check className="size-3 text-emerald-500 shrink-0" />
                                  <Input
                                    value={pageName}
                                    onChange={(e) => {
                                      const updated = { ...draftSettings.socialMedia.sources };
                                      updated[sourceName] = [...pages];
                                      updated[sourceName][pageIdx] = e.target.value;
                                      updateSection("socialMedia", { sources: updated });
                                    }}
                                    className="h-6 text-xs border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none font-medium"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePage(sourceName, pageIdx)}
                                  className="size-6 inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-all"
                                  title="Remove page"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            ))}

                            {/* Inline Add Page */}
                            <div className="flex gap-2 pt-1">
                              <Input
                                placeholder="New page name..."
                                value={newPageInputs[sourceName] || ""}
                                onChange={(e) => setNewPageInputs((prev) => ({ ...prev, [sourceName]: e.target.value }))}
                                className="h-7 text-xs flex-1"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddPage(sourceName);
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddPage(sourceName)}
                                className="h-7 text-[11px] px-2 font-semibold"
                              >
                                <Plus className="size-3 mr-0.5" /> Add Page
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6. BUSINESS INFORMATION */}
            {activeTab === "business" && (
              <div className="space-y-5">
                <div className="border-b border-border/60 pb-3">
                  <h3 className="text-base font-bold text-foreground">Business Information</h3>
                  <p className="text-xs text-muted-foreground">Store official registration numbers, BIN, VAT & Trade license for invoice headers</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Business Legal Name</Label>
                    <Input
                      value={draftSettings.business.businessName}
                      onChange={(e) => updateSection("business", { businessName: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Trade License Number</Label>
                    <Input
                      value={draftSettings.business.tradeLicenseNumber}
                      onChange={(e) => updateSection("business", { tradeLicenseNumber: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">BIN (Business Identification No.)</Label>
                    <Input
                      value={draftSettings.business.binNumber}
                      onChange={(e) => updateSection("business", { binNumber: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">VAT Registration Number</Label>
                    <Input
                      value={draftSettings.business.vatNumber}
                      onChange={(e) => updateSection("business", { vatNumber: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Company Reg Number</Label>
                    <Input
                      value={draftSettings.business.companyRegistrationNumber}
                      onChange={(e) => updateSection("business", { companyRegistrationNumber: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Official Business Email</Label>
                    <Input
                      type="email"
                      value={draftSettings.business.businessEmail}
                      onChange={(e) => updateSection("business", { businessEmail: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Official Business Phone</Label>
                    <Input
                      value={draftSettings.business.businessPhone}
                      onChange={(e) => updateSection("business", { businessPhone: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. SEO SETTINGS */}
            {activeTab === "seo" && (
              <div className="space-y-5">
                <div className="border-b border-border/60 pb-3">
                  <h3 className="text-base font-bold text-foreground">SEO & Analytics Settings</h3>
                  <p className="text-xs text-muted-foreground">Default meta title, Open Graph images, Google Analytics 4, Tag Manager & Pixel IDs</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Default Meta Title</Label>
                  <Input
                    value={draftSettings.seo.defaultMetaTitle}
                    onChange={(e) => updateSection("seo", { defaultMetaTitle: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Default Meta Description</Label>
                  <Textarea
                    value={draftSettings.seo.defaultMetaDescription}
                    onChange={(e) => updateSection("seo", { defaultMetaDescription: e.target.value })}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Meta Keywords (Comma separated)</Label>
                  <Input
                    value={draftSettings.seo.metaKeywords}
                    onChange={(e) => updateSection("seo", { metaKeywords: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Analytics Tracking Keys */}
                <div className="pt-2 border-t border-border/60 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tracking & Verification IDs</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Google Analytics 4 ID (G-XXXXXXX)</Label>
                      <Input
                        value={draftSettings.seo.googleAnalyticsId}
                        onChange={(e) => updateSection("seo", { googleAnalyticsId: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Google Tag Manager ID (GTM-XXXXXX)</Label>
                      <Input
                        value={draftSettings.seo.googleTagManagerId}
                        onChange={(e) => updateSection("seo", { googleTagManagerId: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Facebook Pixel ID</Label>
                      <Input
                        value={draftSettings.seo.facebookPixelId}
                        onChange={(e) => updateSection("seo", { facebookPixelId: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Microsoft Clarity ID</Label>
                      <Input
                        value={draftSettings.seo.microsoftClarityId}
                        onChange={(e) => updateSection("seo", { microsoftClarityId: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. FOOTER SETTINGS */}
            {activeTab === "footer" && (
              <div className="space-y-5">
                <div className="border-b border-border/60 pb-3">
                  <h3 className="text-base font-bold text-foreground">Footer Settings</h3>
                  <p className="text-xs text-muted-foreground">Copyright statement, payment badges, and footer links</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Footer Copyright Statement</Label>
                  <Input
                    value={draftSettings.footer.copyrightText}
                    onChange={(e) => updateSection("footer", { copyrightText: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Footer Brand Description</Label>
                  <Textarea
                    value={draftSettings.footer.footerDescription}
                    onChange={(e) => updateSection("footer", { footerDescription: e.target.value })}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-secondary/20 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">Show Footer Logo</div>
                      <div className="text-[11px] text-muted-foreground">Display brand logo above footer description</div>
                    </div>
                    <Switch
                      checked={draftSettings.footer.showFooterLogo}
                      onCheckedChange={(checked) => updateSection("footer", { showFooterLogo: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">Enable Newsletter Signup</div>
                      <div className="text-[11px] text-muted-foreground">Show newsletter subscription input in footer</div>
                    </div>
                    <Switch
                      checked={draftSettings.footer.enableNewsletterToggle}
                      onCheckedChange={(checked) => updateSection("footer", { enableNewsletterToggle: checked })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Payment Badges (Comma separated)</Label>
                  <Input
                    value={draftSettings.footer.paymentMethodsBadges.join(", ")}
                    onChange={(e) =>
                      updateSection("footer", {
                        paymentMethodsBadges: e.target.value.split(",").map((s) => s.trim()),
                      })
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            )}

            {/* 9. ORDER SETTINGS */}
            {activeTab === "orders" && (
              <div className="space-y-5">
                <div className="border-b border-border/60 pb-3">
                  <h3 className="text-base font-bold text-foreground">Order & Checkout Rules</h3>
                  <p className="text-xs text-muted-foreground">Minimum/maximum order limits, guest checkout, phone verification, and payment gateways</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Minimum Order Amount (৳)</Label>
                    <Input
                      type="number"
                      value={draftSettings.orders.minimumOrderAmount}
                      onChange={(e) => updateSection("orders", { minimumOrderAmount: Number(e.target.value) })}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Maximum Order Amount (৳)</Label>
                    <Input
                      type="number"
                      value={draftSettings.orders.maximumOrderAmount}
                      onChange={(e) => updateSection("orders", { maximumOrderAmount: Number(e.target.value) })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                    <div>
                      <div className="text-xs font-bold text-foreground">Allow Guest Checkout</div>
                      <div className="text-[11px] text-muted-foreground">Customers can order without creating an account</div>
                    </div>
                    <Switch
                      checked={draftSettings.orders.allowGuestCheckout}
                      onCheckedChange={(checked) => updateSection("orders", { allowGuestCheckout: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                    <div>
                      <div className="text-xs font-bold text-foreground">Require Phone OTP Verification</div>
                      <div className="text-[11px] text-muted-foreground">Verify customer phone number before order submit</div>
                    </div>
                    <Switch
                      checked={draftSettings.orders.requirePhoneVerification}
                      onCheckedChange={(checked) => updateSection("orders", { requirePhoneVerification: checked })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-border/60 pb-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Standard Order ID Prefix</Label>
                    <Input
                      value={draftSettings.orders.orderIdPrefix ?? "ORD-"}
                      onChange={(e) => updateSection("orders", { orderIdPrefix: e.target.value })}
                      placeholder="e.g. ORD-, ALZ-"
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">Prefix added before confirmed/placed order numbers</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Next Standard Order Number</Label>
                    <Input
                      type="number"
                      value={draftSettings.orders.nextOrderNumber ?? 10001}
                      onChange={(e) => updateSection("orders", { nextOrderNumber: Math.max(1, Number(e.target.value)) })}
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">Next standard order ID will be: <span className="font-bold text-primary">{draftSettings.orders.orderIdPrefix ?? "ORD-"}{draftSettings.orders.nextOrderNumber ?? 10001}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-border/60 pb-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Incomplete Order ID Prefix</Label>
                    <Input
                      value={draftSettings.orders.incompleteOrderIdPrefix ?? "INC-"}
                      onChange={(e) => updateSection("orders", { incompleteOrderIdPrefix: e.target.value })}
                      placeholder="e.g. INC-, DRAFT-"
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">Prefix added before abandoned/incomplete order numbers</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Next Incomplete Order Number</Label>
                    <Input
                      type="number"
                      value={draftSettings.orders.nextIncompleteOrderNumber ?? 5001}
                      onChange={(e) => updateSection("orders", { nextIncompleteOrderNumber: Math.max(1, Number(e.target.value)) })}
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">Next incomplete order ID will be: <span className="font-bold text-amber-600 dark:text-amber-400">{draftSettings.orders.incompleteOrderIdPrefix ?? "INC-"}{draftSettings.orders.nextIncompleteOrderNumber ?? 5001}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                    <span className="text-xs font-bold text-foreground">Enable Coupon Codes</span>
                    <Switch
                      checked={draftSettings.orders.enableCoupon}
                      onCheckedChange={(checked) => updateSection("orders", { enableCoupon: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                    <span className="text-xs font-bold text-foreground">Enable COD</span>
                    <Switch
                      checked={draftSettings.orders.enableCOD}
                      onCheckedChange={(checked) => updateSection("orders", { enableCOD: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border">
                    <span className="text-xs font-bold text-foreground">Online Gateways</span>
                    <Switch
                      checked={draftSettings.orders.enableOnlinePayment}
                      onCheckedChange={(checked) => updateSection("orders", { enableOnlinePayment: checked })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 10. NOTIFICATION SETTINGS */}
            {activeTab === "notifications" && (
              <div className="space-y-5">
                <div className="border-b border-border/60 pb-3">
                  <h3 className="text-base font-bold text-foreground">Notification Gateway Settings</h3>
                  <p className="text-xs text-muted-foreground">Configure SMS API keys, SMTP mail servers, and WhatsApp notification cloud API</p>
                </div>

                {/* SMS API Config */}
                <div className="space-y-3 p-3 bg-secondary/20 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground">SMS Gateway Integration</h4>
                    <Switch
                      checked={draftSettings.notifications.enableSMS}
                      onCheckedChange={(checked) => updateSection("notifications", { enableSMS: checked })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">SMS API Key</Label>
                      <Input
                        type="password"
                        value={draftSettings.notifications.smsApiKey}
                        onChange={(e) => updateSection("notifications", { smsApiKey: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">SMS Sender ID / Masking</Label>
                      <Input
                        value={draftSettings.notifications.smsSenderId}
                        onChange={(e) => updateSection("notifications", { smsSenderId: e.target.value })}
                        className="h-8 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* SMTP Config */}
                <div className="space-y-3 p-3 bg-secondary/20 rounded-lg border border-border">
                  <h4 className="text-xs font-bold text-foreground">SMTP Email Gateway</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">SMTP Host</Label>
                      <Input
                        value={draftSettings.notifications.smtpHost}
                        onChange={(e) => updateSection("notifications", { smtpHost: e.target.value })}
                        className="h-8 text-xs"
                        autoComplete="off"
                        name="custom_smtp_host_field"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">SMTP Port</Label>
                      <Input
                        type="number"
                        value={draftSettings.notifications.smtpPort}
                        onChange={(e) => updateSection("notifications", { smtpPort: Number(e.target.value) })}
                        className="h-8 text-xs"
                        autoComplete="off"
                        name="custom_smtp_port_field"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">SMTP Username / Email</Label>
                      <Input
                        value={draftSettings.notifications.smtpUsername}
                        onChange={(e) => updateSection("notifications", { smtpUsername: e.target.value })}
                        className="h-8 text-xs"
                        autoComplete="new-password"
                        name="custom_smtp_user_field"
                        placeholder="e.g. alerts@yourdomain.com"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">SMTP Sender Name</Label>
                      <Input
                        value={draftSettings.notifications.smtpSenderName}
                        onChange={(e) => updateSection("notifications", { smtpSenderName: e.target.value })}
                        className="h-8 text-xs"
                        autoComplete="off"
                        name="custom_smtp_sender_field"
                        placeholder="e.g. ARZA Notifications"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 11. ADVANCED SETTINGS & AUDIT LOGS */}
            {activeTab === "advanced" && (
              <div className="space-y-6">
                <div className="border-b border-border/60 pb-3">
                  <h3 className="text-base font-bold text-foreground">Advanced System Controls & Audit Log</h3>
                  <p className="text-xs text-muted-foreground">Perform cache clearing, toggle API logging, and review administrative audit trail</p>
                </div>

                {/* Quick Action Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => clearSystemCache()}
                    className="h-12 flex items-center justify-center gap-2 border-primary/30 text-primary hover:bg-primary/10 font-bold text-xs"
                  >
                    <RefreshCw className="size-4" /> Clear CDN & Redis Cache
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(draftSettings, null, 2));
                      const downloadAnchor = document.createElement("a");
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `system-settings-backup-${new Date().toISOString().slice(0, 10)}.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                      toast.success("Settings Backup JSON Exported!");
                    }}
                    className="h-12 flex items-center justify-center gap-2 font-bold text-xs"
                  >
                    <Save className="size-4" /> Export Backup (JSON)
                  </Button>

                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                    <div>
                      <div className="text-xs font-bold text-foreground">API Logging</div>
                      <div className="text-[10px] text-muted-foreground">Log system payload events</div>
                    </div>
                    <Switch
                      checked={draftSettings.advanced.apiLogging}
                      onCheckedChange={(checked) => updateSection("advanced", { apiLogging: checked })}
                    />
                  </div>
                </div>

                {/* Danger Zone: Database Reset & Flush */}
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <div className="flex items-center gap-2.5 text-destructive">
                    <AlertTriangle className="size-5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">Danger Zone: Database Reset & Flush</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Revert configuration to production factory defaults. Reset active section or perform a full system database wipe.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResetScope("current");
                        setResetModalOpen(true);
                      }}
                      className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <RotateCcw className="size-3.5 mr-1" />
                      Reset Advanced Section Only
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setResetScope("all");
                        setResetModalOpen(true);
                      }}
                      className="h-8 text-xs font-bold"
                    >
                      <AlertTriangle className="size-3.5 mr-1" />
                      Factory Reset All 12 Tabs (Database Flush)
                    </Button>
                  </div>
                </div>

                {/* Audit Logs Table */}
                <div className="space-y-2 pt-3 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <History className="size-4 text-primary" /> Settings Audit Log History ({auditLogs.length})
                    </h4>
                  </div>

                  <div className="overflow-x-auto border border-border rounded-lg max-h-[350px]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-secondary/40 border-b border-border font-semibold text-muted-foreground sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">User</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-secondary/20">
                            <td className="py-2 px-3 text-[11px] text-muted-foreground shrink-0 font-mono">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 font-semibold text-foreground">{log.user}</td>
                            <td className="py-2 px-3">
                              <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                {log.section}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-muted-foreground text-[11px]">{log.newValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <AlertDialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="size-5" />
              <AlertDialogTitle>
                {resetScope === "current"
                  ? `Reset "${currentCategory?.label}" to Factory Defaults?`
                  : "Flush & Reset Entire System Settings?"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground">
              {resetScope === "current" ? (
                <>
                  This will immediately restore <strong>{currentCategory?.label}</strong> to production factory default values in the database.
                  All other 11 sections will remain completely untouched.
                </>
              ) : (
                <>
                  <strong className="text-destructive font-semibold">Caution:</strong> This will reset <strong>ALL 12 sections</strong> across
                  the entire platform to production factory defaults and write them directly into the database. Any custom branding,
                  shipping rates, contact info, and SEO configuration will be restored to system defaults.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {resetScope === "current" ? `Yes, Reset ${currentCategory?.label}` : "Yes, Flush & Reset All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
