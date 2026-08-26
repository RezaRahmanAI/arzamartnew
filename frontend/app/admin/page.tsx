"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  PlusCircle,
  PackagePlus,
  Boxes,
  ClipboardX,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Phone,
  MapPin,
  ExternalLink,
  ChevronRight,
  Flame,
  Calendar,
  Percent,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useOrders } from "@/lib/orders";
import { useProducts } from "@/lib/products-store";
import { useCategories } from "@/lib/categories-store";
import { useCustomers } from "@/lib/customers-store";
import { formatBDT, statusStyles, type OrderStatus } from "@/lib/dashboard-data";
import { getImageUrl } from "@/lib/utils";
import { DashboardChartsSkeleton } from "@/components/admin/dashboard-charts";
import { Button } from "@/components/ui/button";

// Lazy load heavy Recharts bundle on client
const DashboardCharts = dynamic(() => import("@/components/admin/dashboard-charts"), {
  ssr: false,
  loading: () => <DashboardChartsSkeleton />,
});

type TimeRange = "today" | "7days" | "30days" | "all";

export default function AdminOverview() {
  const { orders: liveOrders, incomplete } = useOrders();
  const { products } = useProducts();
  const { categories } = useCategories();
  const { customers } = useCustomers();

  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  // Filter orders by selected time range
  const filteredOrders = useMemo(() => {
    if (timeRange === "all") return liveOrders;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return liveOrders.filter((o) => {
      const orderDate = new Date(o.date);
      if (isNaN(orderDate.getTime())) return true; // fallback for unparseable dates

      if (timeRange === "today") {
        return orderDate >= startOfToday;
      }
      if (timeRange === "7days") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= sevenDaysAgo;
      }
      if (timeRange === "30days") {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= thirtyDaysAgo;
      }
      return true;
    });
  }, [liveOrders, timeRange]);

  // Dynamic KPI Calculations
  const validOrders = useMemo(
    () => filteredOrders.filter((o) => o.status !== "cancelled" && o.status !== "refund"),
    [filteredOrders]
  );

  const totalRevenue = useMemo(
    () => validOrders.reduce((sum, o) => sum + (o.total || 0), 0),
    [validOrders]
  );

  const pendingOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === "pending" || o.status === "processing").length,
    [filteredOrders]
  );

  const deliveredOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === "delivered").length,
    [filteredOrders]
  );

  const totalOrdersCount = filteredOrders.length;
  const deliverySuccessRate =
    totalOrdersCount > 0
      ? Math.round((deliveredOrders / totalOrdersCount) * 100)
      : 0;

  const uniqueBuyerPhones = useMemo(
    () => new Set(filteredOrders.map((o) => o.phone?.replace(/\D/g, "")).filter(Boolean)).size,
    [filteredOrders]
  );

  const avgOrder = validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

  // Chart Data: Dynamic Revenue Trend
  const dynamicRevenueSeries = useMemo(() => {
    const revenueMap: Record<string, { revenue: number; orders: number }> = {};
    validOrders.forEach((o) => {
      const d = o.date ? o.date.slice(5) : "Recent";
      if (!revenueMap[d]) {
        revenueMap[d] = { revenue: 0, orders: 0 };
      }
      revenueMap[d].revenue += o.total || 0;
      revenueMap[d].orders += 1;
    });

    const series = Object.entries(revenueMap)
      .slice(-12)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders,
      }));

    if (series.length === 0) {
      return [{ date: "Today", revenue: totalRevenue, orders: validOrders.length }];
    }
    return series;
  }, [validOrders, totalRevenue]);

  // Chart Data: Category Sales Breakdown
  const dynamicCategoryShare = useMemo(() => {
    const catMap: Record<string, number> = {};
    validOrders.forEach((o) => {
      o.items?.forEach((it) => {
        const matchingProd = products.find((p) => p.slug === it.slug);
        const cat = matchingProd?.category || "General";
        catMap[cat] = (catMap[cat] || 0) + (it.price * it.qty);
      });
    });

    const list = Object.entries(catMap).map(([cat, val]) => {
      const matchingCat = categories.find((c) => c.slug === cat);
      return {
        name: matchingCat?.name || cat.charAt(0).toUpperCase() + cat.slice(1),
        value: val,
      };
    });

    if (list.length === 0) {
      return categories.slice(0, 4).map((c) => ({
        name: c.name,
        value: 0,
      }));
    }
    return list.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [validOrders, products, categories]);

  // Top Selling Products Matrix
  const topSellingProducts = useMemo(() => {
    const prodMap: Record<string, { name: string; slug: string; image: string; units: number; revenue: number }> = {};

    validOrders.forEach((o) => {
      o.items?.forEach((it) => {
        if (!prodMap[it.slug]) {
          const matchingProd = products.find((p) => p.slug === it.slug);
          prodMap[it.slug] = {
            name: it.name,
            slug: it.slug,
            image: matchingProd?.image || "",
            units: 0,
            revenue: 0,
          };
        }
        prodMap[it.slug].units += it.qty;
        prodMap[it.slug].revenue += it.price * it.qty;
      });
    });

    const sorted = Object.values(prodMap).sort((a, b) => b.units - a.units);
    if (sorted.length > 0) return sorted.slice(0, 5);

    // Fallback to active products if no sales yet
    return products.slice(0, 5).map((p) => ({
      name: p.name,
      slug: p.slug,
      image: p.image,
      units: 0,
      revenue: 0,
    }));
  }, [validOrders, products]);

  // Order Geo / City Breakdown
  const cityAnalytics = useMemo(() => {
    const map: Record<string, number> = {};
    validOrders.forEach((o) => {
      const city = o.city || "Dhaka";
      map[city] = (map[city] || 0) + 1;
    });
    return Object.entries(map)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [validOrders]);

  const recentOrders = liveOrders.slice(0, 7);

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Executive Header & Quick Filter Bar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-slate-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Sparkles className="size-3.5" /> Executive Command Center
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display">
              Store Performance & Operations
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Real-time analytics, order dispatch velocity, and revenue indicators across all sales channels.
            </p>
          </div>

          {/* Time Range Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/60 border border-slate-700/70 backdrop-blur-md self-start md:self-auto">
            {(
              [
                { id: "today", label: "Today" },
                { id: "7days", label: "7 Days" },
                { id: "30days", label: "30 Days" },
                { id: "all", label: "All Time" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeRange(t.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timeRange === t.id
                    ? "bg-primary text-primary-foreground shadow-md scale-102"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ambient Glow behind header */}
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      </div>

      {/* 2. Quick Operations Action Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Link
          href="/admin/manual-order"
          className="group flex items-center gap-3 p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 shadow-xs hover:shadow-md transition-all duration-200"
        >
          <div className="size-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <PlusCircle className="size-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Create Order
            </div>
            <div className="text-[11px] text-muted-foreground">Manual POS billing</div>
          </div>
        </Link>

        <Link
          href="/admin/pre-order"
          className="group flex items-center gap-3 p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 shadow-xs hover:shadow-md transition-all duration-200"
        >
          <div className="size-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <PackagePlus className="size-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Create Pre-order
            </div>
            <div className="text-[11px] text-muted-foreground">Advance bookings</div>
          </div>
        </Link>

        <Link
          href="/admin/products"
          className="group flex items-center gap-3 p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 shadow-xs hover:shadow-md transition-all duration-200"
        >
          <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Boxes className="size-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Manage Products
            </div>
            <div className="text-[11px] text-muted-foreground">{products.length} active items</div>
          </div>
        </Link>

        <Link
          href="/admin/incomplete"
          className="group flex items-center gap-3 p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 shadow-xs hover:shadow-md transition-all duration-200"
        >
          <div className="size-11 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ClipboardX className="size-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              Incomplete Orders
            </div>
            <div className="text-[11px] text-muted-foreground">
              {incomplete.length > 0 ? `${incomplete.length} cart dropoffs` : "No dropoffs"}
            </div>
          </div>
        </Link>
      </div>

      {/* 3. Primary KPI Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Metric 1: Total Revenue */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gross Revenue
            </span>
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="size-4.5" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            {formatBDT(totalRevenue)}
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="size-3.5" /> Confirmed sales
            </span>
            <span className="text-muted-foreground">({validOrders.length} valid)</span>
          </div>
        </div>

        {/* Metric 2: Orders & Pending Alert */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Orders
            </span>
            <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingBag className="size-4.5" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            {totalOrdersCount}
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            {pendingOrders > 0 ? (
              <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                <Clock className="size-3.5" /> {pendingOrders} awaiting dispatch
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" /> All dispatched
              </span>
            )}
          </div>
        </div>

        {/* Metric 3: Delivery / Fulfillment Rate */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Fulfillment Rate
            </span>
            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <PackageCheck className="size-4.5" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            {deliverySuccessRate}%
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="font-medium text-muted-foreground">
              {deliveredOrders} of {totalOrdersCount} successfully delivered
            </span>
          </div>
        </div>

        {/* Metric 4: Average Order Value & Buyers */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Average Basket (AOV)
            </span>
            <div className="size-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp className="size-4.5" />
            </div>
          </div>
          <p className="mt-3 font-display text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            {formatBDT(avgOrder)}
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              Across <strong className="text-foreground">{uniqueBuyerPhones}</strong> active customers
            </span>
          </div>
        </div>
      </div>

      {/* 4. High-End Data Visualizations */}
      <DashboardCharts
        revenueSeries={dynamicRevenueSeries}
        categoryData={dynamicCategoryShare}
      />

      {/* 5. Bottom Operations Row: Live Orders Stream & Product Performance */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Recent Live Orders Feed */}
        <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">Recent Order Stream</h3>
                <p className="text-xs text-muted-foreground">Live orders placed across website & landing pages</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs font-bold h-8" asChild>
                <Link href="/admin/orders">
                  View All <ChevronRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </div>

            <div className="divide-y divide-border/60">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-muted/30 -mx-3 px-3 rounded-xl transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-foreground">{order.id}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                          statusStyles[order.status] || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                      {order.customer}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="size-2.5" /> {order.phone || "—"}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="size-2.5" /> {order.city || "Dhaka"}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-foreground">
                      {formatBDT(order.total)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {order.date || "Today"}
                    </div>
                  </div>
                </div>
              ))}
              {recentOrders.length === 0 && (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No orders placed yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing latest {recentOrders.length} records</span>
            <Link href="/admin/manual-order" className="text-primary font-bold hover:underline">
              + New POS Order
            </Link>
          </div>
        </div>

        {/* Top Products & City Geo Insights */}
        <div className="lg:col-span-5 space-y-6">
          {/* Top Selling Products Matrix */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="size-4 text-amber-500" />
                <h3 className="font-display text-base font-bold text-foreground">Top Movers</h3>
              </div>
              <Link href="/admin/products" className="text-xs font-bold text-primary hover:underline">
                Catalog
              </Link>
            </div>

            <div className="space-y-3.5">
              {topSellingProducts.map((p, idx) => (
                <div key={p.slug || idx} className="flex items-center gap-3">
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
                    {p.image ? (
                      <Image
                        src={getImageUrl(p.image, "thumb")}
                        alt={p.name}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="size-full grid place-items-center text-[10px] font-bold text-muted-foreground">
                        N/A
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-foreground truncate">{p.name}</h4>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                      <span>{p.units > 0 ? `${p.units} units sold` : "In stock"}</span>
                      <span className="font-bold text-foreground">{formatBDT(p.revenue || 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Demand / Cities Distribution */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-bold text-foreground">Regional Demand</h3>
              <span className="text-[10px] font-semibold text-muted-foreground">Top Delivery Hubs</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {cityAnalytics.map((c) => (
                <div
                  key={c.city}
                  className="p-3 rounded-xl bg-secondary/50 border border-border/60 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-foreground">{c.city}</div>
                    <div className="text-[10px] text-muted-foreground">{c.count} orders</div>
                  </div>
                  <MapPin className="size-4 text-primary/70" />
                </div>
              ))}
              {cityAnalytics.length === 0 && (
                <div className="col-span-2 py-4 text-center text-xs text-muted-foreground">
                  No regional data yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

