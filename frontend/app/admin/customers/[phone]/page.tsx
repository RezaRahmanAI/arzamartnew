"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  ShieldCheck,
  Inbox,
  Copy,
  ChevronDown,
  Check,
  Pencil,
  Globe,
  Share2,
  Layers,
  Truck,
} from "lucide-react";
import { useOrders } from "@/lib/orders";
import { formatBDT, Order, OrderStatus, statusStyles, inventory } from "@/lib/dashboard-data";
import { useCustomers } from "@/lib/customers-store";
import { customersService, type ApiCustomer } from "@/lib/api/services/customers.service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { getSavedNotesStore } from "@/components/admin/order-notes-modal";
import type { OutOfStockItem } from "@/components/admin/order-stock-warning-modal";
import { products, getSizeStock } from "@/lib/shop-data";

const OrderInvoiceModal = dynamic(
  () => import("@/components/admin/order-invoice-modal").then((m) => m.OrderInvoiceModal),
  { ssr: false }
);
const OrderNotesModal = dynamic(
  () => import("@/components/admin/order-notes-modal").then((m) => m.OrderNotesModal),
  { ssr: false }
);
const OrderTrackingModal = dynamic(
  () => import("@/components/admin/order-tracking-modal").then((m) => m.OrderTrackingModal),
  { ssr: false }
);
const OrderStockWarningModal = dynamic(
  () => import("@/components/admin/order-stock-warning-modal").then((m) => m.OrderStockWarningModal),
  { ssr: false }
);

interface CustomerHistoryProps {
  params: Promise<{ phone: string }>;
}

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

export default function CustomerHistoryPage({ params }: CustomerHistoryProps) {
  const router = useRouter();
  const { phone: encodedPhone } = use(params);
  const phone = decodeURIComponent(encodedPhone);
  
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [activeNotesOrder, setActiveNotesOrder] = useState<Order | null>(null);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<Order | null>(null);

  const [isStockChecking, setIsStockChecking] = useState(false);
  const [stockWarningItems, setStockWarningItems] = useState<OutOfStockItem[]>([]);
  const [pendingConfirmOrder, setPendingConfirmOrder] = useState<Order | null>(null);

  const { orders, updateStatus: contextUpdateStatus } = useOrders();
  const { findCustomerByPhone } = useCustomers();
  const [apiCustomers, setApiCustomers] = useState<ApiCustomer[]>([]);
  const [customerActivity, setCustomerActivity] = useState<{
    cart: Array<{ slug: string; name?: string; size: string; qty: number; price?: number }>;
    wishlist: string[];
  }>({ cart: [], wishlist: [] });

  useEffect(() => {
    customersService.getAll().then(setApiCustomers);

    import("@/actions/customers.actions").then(({ getCustomerActivityAction }) => {
      getCustomerActivityAction(phone).then((act) => {
        if (act && (act.cart?.length > 0 || act.wishlist?.length > 0)) {
          setCustomerActivity(act);
        } else {
          try {
            const localCart = window.localStorage.getItem(`customer_cart_${phone}`);
            const localWishlist = window.localStorage.getItem(`customer_wishlist_${phone}`);
            setCustomerActivity({
              cart: localCart ? JSON.parse(localCart) : [],
              wishlist: localWishlist ? JSON.parse(localWishlist) : [],
            });
          } catch {
            /* ignore */
          }
        }
      });
    });
  }, [phone]);

  const customerInfo = useMemo(() => {
    const fromApi = apiCustomers.find((c) => c.phone === phone);
    if (fromApi) {
      return { name: fromApi.fullName, email: fromApi.email, address: fromApi.defaultAddress || "", district: fromApi.district };
    }
    const local = findCustomerByPhone(phone);
    if (local) {
      return { name: local.fullName, email: local.email || "", address: local.address, district: local.district || local.area || "" };
    }
    return null;
  }, [apiCustomers, findCustomerByPhone, phone]);

  const customerOrders = useMemo(() => {
    return (orders as unknown as Order[])
      .filter((o) => o.phone === phone)
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [orders, phone]);
  
  const name = customerInfo?.name || (customerOrders.length > 0 ? customerOrders[0].customer : "Unknown Customer");

  const copyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`Copied Order #${id}`);
  };

  const copyPhone = (p: string) => {
    navigator.clipboard.writeText(p);
    toast.success(`Copied phone: ${p}`);
  };

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await contextUpdateStatus(orderId, newStatus as unknown as Parameters<typeof contextUpdateStatus>[1]);
      toast.success(`Order #${orderId} marked as ${newStatus}`);
    } catch {
      toast.error(`Failed to update order #${orderId}`);
    }
  };

  const checkStockBeforeConfirm = (order: Order) => {
    setIsStockChecking(true);
    setTimeout(() => {
      const outOfStock: OutOfStockItem[] = [];
      order.items.forEach((item) => {
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
        const prod = products.find((p) => p.slug === item.slug || p.name.toLowerCase() === rawName.toLowerCase());
        let availableStock = 15;
        if (prod) {
          availableStock = getSizeStock(prod, displaySize);
        } else {
          const invKey = `${rawName} - ${displaySize}`;
          const invMap = inventory as unknown as Record<string, number>;
          if (invMap[invKey] !== undefined) {
            availableStock = invMap[invKey];
          }
        }
        if (availableStock < item.qty) {
          outOfStock.push({
            name: rawName,
            size: displaySize,
            needed: item.qty,
            available: availableStock,
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

  const cancelStockWarning = () => {
    setStockWarningItems([]);
    setPendingConfirmOrder(null);
  };

  const confirmWithStockIssue = () => {
    if (pendingConfirmOrder) {
      updateStatus(pendingConfirmOrder.id, "confirmed");
      toast.warning("Order confirmed despite insufficient stock.");
    }
    cancelStockWarning();
  };

  const progressStatus = (order: Order) => {
    const nextStatus = nextStatusMap[order.status];
    if (nextStatus) {
      if (order.status === "pending" && nextStatus === "confirmed" && !order.isPreOrder) {
        checkStockBeforeConfirm(order);
      } else {
        updateStatus(order.id, nextStatus);
      }
    }
  };

  const handleManualStatusChange = (order: Order, newStatus: OrderStatus) => {
    if (order.status === "pending" && newStatus === "confirmed" && !order.isPreOrder) {
      checkStockBeforeConfirm(order);
    } else {
      updateStatus(order.id, newStatus);
    }
  };

  const getOrderSourceDetails = (o: Order) => {
    let socialMedia = o.socialMediaSourceName || "";
    let pageName = o.sourcePageName || "";
    if (!socialMedia || !pageName) {
      const fullText = `${o.note || ""} ${o.address || ""}`;
      const sourceMatch = fullText.match(/Source:\s*([^|\n,]+)/i);
      const socialMatch = fullText.match(/Social:\s*([^|\n,]+)/i);
      if (socialMatch && socialMatch[1]) socialMedia = socialMatch[1].trim();
      if (sourceMatch && sourceMatch[1]) pageName = sourceMatch[1].trim();
    }
    const isWebsite = (!socialMedia && !pageName) || socialMedia.toLowerCase() === "website" || pageName.toLowerCase() === "website";
    return {
      isWebsite,
      socialMedia: socialMedia || (isWebsite ? "Website" : "Social Media"),
      pageName: pageName || "-",
    };
  };

  const stats = useMemo(() => {
    let total = 0;
    let delivered = 0;
    let cancelled = 0;
    let totalAmount = 0;
    
    const summaryByStatus: Record<string, { count: number; amount: number; paid: number; due: number }> = {};
    
    customerOrders.forEach(order => {
      total++;
      totalAmount += order.total;
      
      if (order.status === "delivered") delivered++;
      if (order.status === "cancelled" || (order.status as string) === "return") cancelled++;
      
      if (!summaryByStatus[order.status]) {
        summaryByStatus[order.status] = { count: 0, amount: 0, paid: 0, due: 0 };
      }
      
      summaryByStatus[order.status].count++;
      summaryByStatus[order.status].amount += order.total;
      
      const paid = Number(order.paid) || 0;
      const due = Math.max(0, order.total - paid);
      summaryByStatus[order.status].paid += paid;
      summaryByStatus[order.status].due += due;
    });

    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    
    const summaryArray = Object.entries(summaryByStatus).map(([status, data]) => ({
      status,
      ...data
    }));

    return {
      total,
      delivered,
      cancelled,
      totalAmount,
      totalPaid: summaryArray.reduce((sum, item) => sum + item.paid, 0),
      totalDue: summaryArray.reduce((sum, item) => sum + item.due, 0),
      successRate,
      summaryArray
    };
  }, [customerOrders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/customers" className="p-2 -ml-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Customer Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="text-xl font-bold text-foreground mb-4">Customer Information</h3>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-base font-semibold mb-3 gap-2">
            <div>
              <span className="text-muted-foreground font-normal">Name:</span>
              <span className="ml-1.5 font-bold text-foreground">{name}</span>
            </div>
            <div
              className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors select-none group/phone"
              onClick={() => copyPhone(phone)}
              title="Click to copy phone number"
            >
              <span className="text-muted-foreground font-normal">Phone:</span>
              <span className="ml-1.5 font-bold text-foreground group-hover/phone:text-primary">{phone}</span>
              <Copy className="h-3.5 w-3.5 opacity-0 group-hover/phone:opacity-100 transition-opacity text-primary" />
            </div>
          </div>
          {customerInfo?.address ? (
            <div className="text-sm text-muted-foreground mb-1">
              <span className="font-medium">Address:</span> {customerInfo.address}
              {customerInfo.district ? `, ${customerInfo.district}` : ""}
            </div>
          ) : null}
          {customerInfo?.email ? (
            <div className="text-sm text-muted-foreground mb-1">
              <span className="font-medium">Email:</span> {customerInfo.email}
            </div>
          ) : null}
        </div>

        <div className="bg-card border border-border p-8 rounded-xl shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
            <h3 className="flex items-center gap-3 text-lg font-bold">
              <Activity className="size-5" />
              Fulfillment Performance
            </h3>
            <span className="text-muted-foreground text-sm font-medium">{phone}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="bg-muted/30 border border-border p-4 rounded-lg text-center">
              <p className="font-bold text-xl">{stats.total}</p>
              <p className="text-muted-foreground text-sm mt-1">Total Requests</p>
            </div>
            <div className="bg-muted/30 border border-border p-4 rounded-lg text-center">
              <p className="font-bold text-xl text-emerald-600">{stats.delivered}</p>
              <p className="text-muted-foreground text-sm mt-1">Delivered</p>
            </div>
            <div className="bg-muted/30 border border-border p-4 rounded-lg text-center">
              <p className="font-bold text-xl text-red-600">{stats.cancelled}</p>
              <p className="text-muted-foreground text-sm mt-1">Revoked</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span>Conversion Efficiency</span>
              <span className="text-primary font-bold">{stats.successRate}%</span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 rounded-full"
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pt-2">
              Metric reflects proportion of processed deliveries executed successfully without return or cancellation.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              🛒 Shopping Cart ({customerActivity.cart.reduce((acc, i) => acc + (i.qty || 1), 0)} items)
            </h3>
            <span className="text-xs text-muted-foreground">Incomplete / Active items</span>
          </div>

          {customerActivity.cart.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No active items in cart.</p>
          ) : (
            <div className="space-y-2">
              {customerActivity.cart.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-sm">
                  <div className="font-medium text-foreground">
                    <span>{item.name || item.slug}</span>
                    <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      Size: {item.size}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">Qty: {item.qty}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              ❤️ Saved Wishlist ({customerActivity.wishlist.length})
            </h3>
            <span className="text-xs text-muted-foreground">Interested / bookmarked items</span>
          </div>

          {customerActivity.wishlist.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Wishlist is currently empty.</p>
          ) : (
            <div className="space-y-2">
              {customerActivity.wishlist.map((slug, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-sm">
                  <span className="font-medium text-foreground capitalize">{slug.replace(/-/g, " ")}</span>
                  <span className="text-xs text-muted-foreground font-mono">slug: {slug}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h3 className="font-bold text-lg">Orders Ledger ({customerOrders.length})</h3>
          <span className="text-xs text-muted-foreground">All order operations available</span>
        </div>
        
        {customerOrders.length === 0 ? (
          <div className="py-24 text-center">
            <Inbox className="size-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-muted-foreground font-semibold">Zero Activity Records</h3>
            <p className="text-muted-foreground/60 text-sm mt-2">Historical ledger is currently devoid of transactional nodes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Order No.</TableHead>
                  <TableHead>Date</TableHead>
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
                {customerOrders.map(order => {
                  const sourceInfo = getOrderSourceDetails(order);
                  const totalAmount = Number(order.total) || 0;
                  const paidAmount = Number(order.paid) || 0;
                  const dueAmount = Math.max(0, totalAmount - paidAmount);
                  return (
                    <TableRow key={order.id} className="group">
                      <TableCell>
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => copyOrderId(order.id)}
                          title="Click to copy Order ID"
                        >
                          <span className={`font-mono text-xs ${order.isPreOrder ? "text-indigo-600 font-bold" : ""}`}>
                            #{order.id}
                          </span>
                          <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {order.date}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors select-none group/phone"
                          onClick={() => copyPhone(order.phone)}
                          title="Click to copy phone number"
                        >
                          <span className="text-xs text-muted-foreground group-hover/phone:text-primary font-medium">{order.phone}</span>
                          <Copy className="h-3 w-3 opacity-0 group-hover/phone:opacity-100 transition-opacity text-primary" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className={`flex items-center gap-2 rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize border transition-colors hover:opacity-80 ${statusStyles[order.status]}`}>
                              {order.status}
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-48">
                            {statusOptions.map(s => (
                              <DropdownMenuItem key={s} onClick={() => handleManualStatusChange(order, s)} className="capitalize flex justify-between">
                                {s}
                                {order.status === s && <Check className="h-3 w-3" />}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>
                        {order.courierName ? (
                          <div className="space-y-0.5 max-w-[140px]">
                            <div className="flex items-center gap-1">
                              <Link
                                href={order.shipmentBatchId ? `/admin/bulk-shipment/${order.shipmentBatchId}` : "/admin/bulk-shipment"}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 truncate"
                                title={`View Shipment Batch: ${order.courierName}`}
                              >
                                <Truck className="size-3 shrink-0 text-primary" />
                                <span className="truncate">{order.courierName}</span>
                              </Link>
                            </div>
                            {order.courierTrackingNumber ? (
                              <span
                                onClick={() => {
                                  navigator.clipboard.writeText(order.courierTrackingNumber!);
                                  toast.success(`Copied Tracking: ${order.courierTrackingNumber}`);
                                }}
                                className="font-mono text-[10px] text-muted-foreground hover:text-foreground cursor-pointer bg-muted/60 px-1.5 py-0.5 rounded inline-block"
                                title="Click to copy tracking number"
                              >
                                {order.courierTrackingNumber}
                              </span>
                            ) : order.shipmentStatus ? (
                              <span className="text-[10px] capitalize text-muted-foreground block">
                                ({order.shipmentStatus.replace(/_/g, " ")})
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs tracking-tight">{formatBDT(totalAmount)}</TableCell>
                      <TableCell className="text-right font-semibold text-xs text-emerald-600 dark:text-emerald-400">{formatBDT(paidAmount)}</TableCell>
                      <TableCell className={`text-right font-bold text-xs ${dueAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                        {formatBDT(dueAmount)}
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
                        <div className="flex flex-wrap justify-end gap-1.5 min-w-[200px]">
                          {order.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] px-2 bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-600 hover:text-white flex items-center gap-1 font-bold"
                              onClick={() => {
                                if (order.isPreOrder || order.status === "preorder") {
                                  router.push(`/admin/pre-order?edit=${order.id}`);
                                } else {
                                  router.push(`/admin/manual-order?edit=${order.id}`);
                                }
                              }}
                            >
                              <Pencil className="h-3 w-3" /> Edit
                            </Button>
                          )}

                          {nextStatusLabels[order.status] && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white" onClick={() => progressStatus(order)}>
                              {nextStatusLabels[order.status]}
                            </Button>
                          )}

                          {order.status === "pending" && (
                            <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white" onClick={() => setActiveNotesOrder(order)}>
                              Notes {(order.hasNotes || Boolean(order.note) || (getSavedNotesStore()[order.id]?.length ?? 0) > 0) && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-blue-600" />}
                            </Button>
                          )}

                          <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-600 hover:text-white" onClick={() => setActiveInvoiceOrder(order)}>
                            PDF
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-600 hover:text-white" onClick={() => setActiveTrackingOrder(order)}>
                            History
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 bg-green-50 text-green-600 border-green-200 hover:bg-green-600 hover:text-white" onClick={() => window.open(`https://wa.me/${order.phone.replace(/\D/g, "")}`, "_blank")}>
                            WA
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

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
