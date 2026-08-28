"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatBDT, orders, inventory, statusStyles, OrderStatus, Order } from "@/lib/dashboard-data";
import { ordersService } from "@/lib/api/services/orders.service";
import { useOrders } from "@/lib/orders";
import { products, getSizeStock } from "@/lib/shop-data";
import {
  Hash,
  Phone,
  SlidersHorizontal,
  ChevronDown,
  ShoppingCart,
  PackagePlus,
  RefreshCw,
  MoreVertical,
  Check,
  PackageX,
  Copy,
  Layers,
  Globe,
  Share2,
  ArrowRightLeft,
  Pencil,
  ExternalLink,
  X,
  RotateCcw,
  Truck,
} from "lucide-react";
import dynamic from "next/dynamic";
import { getSavedNotesStore } from "@/components/admin/order-notes-modal";
import type { OutOfStockItem } from "@/components/admin/order-stock-warning-modal";
import { DateRange } from "react-day-picker";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

// Dynamic imports for heavy modal components — reduces initial JS bundle by ~40KB
const DateRangePicker = dynamic(() => import("@/components/admin/date-range-picker").then(m => m.DateRangePicker), { ssr: false });
const OrderNotesModal = dynamic(() => import("@/components/admin/order-notes-modal").then(m => m.OrderNotesModal), { ssr: false });
const OrderTrackingModal = dynamic(() => import("@/components/admin/order-tracking-modal").then(m => m.OrderTrackingModal), { ssr: false });
const OrderInvoiceModal = dynamic(() => import("@/components/admin/order-invoice-modal").then(m => m.OrderInvoiceModal), { ssr: false });
const OrderStockWarningModal = dynamic(() => import("@/components/admin/order-stock-warning-modal").then(m => m.OrderStockWarningModal), { ssr: false });
const QuickEditOrderModal = dynamic(() => import("@/components/admin/quick-edit-order-modal").then(m => m.QuickEditOrderModal), { ssr: false });

const statusOptions: OrderStatus[] = [
  "pending", "confirmed", "processing", "packed", "shipped", "delivered", 
  "cancelled", "refund", "hold", "preorder", "return", "exchange", "return-process"
];

const nextStatusMap: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "processing",
  processing: "packed",
  packed: "shipped",
  shipped: "delivered",
};

const nextStatusLabels: Partial<Record<OrderStatus, string>> = {
  pending: "Confirm",
  confirmed: "Process",
  processing: "Pack",
  packed: "Ship",
  shipped: "Deliver",
};

export default function AdminOrders() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawType = searchParams.get("type");
  const initialType = rawType === "preorder" ? "preorder" : rawType === "manual" ? "manual" : rawType === "website" ? "website" : "all";

  const [orderIdQuery, setOrderIdQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "website" | "manual" | "preorder">(initialType);
  const [sourceFilter, setSourceFilter] = useState<"all" | "facebook" | "instagram">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [activeNotesOrder, setActiveNotesOrder] = useState<Order | null>(null);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [activeQuickEditOrder, setActiveQuickEditOrder] = useState<Order | null>(null);

  // Quick Payment Popover state
  const [editingPaymentOrderId, setEditingPaymentOrderId] = useState<string | null>(null);
  const [editingPaymentPaidValue, setEditingPaymentPaidValue] = useState<string>("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Stock Checking State
  const [isStockChecking, setIsStockChecking] = useState(false);
  const [stockWarningItems, setStockWarningItems] = useState<OutOfStockItem[]>([]);
  const [pendingConfirmOrder, setPendingConfirmOrder] = useState<Order | null>(null);

  const { orders: contextOrders, updateStatus: contextUpdateStatus, updateOrder: contextUpdateOrder } = useOrders();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<Order[]>(contextOrders);

  // Instantly reflect cached orders in memory
  useEffect(() => {
    if (contextOrders) {
      setData(contextOrders as unknown as Order[]);
    }
  }, [contextOrders]);

  // Background silent refresh from API
  const fetchOrders = async () => {
    try {
      const result = await ordersService.getAll();
      if (result && Array.isArray(result.orders)) {
        setData(result.orders as unknown as Order[]);
      }
    } catch {
      /* keep current memory state */
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    let filtered = data;

    if (orderIdQuery.trim()) {
      filtered = filtered.filter(o => o.id.toLowerCase().includes(orderIdQuery.trim().toLowerCase()));
    }
    if (phoneQuery.trim()) {
      filtered = filtered.filter(o => o.phone.includes(phoneQuery.trim()));
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(o => o.status === statusFilter);
    }
    if (orderTypeFilter === "preorder") {
      filtered = filtered.filter(o => o.isPreOrder);
    } else if (orderTypeFilter === "website") {
      filtered = filtered.filter(o => !o.isPreOrder && !o.sourcePageName && !o.socialMediaSourceName && o.source !== "manual");
    } else if (orderTypeFilter === "manual") {
      filtered = filtered.filter(o => !o.isPreOrder && (o.source === "manual" || !!o.sourcePageName || !!o.socialMediaSourceName));
    }
    if (sourceFilter === "facebook") {
      filtered = filtered.filter(o =>
        (o.sourcePageName && o.sourcePageName.toLowerCase().includes("facebook")) ||
        (o.socialMediaSourceName && o.socialMediaSourceName.toLowerCase().includes("facebook"))
      );
    } else if (sourceFilter === "instagram") {
      filtered = filtered.filter(o =>
        (o.sourcePageName && o.sourcePageName.toLowerCase().includes("instagram")) ||
        (o.socialMediaSourceName && o.socialMediaSourceName.toLowerCase().includes("instagram"))
      );
    }
    if (dateRange?.from) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
      to.setHours(23, 59, 59, 999);

      filtered = filtered.filter(o => {
        if (!o.date) return false;
        const orderDate = new Date(o.date);
        if (isNaN(orderDate.getTime())) return true;
        return orderDate >= from && orderDate <= to;
      });
    }

    return filtered;
  }, [data, orderIdQuery, phoneQuery, statusFilter, orderTypeFilter, sourceFilter, dateRange]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (orderTypeFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (dateRange?.from ? 1 : 0) +
    (orderIdQuery.trim() ? 1 : 0) +
    (phoneQuery.trim() ? 1 : 0);

  const clearAllFilters = () => {
    setOrderIdQuery("");
    setPhoneQuery("");
    setStatusFilter("all");
    setOrderTypeFilter("all");
    setSourceFilter("all");
    setDateRange(undefined);
    setPage(1);
    toast.info("All filters cleared (সব ফিল্টার ক্লিয়ার করা হয়েছে)");
  };

  const clearNonDateFilters = () => {
    setStatusFilter("all");
    setOrderTypeFilter("all");
    setSourceFilter("all");
  };

  const isTodayActive = useMemo(() => {
    if (!dateRange?.from) return false;
    const now = new Date();
    const isSameStart = dateRange.from.getDate() === now.getDate() && dateRange.from.getMonth() === now.getMonth() && dateRange.from.getFullYear() === now.getFullYear();
    const isSameEnd = !dateRange.to || (dateRange.to.getDate() === now.getDate() && dateRange.to.getMonth() === now.getMonth() && dateRange.to.getFullYear() === now.getFullYear());
    return isSameStart && isSameEnd;
  }, [dateRange]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
    toast.success("Orders refreshed");
  };

  const copyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`Copied Order #${id}`);
  };

  const copyCustomerPhone = (phoneNumber: string) => {
    navigator.clipboard.writeText(phoneNumber);
    toast.success(`Copied phone: ${phoneNumber}`);
  };

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setData(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      await contextUpdateStatus(orderId, newStatus as unknown as Parameters<typeof contextUpdateStatus>[1]);
      toast.success(`Order ${orderId} marked as ${newStatus}`);
    } catch {
      toast.error(`Failed to update order ${orderId}`);
    }
  };

  const handleSavePayment = async (orderId: string, customPaid?: number) => {
    const targetOrder = data.find(o => o.id === orderId);
    if (!targetOrder) return;

    const paidVal = customPaid !== undefined ? customPaid : (parseFloat(editingPaymentPaidValue) || 0);
    const totalAmount = Number(targetOrder.total) || 0;
    const finalPaid = Math.max(0, paidVal);

    try {
      setIsSavingPayment(true);
      setData(prev => prev.map(o => o.id === orderId ? { ...o, paid: finalPaid } : o));
      await contextUpdateOrder(orderId, {
        paid: finalPaid,
        total: totalAmount,
      });
      toast.success(`Payment updated for #${orderId.replace(/^ORD-|^INC-/, "")}: Paid ৳${finalPaid}`);
      setEditingPaymentOrderId(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update payment");
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleSaveQuickEdit = async (updatedFields: Partial<Order>) => {
    if (!activeQuickEditOrder) return;
    const orderId = activeQuickEditOrder.id;

    try {
      setData(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedFields } : o));
      await contextUpdateOrder(orderId, updatedFields);
      setActiveQuickEditOrder(null);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // Stock Management Logic
  const checkStockBeforeConfirm = (order: Order) => {
    setIsStockChecking(true);
    
    setTimeout(() => {
      const outOfStock: OutOfStockItem[] = [];

      order.items.forEach(item => {
        let rawName = item.name || "Product";
        let extractedSize = item.size && item.size !== "Standard" ? item.size.trim() : "";

        // Extract size from parenthetical suffix if name is "Midnight Heavyweight Tee (M)"
        const match = rawName.match(/\(([^)]+)\)$/);
        if (match) {
          if (!extractedSize || extractedSize === "Standard") {
            extractedSize = match[1].trim();
          }
          rawName = rawName.replace(/\s*\([^)]+\)$/, "").trim();
        }

        const displaySize = extractedSize || "Standard";

        // Find product in products catalog
        const prod = products.find(p => p.slug === item.slug || p.name.toLowerCase() === rawName.toLowerCase());
        
        let availableStock = 15; // default fallback stock
        if (prod) {
          availableStock = getSizeStock(prod, displaySize);
        }

        if (availableStock < item.qty) {
          outOfStock.push({
            name: rawName,
            size: displaySize,
            needed: item.qty,
            available: Math.max(0, availableStock)
          });
        }
      });

      setIsStockChecking(false);

      if (outOfStock.length > 0) {
        setStockWarningItems(outOfStock);
        setPendingConfirmOrder(order);
      } else {
        updateStatus(order.id, "confirmed");
      }
    }, 200);
  };

  const confirmWithStockIssue = () => {
    if (pendingConfirmOrder) {
      updateStatus(pendingConfirmOrder.id, "confirmed");
    }
    cancelStockWarning();
  };

  const cancelStockWarning = () => {
    setStockWarningItems([]);
    setPendingConfirmOrder(null);
  };

  const progressStatus = (order: Order) => {
    const next = nextStatusMap[order.status];
    if (!next) return;

    if (order.status === "pending" && next === "confirmed") {
      checkStockBeforeConfirm(order);
    } else {
      updateStatus(order.id, next);
    }
  };

  const handleManualStatusChange = (order: Order, newStatus: OrderStatus) => {
    if (order.status === "pending" && newStatus === "confirmed") {
      checkStockBeforeConfirm(order);
    } else {
      updateStatus(order.id, newStatus);
    }
  };

  const transferToMainOrder = (orderId: string) => {
    setData(prev => prev.map(o => o.id === orderId ? { ...o, isPreOrder: false } : o));
    toast.success("Order transferred to main pool. Stock will now be deducted upon confirmation.");
  };

  const getOrderSourceDetails = (o: Order & { socialMediaSourceName?: string; sourcePageName?: string; note?: string; address?: string; shippingAddress?: string }) => {
    let socialMedia = o.socialMediaSourceName || "";
    let pageName = o.sourcePageName || "";

    if (!socialMedia || !pageName) {
      const fullText = `${o.note || ""} ${o.address || o.shippingAddress || ""}`;
      const sourceMatch = fullText.match(/Source:\s*([^|\n,]+)/i);
      const socialMatch = fullText.match(/Social:\s*([^|\n,]+)/i);

      if (socialMatch && socialMatch[1]) {
        socialMedia = socialMatch[1].trim();
      }
      if (sourceMatch && sourceMatch[1]) {
        pageName = sourceMatch[1].trim();
      }
    }

    const isWebsite =
      (!socialMedia && !pageName && o.source !== "manual") ||
      (socialMedia.toLowerCase() === "website" && !pageName);

    return {
      isWebsite,
      socialMedia: socialMedia || (o.source === "manual" ? "Manual Order" : isWebsite ? "Website" : "Social Media"),
      pageName: pageName || (o.source === "manual" ? "POS / Direct" : "-"),
    };
  };

  const preOrderCount = useMemo(() => data.filter((o) => o.isPreOrder).length, [data]);

  return (
    <div className="space-y-4 relative">

      {/* Quick Type Selection Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setOrderTypeFilter("all")}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            orderTypeFilter === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <ShoppingCart className="size-3.5" />
          All Orders ({data.length})
        </button>
        <button
          type="button"
          onClick={() => setOrderTypeFilter("website")}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            orderTypeFilter === "website"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Globe className="size-3.5" />
          Website Orders ({data.filter(o => !o.isPreOrder && !o.sourcePageName && !o.socialMediaSourceName && o.source !== "manual").length})
        </button>
        <button
          type="button"
          onClick={() => setOrderTypeFilter("manual")}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            orderTypeFilter === "manual"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-100"
          }`}
        >
          <Layers className="size-3.5" />
          Manual Orders ({data.filter(o => !o.isPreOrder && (o.source === "manual" || !!o.sourcePageName || !!o.socialMediaSourceName)).length})
        </button>
        <button
          type="button"
          onClick={() => setOrderTypeFilter("preorder")}
          className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
            orderTypeFilter === "preorder"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 hover:bg-indigo-100"
          }`}
        >
          <PackagePlus className="size-3.5" />
          Pre-Orders ({preOrderCount})
        </button>
      </div>

      {/* Filter Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-xl border shadow-sm">
          <div className="relative flex-1 min-w-[180px]">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Order ID..."
              value={orderIdQuery}
              onChange={(e) => setOrderIdQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
            {orderIdQuery && (
              <button
                onClick={() => setOrderIdQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Phone..."
              value={phoneQuery}
              onChange={(e) => setPhoneQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
            {phoneQuery && (
              <button
                onClick={() => setPhoneQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={statusFilter !== "all" || orderTypeFilter !== "all" || sourceFilter !== "all" ? "default" : "outline"}
                size="sm"
                className={`gap-2 text-xs h-9 font-medium transition-colors ${
                  statusFilter !== "all" || orderTypeFilter !== "all" || sourceFilter !== "all"
                    ? "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20 hover:text-primary"
                    : ""
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="truncate">
                  {statusFilter !== "all"
                    ? `Status: ${statusFilter.toUpperCase()}`
                    : orderTypeFilter !== "all"
                    ? `Type: ${orderTypeFilter}`
                    : sourceFilter !== "all"
                    ? `Source: ${sourceFilter}`
                    : "Filter Orders"}
                </span>
                {(statusFilter !== "all" ? 1 : 0) + (orderTypeFilter !== "all" ? 1 : 0) + (sourceFilter !== "all" ? 1 : 0) > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                    {(statusFilter !== "all" ? 1 : 0) + (orderTypeFilter !== "all" ? 1 : 0) + (sourceFilter !== "all" ? 1 : 0)}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-84 p-4 space-y-4 shadow-lg" align="start">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Filter Orders</h4>
                {(statusFilter !== "all" || orderTypeFilter !== "all" || sourceFilter !== "all") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearNonDateFilters}
                    className="h-6 text-xs px-2 text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold"
                  >
                    <RotateCcw className="size-3 mr-1" /> Clear Filters
                  </Button>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Order Status</span>
                  <span className="text-[11px] font-semibold text-primary capitalize">{statusFilter}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    variant={statusFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                    className="h-7 text-xs"
                  >
                    All Status
                  </Button>
                  {statusOptions.map(s => (
                    <Button
                      key={s}
                      variant={statusFilter === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(s)}
                      className="h-7 text-xs capitalize truncate px-1"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Order Type</span>
                  <span className="text-[11px] font-semibold text-primary capitalize">{orderTypeFilter}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant={orderTypeFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderTypeFilter("all")}
                    className="h-7 text-xs"
                  >
                    All Types
                  </Button>
                  <Button
                    variant={orderTypeFilter === "website" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderTypeFilter("website")}
                    className="h-7 text-xs"
                  >
                    Website
                  </Button>
                  <Button
                    variant={orderTypeFilter === "manual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderTypeFilter("manual")}
                    className="h-7 text-xs"
                  >
                    Manual
                  </Button>
                  <Button
                    variant={orderTypeFilter === "preorder" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderTypeFilter("preorder")}
                    className="h-7 text-xs"
                  >
                    Pre-Order
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Traffic Source</span>
                  <span className="text-[11px] font-semibold text-primary capitalize">{sourceFilter}</span>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant={sourceFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSourceFilter("all")}
                    className="flex-1 h-7 text-xs"
                  >
                    All Sources
                  </Button>
                  <Button
                    variant={sourceFilter === "facebook" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSourceFilter("facebook")}
                    className="flex-1 h-7 text-xs"
                  >
                    Facebook
                  </Button>
                  <Button
                    variant={sourceFilter === "instagram" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSourceFilter("instagram")}
                    className="flex-1 h-7 text-xs"
                  >
                    Instagram
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="w-full text-xs h-7 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <RotateCcw className="size-3 mr-1.5" /> Clear All Filters
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-full sm:w-auto">
            <DateRangePicker value={dateRange} onUpdate={setDateRange} />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="gap-1.5 text-xs h-9 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive font-medium"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear Filters ({activeFiltersCount})
              </Button>
            )}
            <Button variant="secondary" className="gap-2 w-full sm:w-auto text-xs h-9" asChild>
              <Link href="/admin/manual-order">
                <ShoppingCart className="h-4 w-4" /> New Order
              </Link>
            </Button>
            <Button className="gap-2 w-full sm:w-auto text-xs h-9" asChild>
              <Link href="/admin/pre-order">
                <PackagePlus className="h-4 w-4" /> Pre-order
              </Link>
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm min-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Order No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Courier</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead>Social Media</TableHead>
              <TableHead>Page Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.map((o) => {
              const sourceInfo = getOrderSourceDetails(o);
              const totalAmount = Number(o.total) || 0;
              const paidAmount = Number(o.paid) || 0;
              const dueAmount = Math.max(0, totalAmount - paidAmount);
              const cleanId = o.id.replace(/^ORD-|^INC-/, "");
              
              // Extract order time
              let timeDisplay = "";
              if (o.createdAt) {
                try {
                  const dateObj = new Date(o.createdAt);
                  if (!isNaN(dateObj.getTime())) {
                    timeDisplay = dateObj.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });
                  }
                } catch {
                  /* fallback */
                }
              }

              return (
                <TableRow key={o.id} className="group">
                  <TableCell>
                    <div
                      className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors select-none group/id"
                      onClick={() => copyOrderId(cleanId)}
                      title={`Click to copy Order ID: ${cleanId}`}
                    >
                      <span className={`font-mono text-xs font-semibold ${o.isPreOrder ? "text-indigo-600 font-bold" : ""}`}>
                        {cleanId}
                      </span>
                      <Copy className="h-3 w-3 opacity-0 group-hover/id:opacity-100 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="space-y-0.5">
                      <span className="text-foreground font-medium block">{o.date}</span>
                      {timeDisplay && (
                        <span className="text-[11px] text-muted-foreground block font-mono">
                          {timeDisplay}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/customers/${encodeURIComponent(o.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline hover:text-primary transition-colors block max-w-[120px] truncate group-hover:flex group-hover:items-center group-hover:gap-1"
                      title={`Open ${o.customer}'s profile in new tab`}
                    >
                      {o.customer}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 shrink-0" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors select-none group/phone"
                      onClick={() => copyCustomerPhone(o.phone)}
                      title="Click to copy phone number"
                    >
                      <span className="text-xs text-muted-foreground group-hover/phone:text-primary font-medium">{o.phone}</span>
                      <Copy className="h-3 w-3 opacity-0 group-hover/phone:opacity-100 transition-opacity text-primary" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={`flex items-center gap-2 rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize border transition-colors hover:opacity-80 ${statusStyles[o.status]}`}>
                          {o.status}
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-48">
                        {statusOptions.map(s => (
                          <DropdownMenuItem key={s} onClick={() => handleManualStatusChange(o, s)} className="capitalize flex justify-between">
                            {s}
                            {o.status === s && <Check className="h-3 w-3" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>
                    {o.courierName ? (
                      <div className="space-y-0.5 max-w-[140px]">
                        <div className="flex items-center gap-1">
                          <Link
                            href={o.shipmentBatchId ? `/admin/bulk-shipment/${o.shipmentBatchId}` : "/admin/bulk-shipment"}
                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 truncate"
                            title={`View Shipment Batch: ${o.courierName}`}
                          >
                            <Truck className="size-3 shrink-0 text-primary" />
                            <span className="truncate">{o.courierName}</span>
                          </Link>
                        </div>
                        {o.courierTrackingNumber ? (
                          <span
                            onClick={() => {
                              navigator.clipboard.writeText(o.courierTrackingNumber!);
                              toast.success(`Copied Tracking: ${o.courierTrackingNumber}`);
                            }}
                            className="font-mono text-[10px] text-muted-foreground hover:text-foreground cursor-pointer bg-muted/60 px-1.5 py-0.5 rounded inline-block"
                            title="Click to copy tracking number"
                          >
                            {o.courierTrackingNumber}
                          </span>
                        ) : o.shipmentStatus ? (
                          <span className="text-[10px] capitalize text-muted-foreground block">
                            ({o.shipmentStatus.replace(/_/g, " ")})
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold text-xs tracking-tight">{formatBDT(totalAmount)}</TableCell>

                  {/* Paid cell with interactive edit popover */}
                  <TableCell className="text-right">
                    <Popover
                      open={editingPaymentOrderId === o.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setEditingPaymentOrderId(o.id);
                          setEditingPaymentPaidValue(String(paidAmount));
                        } else {
                          setEditingPaymentOrderId(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer px-1.5 py-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                          title="Click to edit Paid amount"
                        >
                          {formatBDT(paidAmount)}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-3 space-y-2.5 shadow-lg" align="end">
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <span className="text-xs font-bold">Update Payment</span>
                          <span className="font-mono text-[11px] text-muted-foreground font-semibold">
                            Total: {formatBDT(totalAmount)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-muted-foreground">Paid Amount (৳)</label>
                          <Input
                            type="number"
                            min="0"
                            value={editingPaymentPaidValue}
                            onChange={(e) => setEditingPaymentPaidValue(e.target.value)}
                            className="h-8 text-xs font-semibold"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSavePayment(o.id);
                              }
                            }}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex-1 h-6 text-[10px] px-1"
                            onClick={() => handleSavePayment(o.id, totalAmount)}
                            disabled={isSavingPayment}
                          >
                            Full Paid
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex-1 h-6 text-[10px] px-1 text-destructive"
                            onClick={() => handleSavePayment(o.id, 0)}
                            disabled={isSavingPayment}
                          >
                            Unpaid
                          </Button>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full h-7 text-xs font-bold"
                          onClick={() => handleSavePayment(o.id)}
                          disabled={isSavingPayment}
                        >
                          {isSavingPayment ? "Saving..." : "Save Payment"}
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </TableCell>

                  {/* Due cell with interactive edit popover */}
                  <TableCell className="text-right">
                    <Popover
                      open={editingPaymentOrderId === o.id}
                      onOpenChange={(open) => {
                        if (open) {
                          setEditingPaymentOrderId(o.id);
                          setEditingPaymentPaidValue(String(paidAmount));
                        } else {
                          setEditingPaymentOrderId(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`font-bold text-xs hover:underline cursor-pointer px-1.5 py-0.5 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors ${
                            dueAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                          }`}
                          title="Click to edit payment & due amount"
                        >
                          {formatBDT(dueAmount)}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-3 space-y-2.5 shadow-lg" align="end">
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <span className="text-xs font-bold">Update Payment</span>
                          <span className="font-mono text-[11px] text-muted-foreground font-semibold">
                            Total: {formatBDT(totalAmount)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-muted-foreground">Paid Amount (৳)</label>
                          <Input
                            type="number"
                            min="0"
                            value={editingPaymentPaidValue}
                            onChange={(e) => setEditingPaymentPaidValue(e.target.value)}
                            className="h-8 text-xs font-semibold"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSavePayment(o.id);
                              }
                            }}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex-1 h-6 text-[10px] px-1"
                            onClick={() => handleSavePayment(o.id, totalAmount)}
                            disabled={isSavingPayment}
                          >
                            Full Paid
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex-1 h-6 text-[10px] px-1 text-destructive"
                            onClick={() => handleSavePayment(o.id, 0)}
                            disabled={isSavingPayment}
                          >
                            Unpaid
                          </Button>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full h-7 text-xs font-bold"
                          onClick={() => handleSavePayment(o.id)}
                          disabled={isSavingPayment}
                        >
                          {isSavingPayment ? "Saving..." : "Save Payment"}
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </TableCell>

                  <TableCell>
                    {sourceInfo.isWebsite ? (
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-1 rounded-md font-medium w-fit">
                        <Globe className="h-3.5 w-3.5 text-slate-500" /> <span>Website</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-pink-700 bg-pink-50 dark:bg-pink-950/40 dark:text-pink-300 border border-pink-200/60 px-2 py-1 rounded-md font-semibold w-fit">
                        <Share2 className="h-3.5 w-3.5 text-pink-500" /> <span className="truncate max-w-[110px]">{sourceInfo.socialMedia}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {sourceInfo.isWebsite || sourceInfo.pageName === "-" ? (
                      <span className="text-xs text-muted-foreground font-mono">-</span>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 px-2 py-1 rounded-md font-semibold w-fit max-w-[140px] truncate">
                        <Layers className="h-3.5 w-3.5 text-blue-500" /> <span className="truncate">{sourceInfo.pageName}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1.5 min-w-[240px]">
                      {/* Quick Edit Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] px-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-600 hover:text-white flex items-center gap-1 font-bold"
                        onClick={() => setActiveQuickEditOrder(o)}
                        title="Quick edit customer, page, UTM and amounts"
                      >
                        <Pencil className="h-3 w-3" /> Quick Edit
                      </Button>

                      {o.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] px-2 bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-600 hover:text-white flex items-center gap-1 font-bold"
                          onClick={() => {
                            if (o.isPreOrder || o.status === "preorder") {
                              router.push(`/admin/pre-order?edit=${o.id}`);
                            } else {
                              router.push(`/admin/manual-order?edit=${o.id}`);
                            }
                          }}
                        >
                          Edit
                        </Button>
                      )}

                      {nextStatusLabels[o.status] && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white" onClick={() => progressStatus(o)}>
                          {nextStatusLabels[o.status]}
                        </Button>
                      )}
                      
                      {o.isPreOrder && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-600 hover:text-white" onClick={() => transferToMainOrder(o.id)}>
                          Transfer
                        </Button>
                      )}

                      {o.status === "pending" && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white" onClick={() => setActiveNotesOrder(o)}>
                          Notes {o.hasNotes || Boolean(o.note) || (getSavedNotesStore()[o.id]?.length ?? 0) > 0 && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-blue-600" />}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-600 hover:text-white" onClick={() => setActiveInvoiceOrder(o)}>PDF</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-600 hover:text-white" onClick={() => setActiveTrackingOrder(o)}>History</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-green-50 text-green-600 border-green-200 hover:bg-green-600 hover:text-white" onClick={() => window.open(`https://wa.me/${o.phone.replace(/\D/g, "")}`, "_blank")}>WA</Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {paginatedOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground opacity-60">
                      <PackageX className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">No orders found</h3>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {dateRange?.from ? "No orders found for the selected date or filter criteria." : "Adjust your search or filters to find orders."}
                      </p>
                    </div>
                    {activeFiltersCount > 0 && (
                      <Button variant="outline" size="sm" onClick={clearAllFilters} className="gap-1.5 text-xs mt-1">
                        <RotateCcw className="size-3.5" /> View All Orders (Clear Filters)
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border p-4 rounded-lg">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span> — <span className="font-medium text-foreground">{Math.min(page * pageSize, filteredOrders.length)}</span> of {filteredOrders.length} results
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <div className="px-4 py-1.5 border rounded-md text-sm">Page {page} / {totalPages}</div>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>

      {/* Modals */}
      <OrderNotesModal isOpen={!!activeNotesOrder} order={activeNotesOrder} onClose={() => setActiveNotesOrder(null)} />
      <OrderTrackingModal isOpen={!!activeTrackingOrder} order={activeTrackingOrder} onClose={() => setActiveTrackingOrder(null)} />
      <OrderInvoiceModal isOpen={!!activeInvoiceOrder} order={activeInvoiceOrder} onClose={() => setActiveInvoiceOrder(null)} />
      <QuickEditOrderModal
        isOpen={!!activeQuickEditOrder}
        order={activeQuickEditOrder}
        onClose={() => setActiveQuickEditOrder(null)}
        onSave={handleSaveQuickEdit}
      />
      
      <OrderStockWarningModal 
        isOpen={stockWarningItems.length > 0} 
        items={stockWarningItems} 
        onCancel={cancelStockWarning} 
        onConfirmAnyway={confirmWithStockIssue} 
      />
    </div>
  );
}
