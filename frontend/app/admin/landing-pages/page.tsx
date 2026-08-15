"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Globe,
  Search,
  Sparkles,
  ExternalLink,
  RotateCcw,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  ArrowUpRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  customLandingPageService,
  LandingPageListItem,
} from "@/lib/api/services/custom-landing-page.service";

export default function AdminLandingPagesPage() {
  const [items, setItems] = useState<LandingPageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "custom" | "default">("all");

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

  const handleReset = async (productId: string, name: string) => {
    if (!confirm(`Are you sure you want to reset custom landing page configuration for "${name}" to default?`)) {
      return;
    }

    try {
      await customLandingPageService.deleteConfig(productId);
      toast.success(`Reset landing page for ${name}`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reset landing page");
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

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "custom" && item.hasCustomConfig) ||
        (filterStatus === "default" && !item.hasCustomConfig);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [items, search, filterCategory, filterStatus]);

  const stats = useMemo(() => {
    const total = items.length;
    const custom = items.filter((i) => i.hasCustomConfig).length;
    const standard = total - custom;
    return { total, custom, standard };
  }, [items]);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wide uppercase">
            <Globe className="size-4" />
            <span>Growth & Conversion Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground mt-1">
            Custom Landing Pages Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Design high-converting, single-product custom landing pages with modular sections, timers & instant checkout.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-4 shadow-xs">
          <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Package className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Products</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-4 shadow-xs">
          <div className="size-11 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Custom Designed Pages (CLP)</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.custom}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-4 shadow-xs">
          <div className="size-11 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
            <Layers className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Default Standard Layout</p>
            <p className="text-2xl font-bold text-foreground">{stats.standard}</p>
          </div>
        </div>
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
            onChange={(e) => setFilterStatus(e.target.value as "all" | "custom" | "default")}
            className="h-9 px-3 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="custom">Custom CLP Only</option>
            <option value="default">Default Layout Only</option>
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
            <p className="text-xs text-muted-foreground">Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-bold tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => (
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
                            /{item.slug}
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

                    {/* Status Cell */}
                    <td className="py-3 px-4">
                      {item.hasCustomConfig ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                          <Sparkles className="size-3" />
                          <span>Custom CLP</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium text-[10px] border border-border">
                          <span>Standard Layout</span>
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
                          <span>Live Site</span>
                        </a>

                        {/* Live Designer Button */}
                        <Link
                          href={`/admin/landing-page-design?productId=${item.productId}&slug=${item.slug}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all font-bold cursor-pointer shadow-xs text-[11px]"
                          title="Open Visual Split-Screen Designer"
                        >
                          <SlidersHorizontal className="size-3.5" />
                          <span>Design CLP</span>
                        </Link>

                        {/* Reset Button (Only if custom config exists) */}
                        {item.hasCustomConfig && (
                          <button
                            type="button"
                            onClick={() => handleReset(item.productId, item.name)}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors cursor-pointer"
                            title="Reset to Default Layout"
                          >
                            <RotateCcw className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
