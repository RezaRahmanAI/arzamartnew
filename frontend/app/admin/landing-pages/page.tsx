"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  ExternalLink,
  RotateCcw,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowUpRight,
  Eye,
  Plus,
  Trash2,
  Power,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  customLandingPageService,
  LandingPageListItem,
} from "@/lib/api/services/custom-landing-page.service";
import { getImageUrl } from "@/lib/utils";

export default function AdminLandingPagesPage() {
  const router = useRouter();
  const [items, setItems] = useState<LandingPageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "custom" | "default" | "active" | "inactive">("all");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await customLandingPageService.getAll();
      setItems(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to load landing pages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = async (productId: string, currentActive: boolean, name: string) => {
    try {
      await customLandingPageService.toggleActive(productId, !currentActive);
      toast.success(`Landing page for "${name}" is now ${!currentActive ? "Active" : "Inactive"}`);
      setItems((prev) =>
        prev.map((item) =>
          item.productId === productId && item.config
            ? { ...item, config: { ...item.config, isActive: !currentActive } }
            : item
        )
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleDelete = async (productId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete the custom landing page configuration for "${name}"? It will revert to the default store layout.`)) {
      return;
    }

    try {
      await customLandingPageService.deleteConfig(productId);
      toast.success(`Deleted custom landing page for ${name}`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete landing page");
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.slug.toLowerCase().includes(search.toLowerCase());

      const matchesCat =
        filterCategory === "all" || item.category === filterCategory;

      const isItemActive = item.config ? (item.config.isActive ?? true) : true;
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "custom" && item.hasCustomConfig) ||
        (filterStatus === "default" && !item.hasCustomConfig) ||
        (filterStatus === "active" && item.hasCustomConfig && isItemActive) ||
        (filterStatus === "inactive" && item.hasCustomConfig && !isItemActive);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [items, search, filterCategory, filterStatus]);

  // Available products for manual CLP creation (products without custom config, or all)
  const productsForCreation = useMemo(() => {
    return items
      .filter((i) =>
        i.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        i.slug.toLowerCase().includes(productSearch.toLowerCase())
      )
      .slice(0, 50);
  }, [items, productSearch]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in">
      {/* Top Header with Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
            Custom Landing Pages
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            উচ্চ কনভার্সনযুক্ত স্পেশাল প্রমোশন ল্যান্ডিং পেজ তৈরি ও পরিচালনা করুন।
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-sm w-fit"
        >
          <Plus className="size-4" />
          <span>Create Landing Page</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name or slug..."
            className="w-full h-9 pl-9 pr-3 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "custom" | "default" | "active" | "inactive")}
            className="h-9 px-3 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="custom">Custom CLP Only</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="default">Standard Layout Only</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 px-3 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">Loading landing pages...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <AlertCircle className="size-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No landing pages found</p>
            <p className="text-xs text-muted-foreground">Try adjusting your search filters or create a new landing page.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-bold tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Layout Type</th>
                  <th className="py-3 px-4">Active Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const isActive = item.config ? (item.config.isActive ?? true) : true;
                  return (
                    <tr key={item.productId} className="hover:bg-muted/20 transition-colors">
                      {/* Product Cell */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="size-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate max-w-xs">{item.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono truncate">
                              /clp/{item.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category Cell */}
                      <td className="py-3 px-4 text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium">
                          {item.category}
                        </span>
                      </td>

                      {/* Price Cell */}
                      <td className="py-3 px-4 font-bold text-foreground">
                        ৳{item.price.toLocaleString()}
                      </td>

                      {/* Layout Type Cell */}
                      <td className="py-3 px-4">
                        {item.hasCustomConfig ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                            <Sparkles className="size-3" />
                            <span>Custom CLP</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium text-[10px] border border-border">
                            <span>Standard Fallback</span>
                          </span>
                        )}
                      </td>

                      {/* Active Status Toggle (Issue 10) */}
                      <td className="py-3 px-4">
                        {item.hasCustomConfig ? (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item.productId, isActive, item.name)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] border transition-all cursor-pointer ${
                              isActive
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                            }`}
                            title="Click to toggle live status"
                          >
                            <Power className={`size-3 ${isActive ? "text-emerald-600" : "text-muted-foreground"}`} />
                            <span>{isActive ? "Live / Active" : "Disabled / Off"}</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-[10px] italic">
                            Auto (Standard)
                          </span>
                        )}
                      </td>

                      {/* Actions Cell */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {/* Live Preview Button */}
                          <a
                            href={`/clp/${item.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground hover:border-primary hover:text-primary transition-all font-semibold cursor-pointer shadow-2xs text-[11px]"
                            title="Open Live Public Landing Page"
                          >
                            <Eye className="size-3.5" />
                            <span>Live</span>
                          </a>

                          {/* Live Designer Button */}
                          <Link
                            href={`/admin/landing-page-design?productId=${item.productId}&slug=${item.slug}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all font-bold cursor-pointer shadow-xs text-[11px]"
                            title="Open Visual Designer"
                          >
                            <SlidersHorizontal className="size-3.5" />
                            <span>{item.hasCustomConfig ? "Edit Design" : "Create CLP"}</span>
                          </Link>

                          {/* Delete Button (Issue 10) */}
                          {item.hasCustomConfig && (
                            <button
                              type="button"
                              onClick={() => handleDelete(item.productId, item.name)}
                              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors cursor-pointer"
                              title="Delete custom landing page configuration"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Landing Page Modal (Issue 10 & 11) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
              <div>
                <h3 className="text-base font-black text-foreground">প্রোডাক্ট নির্বাচন করে CLP তৈরি করুন</h3>
                <p className="text-[11px] text-muted-foreground">যেকোনো প্রোডাক্ট সিলেক্ট করে কাস্টম ল্যান্ডিং পেজ ডিজাইনারে যান।</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="প্রোডাক্ট নাম বা কোড দিয়ে সার্চ করুন..."
                  className="w-full h-9 pl-9 pr-3 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto p-3 space-y-1.5 flex-1 divide-y divide-border/40">
              {productsForCreation.map((p) => (
                <div
                  key={p.productId}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={getImageUrl(p.imageUrl, "thumb")}
                      alt=""
                      className="size-9 rounded-md object-cover border border-border shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">/{p.slug} · ৳{p.price}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      router.push(`/admin/landing-page-design?productId=${p.productId}&slug=${p.slug}`);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 cursor-pointer shrink-0 ml-2"
                  >
                    {p.hasCustomConfig ? "ডিজাইন এডিট" : "CLP তৈরি করুন"}
                  </button>
                </div>
              ))}

              {productsForCreation.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  কোনো প্রোডাক্ট পাওয়া যায়নি।
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

