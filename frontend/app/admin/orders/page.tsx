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
import { formatBDT, orders, inventory, statusStyles, OrderStatus, Order } from "@/lib/dashboard-data";
import { ordersService } from "@/lib/api/services/orders.service";
import { useOrders } from "@/lib/orders";
import { useStaffStore } from "@/lib/staff-store";
import { useSettings } from "@/context/settings-context";
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
  XCircle,
  RotateCcw,
  Truck,
  FileText,
  Trash2,
  MessageCircle,
  Bell,
  History,
  PhoneCall,
  Printer,
} from "lucide-react";
import dynamic from "next/dynamic";
import { getSavedNotesStore, getOrderNoteCount } from "@/components/admin/order-notes-modal";
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
const OrderReturnProcessModal = dynamic(() => import("@/components/admin/order-return-process-modal").then(m => m.OrderReturnProcessModal), { ssr: false });

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

export type NoteAttemptFilter = "all" | "touched" | "untouched" | "1st-attempt" | "2nd-attempt" | "3rd-attempt" | "4th-or-more";

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
  const [noteFilter, setNoteFilter] = useState<NoteAttemptFilter>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [salesExecutiveFilter, setSalesExecutiveFilter] = useState<string>("all");
  const [courierFilter, setCourierFilter] = useState<string>("all");
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [utmSourceFilter, setUtmSourceFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    if (rawType === "preorder" || rawType === "manual" || rawType === "website" || rawType === "all") {
      setOrderTypeFilter(rawType);
      setPage(1);
    }
  }, [rawType]);

  const [activeNotesOrder, setActiveNotesOrder] = useState<Order | null>(null);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [activeQuickEditOrder, setActiveQuickEditOrder] = useState<Order | null>(null);
  const [activeReturnOrder, setActiveReturnOrder] = useState<Order | null>(null);

  // Quick Payment Popover state
  const [editingPaymentOrderId, setEditingPaymentOrderId] = useState<string | null>(null);
  const [editingPaymentPaidValue, setEditingPaymentPaidValue] = useState<string>("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Stock Checking State
  const [isStockChecking, setIsStockChecking] = useState(false);
  const [stockWarningItems, setStockWarningItems] = useState<OutOfStockItem[]>([]);
  const [pendingConfirmOrder, setPendingConfirmOrder] = useState<Order | null>(null);

  // Delete Order Confirmation Modal State
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  // Cancel Order Confirmation Modal State
  const [orderToCancel, setOrderToCancel] = useState<{ order: Order; targetStatus: OrderStatus } | null>(null);

  // Transferring state
  const [isTransferringId, setIsTransferringId] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const {
    orders: contextOrders,
    updateStatus: contextUpdateStatus,
    updateOrder: contextUpdateOrder,
    deleteOrder,
    transferToRegularOrder,
    transferToPreOrder,
  } = useOrders();
  const { staffList } = useStaffStore();
  const { settings } = useSettings();
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
    } else {
      // Default: 'all' (All Orders) view excludes pre-orders
      filtered = filtered.filter(o => !o.isPreOrder);
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

    if (noteFilter !== "all") {
      filtered = filtered.filter(o => {
        const count = getOrderNoteCount(o);
        if (noteFilter === "touched") {
          return count > 0;
        } else if (noteFilter === "untouched") {
          return count === 0;
        } else if (noteFilter === "1st-attempt") {
          return count === 1;
        } else if (noteFilter === "2nd-attempt") {
          return count === 2;
        } else if (noteFilter === "3rd-attempt") {
          return count === 3;
        } else if (noteFilter === "4th-or-more") {
          return count >= 4;
        }
        return true;
      });
    }

    if (productFilter !== "all") {
      filtered = filtered.filter(o =>
        (o.items || []).some(it =>
          it.slug?.toLowerCase() === productFilter.toLowerCase() ||
          it.name?.toLowerCase().includes(productFilter.toLowerCase())
        )
      );
    }

    if (courierFilter !== "all") {
      filtered = filtered.filter(o =>
        (o.courierName || "").toLowerCase().includes(courierFilter.toLowerCase())
      );
    }

    if (pageFilter !== "all") {
      filtered = filtered.filter(o =>
        (o.sourcePageName || "").toLowerCase().includes(pageFilter.toLowerCase())
      );
    }

    if (utmSourceFilter !== "all") {
      filtered = filtered.filter(o =>
        (o.socialMediaSourceName || "").toLowerCase().includes(utmSourceFilter.toLowerCase())
      );
    }

    if (salesExecutiveFilter !== "all") {
      filtered = filtered.filter(o => {
        const targetStaff = salesExecutiveFilter.toLowerCase();
        return (
          (o.note && o.note.toLowerCase().includes(targetStaff)) ||
          (o.source && o.source.toLowerCase().includes(targetStaff))
        );
      });
    }

    return filtered;
  }, [
    data,
    orderIdQuery,
    phoneQuery,
    statusFilter,
    orderTypeFilter,
    sourceFilter,
    noteFilter,
    productFilter,
    salesExecutiveFilter,
    courierFilter,
    pageFilter,
    utmSourceFilter,
    dateRange,
  ]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (orderTypeFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (noteFilter !== "all" ? 1 : 0) +
    (productFilter !== "all" ? 1 : 0) +
    (salesExecutiveFilter !== "all" ? 1 : 0) +
    (courierFilter !== "all" ? 1 : 0) +
    (pageFilter !== "all" ? 1 : 0) +
    (utmSourceFilter !== "all" ? 1 : 0) +
    (dateRange?.from ? 1 : 0) +
    (orderIdQuery.trim() ? 1 : 0) +
    (phoneQuery.trim() ? 1 : 0);

  const clearAllFilters = () => {
    setOrderIdQuery("");
    setPhoneQuery("");
    setStatusFilter("all");
    setOrderTypeFilter("all");
    setSourceFilter("all");
    setNoteFilter("all");
    setProductFilter("all");
    setSalesExecutiveFilter("all");
    setCourierFilter("all");
    setPageFilter("all");
    setUtmSourceFilter("all");
    setDateRange(undefined);
    setPage(1);
    toast.info("All filters cleared (সব ফিল্টার ক্লিয়ার করা হয়েছে)");
  };

  const clearNonDateFilters = () => {
    setStatusFilter("all");
    setOrderTypeFilter("all");
    setSourceFilter("all");
    setNoteFilter("all");
    setProductFilter("all");
    setSalesExecutiveFilter("all");
    setCourierFilter("all");
    setPageFilter("all");
    setUtmSourceFilter("all");
  };

  // Derive unique filter options from data and configuration
  const availableCouriers = useMemo(() => {
    const defaultCouriers = ["Steadfast", "Pathao", "RedX", "Paperfly", "Sundarban", "SA Paribahan", "eCourier", "Standard Courier"];
    const found = new Set(defaultCouriers);
    data.forEach((o) => {
      if (o.courierName && o.courierName.trim()) found.add(o.courierName.trim());
    });
    return Array.from(found);
  }, [data]);

  const availablePages = useMemo(() => {
    const found = new Set<string>();
    if (settings?.socialMedia?.sources) {
      Object.keys(settings.socialMedia.sources).forEach((p) => found.add(p));
    }
    found.add("Facebook Page");
    found.add("Instagram");
    found.add("Website / Direct");
    data.forEach((o) => {
      if (o.sourcePageName && o.sourcePageName.trim()) found.add(o.sourcePageName.trim());
    });
    return Array.from(found);
  }, [data, settings]);

  const availableUtmSources = useMemo(() => {
    const found = new Set<string>();
    if (settings?.socialMedia?.sources) {
      Object.values(settings.socialMedia.sources).flat().forEach((s) => found.add(s));
    }
    data.forEach((o) => {
      if (o.socialMediaSourceName && o.socialMediaSourceName.trim()) found.add(o.socialMediaSourceName.trim());
    });
    return Array.from(found);
  }, [data, settings]);

  const availableProductsList = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => map.set(p.slug, p.name));
    data.forEach((o) => {
      (o.items || []).forEach((it) => {
        if (it.slug && !map.has(it.slug)) map.set(it.slug, it.name || it.slug);
      });
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [data]);

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
    if (newStatus === "cancelled") {
      setOrderToCancel({ order, targetStatus: newStatus });
      return;
    }

    if (newStatus === "return" || newStatus === "return-process") {
      setActiveReturnOrder(order);
      return;
    }

    if (order.status === "pending" && newStatus === "confirmed") {
      checkStockBeforeConfirm(order);
    } else {
      updateStatus(order.id, newStatus);
    }
  };

  const confirmCancelOrder = () => {
    if (orderToCancel) {
      updateStatus(orderToCancel.order.id, orderToCancel.targetStatus);
      toast.info(`Order #${orderToCancel.order.id.replace(/^ORD-/, "")} has been cancelled.`);
      setOrderToCancel(null);
    }
  };

  const handleTransferToRegularOrder = async (order: Order) => {
    setIsTransferringId(order.id);
    try {
      const res = await transferToRegularOrder(order.id);
      if (res.success && res.newOrderNumber) {
        toast.success(
          `Pre-Order #${order.id} transferred to regular order #${res.newOrderNumber}! Stock reserved.`
        );
        // Refresh orders data silently
        fetchOrders();
      } else {
        toast.error(res.error || "Cannot transfer to regular order.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to transfer order.");
    } finally {
      setIsTransferringId(null);
    }
  };

  const handleTransferToPreOrder = async (order: Order) => {
    if (order.status !== "pending") {
      toast.error("Only orders in 'Pending' status can be transferred to Pre-Order.");
      return;
    }

    setIsTransferringId(order.id);
    try {
      const res = await transferToPreOrder(order.id);
      if (res.success && res.newOrderNumber) {
        toast.success(
          `Pending order #${order.id} transferred to pre-order #${res.newOrderNumber}!`
        );
        // Refresh orders data silently
        fetchOrders();
      } else {
        toast.error(res.error || "Cannot transfer to pre-order.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to transfer order.");
    } finally {
      setIsTransferringId(null);
    }
  };

  const checkPreOrderStockAvailability = (order: Order): { available: boolean; reason?: string } => {
    for (const item of order.items) {
      let rawName = item.name || "Product";
      let extractedSize = item.size && item.size !== "Standard" ? item.size.trim() : "";

      const match = rawName.match(/\(([^)]+)\)$/);
      if (match) {
        if (!extractedSize || extractedSize === "Standard") {
          extractedSize = match[1].trim();
        }
        rawName = rawName.replace(/\s*\([^)]+\)$/, "").trim();
      }

      const displaySize = extractedSize || "Standard";
      const prod = products.find(p => p.slug === item.slug || p.name.toLowerCase() === rawName.toLowerCase());

      const availableStock = prod ? getSizeStock(prod, displaySize) : 15;
      if (availableStock < item.qty) {
        return {
          available: false,
          reason: `${rawName} (${displaySize}): Stock is ${Math.max(0, availableStock)}, required ${item.qty}`,
        };
      }
    }
    return { available: true };
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
          All Orders ({data.filter(o => !o.isPreOrder).length})
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
                variant={statusFilter !== "all" || orderTypeFilter !== "all" || sourceFilter !== "all" || noteFilter !== "all" ? "default" : "outline"}
                size="sm"
                className={`gap-2 text-xs h-9 font-medium transition-colors ${
                  statusFilter !== "all" || orderTypeFilter !== "all" || sourceFilter !== "all" || noteFilter !== "all"
                    ? "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20 hover:text-primary"
                    : ""
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="truncate">
                  {statusFilter !== "all"
                    ? `Status: ${statusFilter.toUpperCase()}`
                    : noteFilter !== "all"
                    ? `Note: ${noteFilter}`
                    : orderTypeFilter !== "all"
                    ? `Type: ${orderTypeFilter}`
                    : sourceFilter !== "all"
                    ? `Source: ${sourceFilter}`
                    : "Filter Orders"}
                </span>
                {(statusFilter !== "all" ? 1 : 0) + (orderTypeFilter !== "all" ? 1 : 0) + (sourceFilter !== "all" ? 1 : 0) + (noteFilter !== "all" ? 1 : 0) > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                    {(statusFilter !== "all" ? 1 : 0) + (orderTypeFilter !== "all" ? 1 : 0) + (sourceFilter !== "all" ? 1 : 0) + (noteFilter !== "all" ? 1 : 0)}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-84 p-4 space-y-4 shadow-lg" align="start">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Filter Orders</h4>
                {(statusFilter !== "all" || orderTypeFilter !== "all" || sourceFilter !== "all" || noteFilter !== "all") && (
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

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Note & Attempt Filter</span>
                  <span className="text-[11px] font-semibold text-primary capitalize">
                    {noteFilter === "all"
                      ? "All"
                      : noteFilter === "touched"
                      ? "Touched"
                      : noteFilter === "untouched"
                      ? "Untouched"
                      : noteFilter === "1st-attempt"
                      ? "1st Attempt"
                      : noteFilter === "2nd-attempt"
                      ? "2nd Attempt"
                      : noteFilter === "3rd-attempt"
                      ? "3rd Attempt"
                      : "4+ Attempts"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant={noteFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNoteFilter("all")}
                    className="h-7 text-xs"
                  >
                    All Orders
                  </Button>
                  <Button
                    variant={noteFilter === "touched" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNoteFilter("touched")}
                    className="h-7 text-xs"
                  >
                    Touch (নোট আছে)
                  </Button>
                  <Button
                    variant={noteFilter === "untouched" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNoteFilter("untouched")}
                    className="h-7 text-xs"
                  >
                    Untouch (নোট ছাড়া)
                  </Button>
                  <Button
                    variant={noteFilter === "1st-attempt" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNoteFilter("1st-attempt")}
                    className="h-7 text-xs"
                  >
                    1st Attempt (১ বার)
                  </Button>
                  <Button
                    variant={noteFilter === "2nd-attempt" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNoteFilter("2nd-attempt")}
                    className="h-7 text-xs"
                  >
                    2nd Attempt (২ বার)
                  </Button>
                  <Button
                    variant={noteFilter === "3rd-attempt" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNoteFilter("3rd-attempt")}
                    className="h-7 text-xs"
                  >
                    3rd Attempt (৩ বার)
                  </Button>
                  <Button
                    variant={noteFilter === "4th-or-more" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNoteFilter("4th-or-more")}
                    className="h-7 text-xs col-span-2"
                  >
                    4+ Attempts (৪ বার বা তার বেশি)
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

        {/* Dedicated Advanced Filter Toolbar (Note & Attempt, Product, Sales Executive, Courier, Page, UTM Source) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-card p-2.5 rounded-xl border shadow-xs text-xs">
          {/* Note & Attempt Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              Note & Attempt
            </label>
            <select
              value={noteFilter}
              onChange={(e) => {
                setNoteFilter(e.target.value as NoteAttemptFilter);
                setPage(1);
              }}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Notes (সব)</option>
              <option value="touched">Touch (নোট আছে)</option>
              <option value="untouched">Untouch (নোট ছাড়া)</option>
              <option value="1st-attempt">1st Attempt (১ বার)</option>
              <option value="2nd-attempt">2nd Attempt (২ বার)</option>
              <option value="3rd-attempt">3rd Attempt (৩ বার)</option>
              <option value="4th-or-more">4+ Attempts (৪ বার+)</option>
            </select>
          </div>

          {/* Product Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">
              Product Filter
            </label>
            <select
              value={productFilter}
              onChange={(e) => {
                setProductFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Products (সব পণ্য)</option>
              {availableProductsList.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sales Executive Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">
              Sales Executive
            </label>
            <select
              value={salesExecutiveFilter}
              onChange={(e) => {
                setSalesExecutiveFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Staff / Executives</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          {/* Courier Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">
              Courier Filter
            </label>
            <select
              value={courierFilter}
              onChange={(e) => {
                setCourierFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Couriers (সব কুরিয়ার)</option>
              {availableCouriers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Page Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">
              Page Filter
            </label>
            <select
              value={pageFilter}
              onChange={(e) => {
                setPageFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All Source Pages (সব পেজ)</option>
              {availablePages.map((pg) => (
                <option key={pg} value={pg}>
                  {pg}
                </option>
              ))}
            </select>
          </div>

          {/* UTM Source Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">
              UTM Source
            </label>
            <select
              value={utmSourceFilter}
              onChange={(e) => {
                setUtmSourceFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All UTM Sources</option>
              {availableUtmSources.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedOrderIds.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-primary">
              {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? "s" : ""} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              Deselect All
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const selectedOrders = paginatedOrders.filter((o) => selectedOrderIds.includes(o.id));
                toast.success(`Printing invoices for ${selectedOrders.length} orders...`);
                window.print();
              }}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Printer className="size-3.5" />
              Bulk Print ({selectedOrderIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm min-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[40px] px-3">
                <input
                  type="checkbox"
                  checked={
                    paginatedOrders.length > 0 &&
                    paginatedOrders.every((o) => selectedOrderIds.includes(o.id))
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      const allPageIds = paginatedOrders.map((o) => o.id);
                      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...allPageIds])));
                    } else {
                      const pageIdSet = new Set(paginatedOrders.map((o) => o.id));
                      setSelectedOrderIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
                    }
                  }}
                  className="rounded border-input text-primary focus:ring-primary size-4 cursor-pointer"
                  title="Select all on this page"
                />
              </TableHead>
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
                <TableRow key={o.id}>
                  <TableCell className="w-[40px] px-3">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(o.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrderIds((prev) => [...prev, o.id]);
                        } else {
                          setSelectedOrderIds((prev) => prev.filter((id) => id !== o.id));
                        }
                      }}
                      className="rounded border-input text-primary focus:ring-primary size-4 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors select-none"
                      onClick={() => copyOrderId(cleanId)}
                      title={`Click to copy Order ID: ${cleanId}`}
                    >
                      <span className={`font-mono text-xs font-semibold ${o.isPreOrder ? "text-indigo-600 font-bold" : ""}`}>
                        {cleanId}
                      </span>
                      <Copy className="h-3 w-3 text-muted-foreground/60 hover:text-primary shrink-0" />
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
                    {(() => {
                      const noteCount = getOrderNoteCount(o);
                      const showPendingNoteIcon = o.status === "pending" && noteCount > 0;
                      return (
                        <div className="flex items-center gap-1.5 max-w-[150px]">
                          <Link
                            href={`/admin/customers/${encodeURIComponent(o.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline hover:text-primary transition-colors truncate inline-flex items-center gap-1"
                            title={`Open ${o.customer}'s profile in new tab`}
                          >
                            <span className="truncate">{o.customer}</span>
                            <ExternalLink className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          </Link>
                          {showPendingNoteIcon && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveNotesOrder(o);
                              }}
                              className="inline-flex items-center justify-center p-0.5 rounded text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 border border-amber-200/60 shrink-0 transition-transform active:scale-95"
                              title={`📝 Order Note (${noteCount} note${noteCount > 1 ? "s" : ""}) - Click to view/edit`}
                            >
                              <FileText className="size-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors select-none"
                      onClick={() => copyCustomerPhone(o.phone)}
                      title="Click to copy phone number"
                    >
                      <span className="text-xs text-muted-foreground hover:text-primary font-medium">{o.phone}</span>
                      <Copy className="h-3 w-3 text-muted-foreground/60 hover:text-primary shrink-0" />
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
                        {(o.isPreOrder
                          ? (["pending", "confirmed", "cancelled"] as OrderStatus[])
                          : statusOptions
                        ).map(s => (
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
                            value={editingPaymentPaidValue === "0" ? "" : editingPaymentPaidValue}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
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
                      
                      {/* Transfer Action Button for Pre-Orders with stock check gating */}
                      {o.isPreOrder && (() => {
                        const stockCheck = checkPreOrderStockAvailability(o);
                        const isBusy = isTransferringId === o.id;
                        return (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!stockCheck.available || isBusy}
                            title={
                              !stockCheck.available
                                ? `Cannot transfer: ${stockCheck.reason}`
                                : "Transfer this pre-order to a regular running order"
                            }
                            className={`h-7 text-[10px] px-2 flex items-center gap-1 font-bold ${
                              stockCheck.available
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-600 hover:text-white"
                                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            }`}
                            onClick={() => handleTransferToRegularOrder(o)}
                          >
                            <ArrowRightLeft className={`size-3 ${isBusy ? "animate-spin" : ""}`} />
                            {isBusy ? "Transferring..." : "Transfer"}
                          </Button>
                        );
                      })()}

                      {/* Transfer Action Button for Pending Regular Orders */}
                      {!o.isPreOrder && o.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isTransferringId === o.id}
                          title="Transfer this pending order to Pre-Order"
                          className="h-7 text-[10px] px-2 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-600 hover:text-white flex items-center gap-1 font-bold"
                          onClick={() => handleTransferToPreOrder(o)}
                        >
                          <ArrowRightLeft className={`size-3 ${isTransferringId === o.id ? "animate-spin" : ""}`} />
                          {isTransferringId === o.id ? "Transferring..." : "To Pre-Order"}
                        </Button>
                      )}

                      {o.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] px-2 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white"
                          onClick={() => setActiveNotesOrder(o)}
                        >
                          Notes
                          {getOrderNoteCount(o) > 0 && (
                            <span className="ml-1 px-1 py-0.2 rounded-full bg-blue-600 text-[9px] font-bold text-white leading-none">
                              {getOrderNoteCount(o)}
                            </span>
                          )}
                        </Button>
                      )}

                      {/* PDF Invoice Button */}
                      <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-600 hover:text-white" onClick={() => setActiveInvoiceOrder(o)}>PDF</Button>

                      {/* Tracking / History Action Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] px-2 bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-700 hover:text-white flex items-center gap-1 font-semibold"
                        onClick={() => setActiveTrackingOrder(o)}
                        title="View Live Tracking & Status History"
                      >
                        <Truck className="size-3 text-slate-600" /> Tracking
                      </Button>

                      {/* Action & Contact Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] px-2 bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-200 hover:text-slate-900 flex items-center gap-1 font-semibold"
                          >
                            <MoreVertical className="size-3 text-slate-600" />
                            More
                            <ChevronDown className="size-3 opacity-60 ml-0.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 p-1 text-xs">
                          {/* Transfer options in Action Menu */}
                          {o.isPreOrder && (() => {
                            const stockCheck = checkPreOrderStockAvailability(o);
                            return (
                              <DropdownMenuItem
                                disabled={!stockCheck.available || isTransferringId === o.id}
                                className={`cursor-pointer flex items-center gap-2 py-1.5 text-xs font-semibold ${
                                  stockCheck.available
                                    ? "text-indigo-700 focus:text-indigo-800 focus:bg-indigo-50"
                                    : "text-slate-400 focus:text-slate-400 focus:bg-transparent cursor-not-allowed"
                                }`}
                                onClick={() => {
                                  if (stockCheck.available) {
                                    handleTransferToRegularOrder(o);
                                  } else {
                                    toast.error(`Cannot transfer: ${stockCheck.reason}`);
                                  }
                                }}
                              >
                                <ArrowRightLeft className="size-3.5 text-indigo-600" />
                                {stockCheck.available ? "Transfer to Regular Order" : "Transfer to Regular (No Stock)"}
                              </DropdownMenuItem>
                            );
                          })()}

                          {!o.isPreOrder && o.status === "pending" && (
                            <DropdownMenuItem
                              disabled={isTransferringId === o.id}
                              className="cursor-pointer flex items-center gap-2 py-1.5 text-xs font-semibold text-purple-700 focus:text-purple-800 focus:bg-purple-50"
                              onClick={() => handleTransferToPreOrder(o)}
                            >
                              <ArrowRightLeft className="size-3.5 text-purple-600" />
                              Transfer to Pre-Order
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            className="cursor-pointer flex items-center gap-2 py-1.5 text-xs text-green-700 focus:text-green-800 focus:bg-green-50"
                            onClick={() => window.open(`https://wa.me/${o.phone.replace(/\D/g, "")}`, "_blank")}
                          >
                            <MessageCircle className="size-3.5 text-green-600" />
                            WhatsApp Chat
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer flex items-center gap-2 py-1.5 text-xs text-amber-700 focus:text-amber-800 focus:bg-amber-50"
                            onClick={() => {
                              const message = encodeURIComponent(`Dear ${o.customer}, your order #${o.id} is pending with Arza Fashion. Total: ৳${o.total}.`);
                              window.open(`https://wa.me/${o.phone.replace(/\D/g, "")}?text=${message}`, "_blank");
                            }}
                          >
                            <Bell className="size-3.5 text-amber-600" />
                            Send Reminder
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer flex items-center gap-2 py-1.5 text-xs text-slate-700 focus:text-slate-800 focus:bg-slate-50"
                            onClick={() => setActiveTrackingOrder(o)}
                          >
                            <History className="size-3.5 text-slate-600" />
                            Tracking & History
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            className="cursor-pointer flex items-center gap-2 py-1.5 text-xs font-semibold text-rose-700 focus:text-rose-800 focus:bg-rose-50"
                            onClick={() => setActiveReturnOrder(o)}
                          >
                            <RotateCcw className="size-3.5 text-rose-600" />
                            Process Return
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Delete Order Button — ONLY visible when order status is Cancelled */}
                      {o.status === "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] px-2 bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-600 hover:text-white flex items-center gap-1 font-bold"
                          onClick={() => setOrderToDelete(o)}
                          title="Delete this cancelled order"
                        >
                          <Trash2 className="size-3" /> Delete
                        </Button>
                      )}
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

      <OrderReturnProcessModal
        isOpen={!!activeReturnOrder}
        order={activeReturnOrder}
        onClose={() => setActiveReturnOrder(null)}
        onReturnSuccess={({ newStatus, newTotal, newDue, refund }) => {
          fetchOrders();
        }}
      />

      {/* Cancel Order Confirmation Popup */}
      <AlertDialog open={!!orderToCancel} onOpenChange={(open) => !open && setOrderToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <XCircle className="size-5" />
              <AlertDialogTitle>Cancel Order #{orderToCancel?.order?.id?.replace(/^ORD-/, "")}?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground space-y-1">
              <p>
                Are you sure you want to cancel this order for <strong>{orderToCancel?.order?.customer}</strong> ({orderToCancel?.order?.phone})?
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                Order Value: ৳{orderToCancel?.order?.total}. Status will be changed to <strong>CANCELLED</strong>.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 text-xs">Keep Order</AlertDialogCancel>
            <AlertDialogAction
              className="h-9 text-xs bg-rose-600 text-white hover:bg-rose-700 font-bold"
              onClick={confirmCancelOrder}
            >
              Yes, Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Order Confirmation Popup */}
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <Trash2 className="size-5" />
              <AlertDialogTitle>Delete Order #{orderToDelete?.id}?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground space-y-1">
              <p>
                Are you sure you want to permanently delete this order for <strong>{orderToDelete?.customer}</strong> ({orderToDelete?.phone})?
              </p>
              <p className="text-[11px] text-destructive/90 font-medium">
                Total: ৳{orderToDelete?.total} ({orderToDelete?.items?.length || 0} items). This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 text-xs" disabled={isDeletingOrder}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
              disabled={isDeletingOrder}
              onClick={async (e) => {
                e.preventDefault();
                if (!orderToDelete) return;
                try {
                  setIsDeletingOrder(true);
                  await deleteOrder(orderToDelete.id);
                  toast.success(`Order #${orderToDelete.id} deleted successfully`);
                  setOrderToDelete(null);
                } catch {
                  toast.error("Failed to delete order");
                } finally {
                  setIsDeletingOrder(false);
                }
              }}
            >
              {isDeletingOrder ? "Deleting..." : "Yes, Delete Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
