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
  Pencil
} from "lucide-react";
import dynamic from "next/dynamic";
import { getSavedNotesStore } from "@/components/admin/order-notes-modal";
import type { OutOfStockItem } from "@/components/admin/order-stock-warning-modal";
import { DateRange } from "react-day-picker";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Dynamic imports for heavy modal components — reduces initial JS bundle by ~40KB
const DateRangePicker = dynamic(() => import("@/components/admin/date-range-picker").then(m => m.DateRangePicker), { ssr: false });
const OrderNotesModal = dynamic(() => import("@/components/admin/order-notes-modal").then(m => m.OrderNotesModal), { ssr: false });
const OrderTrackingModal = dynamic(() => import("@/components/admin/order-tracking-modal").then(m => m.OrderTrackingModal), { ssr: false });
const OrderInvoiceModal = dynamic(() => import("@/components/admin/order-invoice-modal").then(m => m.OrderInvoiceModal), { ssr: false });
const OrderStockWarningModal = dynamic(() => import("@/components/admin/order-stock-warning-modal").then(m => m.OrderStockWarningModal), { ssr: false });

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
  const [orderIdQuery, setOrderIdQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<"all" | "preorder" | "website">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "facebook" | "instagram">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [activeNotesOrder, setActiveNotesOrder] = useState<Order | null>(null);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [activeEditOrder, setActiveEditOrder] = useState<Order | null>(null);

  // Stock Checking State
  const [isStockChecking, setIsStockChecking] = useState(false);
  const [stockWarningItems, setStockWarningItems] = useState<OutOfStockItem[]>([]);
  const [pendingConfirmOrder, setPendingConfirmOrder] = useState<Order | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<Order[]>([]);

  const fetchOrders = async () => {
    try {
      const result = await ordersService.getAll();
      setData(result.orders as unknown as Order[]);
    } catch {
      setData([]);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    let filtered = data;

    if (orderIdQuery) {
      filtered = filtered.filter(o => o.id.toLowerCase().includes(orderIdQuery.toLowerCase()));
    }
    if (phoneQuery) {
      filtered = filtered.filter(o => o.phone.includes(phoneQuery));
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(o => o.status === statusFilter);
    }
    if (orderTypeFilter === "preorder") {
      filtered = filtered.filter(o => o.isPreOrder);
    } else if (orderTypeFilter === "website") {
      filtered = filtered.filter(o => !o.isPreOrder && !o.sourcePageName && !o.socialMediaSourceName);
    }
    if (sourceFilter === "facebook") {
      filtered = filtered.filter(o => o.sourcePageName === "Facebook Campaign");
    } else if (sourceFilter === "instagram") {
      filtered = filtered.filter(o => o.socialMediaSourceName === "Instagram");
    }
    if (dateRange?.from) {
      filtered = filtered.filter(o => new Date(o.date) >= dateRange.from!);
    }
    if (dateRange?.to) {
      filtered = filtered.filter(o => new Date(o.date) <= dateRange.to!);
    }

    return filtered;
  }, [data, orderIdQuery, phoneQuery, statusFilter, orderTypeFilter, sourceFilter, dateRange]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  const activeFiltersCount = (statusFilter !== "all" ? 1 : 0) + (orderTypeFilter !== "all" ? 1 : 0) + (sourceFilter !== "all" ? 1 : 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOrders();
    setIsRefreshing(false);
    toast.success("Orders refreshed");
  };

  const copyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`Copied ${id}`);
  };

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await ordersService.updateStatus(orderId, newStatus);
      setData(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Order ${orderId} marked as ${newStatus}`);
    } catch {
      toast.error(`Failed to update order ${orderId}`);
    }
  };

  // Stock Management Logic
  const checkStockBeforeConfirm = (order: Order) => {
    setIsStockChecking(true);
    
    // Simulate API delay
    setTimeout(() => {
      const outOfStock: OutOfStockItem[] = [];

      order.items.forEach(item => {
        const product = inventory.find(p => p.slug === item.slug);
        const availableStock = product ? product.stock : 0;

        if (availableStock < item.qty) {
          outOfStock.push({
            name: item.name,
            size: item.size,
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
    }, 500);
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

  const getOrderSourceDetails = (o: Order & { socialMediaSourceName?: string; sourcePageName?: string }) => {
    let socialMedia = o.socialMediaSourceName || "";
    let pageName = o.sourcePageName || "";

    if (!socialMedia || !pageName) {
      const fullText = `${(o as any).note || ""} ${(o as any).address || (o as any).shippingAddress || ""}`;
      const sourceMatch = fullText.match(/Source:\s*([^|\n,]+)/i);
      const socialMatch = fullText.match(/Social:\s*([^|\n,]+)/i);

      if (socialMatch && socialMatch[1]) {
        socialMedia = socialMatch[1].trim();
      }
      if (sourceMatch && sourceMatch[1]) {
        pageName = sourceMatch[1].trim();
      }
    }

    const isWebsite = (!socialMedia && !pageName) || socialMedia.toLowerCase() === "website" || pageName.toLowerCase() === "website";

    return {
      isWebsite,
      socialMedia: socialMedia || (isWebsite ? "Website" : "Social Media"),
      pageName: pageName || "-",
    };
  };

  return (
    <div className="space-y-6 relative">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground text-sm">
            Manage customer purchases, update statuses, and export invoices.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-xl border shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order ID..."
            value={orderIdQuery}
            onChange={(e) => setOrderIdQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Phone Number..."
            value={phoneQuery}
            onChange={(e) => setPhoneQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Filter Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-xs h-9">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Status</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>All</Button>
                  {statusOptions.slice(0, 5).map(s => (
                    <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)} className="capitalize">{s}</Button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Order Type</h4>
                <div className="flex gap-2">
                  <Button variant={orderTypeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setOrderTypeFilter("all")}>All</Button>
                  <Button variant={orderTypeFilter === "website" ? "default" : "outline"} size="sm" onClick={() => setOrderTypeFilter("website")}>Website</Button>
                  <Button variant={orderTypeFilter === "preorder" ? "default" : "outline"} size="sm" onClick={() => setOrderTypeFilter("preorder")}>Pre-Order</Button>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Source</h4>
                <div className="flex gap-2">
                  <Button variant={sourceFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setSourceFilter("all")}>All</Button>
                  <Button variant={sourceFilter === "facebook" ? "default" : "outline"} size="sm" onClick={() => setSourceFilter("facebook")}>Facebook</Button>
                  <Button variant={sourceFilter === "instagram" ? "default" : "outline"} size="sm" onClick={() => setSourceFilter("instagram")}>Instagram</Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-full md:w-auto">
          <DateRangePicker onUpdate={setDateRange} />
        </div>

        <div className="flex-1" />
        
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="secondary" className="gap-2 w-full md:w-auto" asChild>
            <Link href="/admin/manual-order">
              <ShoppingCart className="h-4 w-4" /> New Order
            </Link>
          </Button>
          <Button className="gap-2 w-full md:w-auto" asChild>
            <Link href="/admin/pre-order">
              <PackagePlus className="h-4 w-4" /> Pre-order
            </Link>
          </Button>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
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
              <TableHead className="text-center">Revenue</TableHead>
              <TableHead>Social Media</TableHead>
              <TableHead>Page Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.map((o) => {
              const sourceInfo = getOrderSourceDetails(o);
              return (
                <TableRow key={o.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors" onClick={() => copyOrderId(o.id)}>
                      <span className={`font-mono text-xs ${o.isPreOrder ? "text-indigo-600 font-bold" : ""}`}>#{o.id}</span>
                      <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{o.date}</TableCell>
                  <TableCell>
                    <Link href={`/admin/customers/${o.phone}`} className="font-medium hover:underline hover:text-primary transition-colors block max-w-[120px] truncate">
                      {o.customer}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{o.phone}</TableCell>
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
                  <TableCell className="text-center font-semibold text-sm tracking-tight">{formatBDT(o.total)}</TableCell>
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
                    <div className="flex flex-wrap justify-end gap-1.5 min-w-[200px]">
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
                          <Pencil className="h-3 w-3" /> Edit
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

                      <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white" onClick={() => setActiveNotesOrder(o)}>
                        Notes {(o.hasNotes || (getSavedNotesStore()[o.id]?.length ?? 0) > 0) && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-blue-600" />}
                      </Button>
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
                <TableCell colSpan={9} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground opacity-50">
                      <PackageX className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">No orders found</h3>
                      <p className="text-muted-foreground text-sm">Adjust your filters to find what you're looking for.</p>
                    </div>
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
      
      <OrderStockWarningModal 
        isOpen={stockWarningItems.length > 0} 
        items={stockWarningItems} 
        onCancel={cancelStockWarning} 
        onConfirmAnyway={confirmWithStockIssue} 
      />
    </div>
  );
}
