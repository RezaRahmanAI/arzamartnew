"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Trash2,
  Phone,
  Hash,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Copy,
  RotateCcw,
  X,
  PackageX,
  FileText,
} from "lucide-react";
import { useOrders } from "@/lib/orders";
import { formatBDT, Order, OrderStatus } from "@/lib/dashboard-data";
import { ordersService } from "@/lib/api/services/orders.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { getSavedNotesStore, getOrderNoteCount, NoteAttemptFilter } from "@/components/admin/order-notes-modal";

const DateRangePicker = dynamic(
  () => import("@/components/admin/date-range-picker").then((m) => m.DateRangePicker),
  { ssr: false }
);
const OrderInvoiceModal = dynamic(
  () => import("@/components/admin/order-invoice-modal").then((m) => m.OrderInvoiceModal),
  { ssr: false }
);
const OrderNotesModal = dynamic(
  () => import("@/components/admin/order-notes-modal").then((m) => m.OrderNotesModal),
  { ssr: false }
);

// Status options for incomplete orders:
// "pending", "1st-attempt", "2nd-attempt", "3rd-attempt", "cancelled", "call-later"
const incompleteStatusOptions = [
  { value: "pending", label: "Pending", style: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300" },
  { value: "1st-attempt", label: "1st Attempt", style: "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300" },
  { value: "2nd-attempt", label: "2nd Attempt", style: "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300" },
  { value: "3rd-attempt", label: "3rd Attempt", style: "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300" },
  { value: "call-later", label: "Call Later", style: "bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300" },
  { value: "cancelled", label: "Cancel", style: "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300" },
];

export default function AdminIncomplete() {
  const { incomplete: contextIncomplete, promoteIncomplete, removeIncomplete, updateOrder } = useOrders();

  const [orderIdQuery, setOrderIdQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [noteFilter, setNoteFilter] = useState<NoteAttemptFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [activeNotesOrder, setActiveNotesOrder] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<{ id: string; targetStatus: string } | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  const [data, setData] = useState<Order[]>(contextIncomplete);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    if (contextIncomplete) {
      setData(contextIncomplete);
    }
  }, [contextIncomplete]);

  const fetchIncomplete = async () => {
    try {
      const res = await ordersService.getAll();
      if (res && Array.isArray(res.incomplete)) {
        setData(res.incomplete);
      }
    } catch {
      /* fallback */
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchIncomplete();
    setIsRefreshing(false);
    toast.success("Incomplete orders refreshed");
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (newStatus === "cancelled") {
      setOrderToCancel({ id: orderId, targetStatus: newStatus });
      return;
    }
    await executeStatusChange(orderId, newStatus);
  };

  const executeStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setData((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as OrderStatus } : o))
      );
      await updateOrder(orderId, { status: newStatus as OrderStatus });
      toast.success(`Incomplete order status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const confirmCancelIncomplete = async () => {
    if (orderToCancel) {
      await executeStatusChange(orderToCancel.id, orderToCancel.targetStatus);
      setOrderToCancel(null);
    }
  };

  const confirmDeleteIncomplete = () => {
    if (orderToDelete) {
      removeIncomplete(orderToDelete.id);
      toast.info(`Deleted incomplete order #${orderToDelete.id.replace(/^INC-|^ORD-/, "")}`);
      setOrderToDelete(null);
    }
  };

  const filteredIncomplete = useMemo(() => {
    let filtered = data;

    if (orderIdQuery.trim()) {
      filtered = filtered.filter((o) =>
        o.id.toLowerCase().includes(orderIdQuery.trim().toLowerCase())
      );
    }
    if (phoneQuery.trim()) {
      filtered = filtered.filter((o) => o.phone.includes(phoneQuery.trim()));
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }
    if (dateRange?.from) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
      to.setHours(23, 59, 59, 999);

      filtered = filtered.filter((o) => {
        if (!o.date) return false;
        const orderDate = new Date(o.date);
        if (isNaN(orderDate.getTime())) return true;
        return orderDate >= from && orderDate <= to;
      });
    }

    if (noteFilter !== "all") {
      filtered = filtered.filter((o) => {
        const count = getOrderNoteCount(o);
        if (noteFilter === "touched") return count > 0;
        if (noteFilter === "untouched") return count === 0;
        if (noteFilter === "1st-attempt") return count === 1;
        if (noteFilter === "2nd-attempt") return count === 2;
        if (noteFilter === "3rd-attempt") return count === 3;
        if (noteFilter === "4th-or-more") return count >= 4;
        return true;
      });
    }

    return filtered;
  }, [data, orderIdQuery, phoneQuery, statusFilter, noteFilter, dateRange]);

  const totalPages = Math.ceil(filteredIncomplete.length / pageSize) || 1;
  const paginatedOrders = filteredIncomplete.slice((page - 1) * pageSize, page * pageSize);

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) +
    (noteFilter !== "all" ? 1 : 0) +
    (dateRange?.from ? 1 : 0) +
    (orderIdQuery.trim() ? 1 : 0) +
    (phoneQuery.trim() ? 1 : 0);

  const clearAllFilters = () => {
    setOrderIdQuery("");
    setPhoneQuery("");
    setStatusFilter("all");
    setNoteFilter("all");
    setDateRange(undefined);
    setPage(1);
    toast.info("All filters cleared");
  };

  const copyCustomerPhone = (phoneNumber: string) => {
    navigator.clipboard.writeText(phoneNumber);
    toast.success(`Copied phone: ${phoneNumber}`);
  };

  const copyOrderId = (id: string) => {
    const clean = id.replace(/^INC-|^ORD-/, "");
    navigator.clipboard.writeText(clean);
    toast.success(`Copied Order #${clean}`);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
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
                variant={statusFilter !== "all" || noteFilter !== "all" ? "default" : "outline"}
                size="sm"
                className={`gap-2 text-xs h-9 font-medium transition-colors ${
                  statusFilter !== "all" || noteFilter !== "all"
                    ? "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20 hover:text-primary"
                    : ""
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="truncate">
                  {statusFilter !== "all"
                    ? `Status: ${statusFilter}`
                    : noteFilter !== "all"
                    ? `Note: ${noteFilter}`
                    : "Filter Orders"}
                </span>
                {(statusFilter !== "all" ? 1 : 0) + (noteFilter !== "all" ? 1 : 0) > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                    {(statusFilter !== "all" ? 1 : 0) + (noteFilter !== "all" ? 1 : 0)}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4 shadow-lg" align="start">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Filter Orders</h4>
                {(statusFilter !== "all" || noteFilter !== "all") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStatusFilter("all");
                      setNoteFilter("all");
                    }}
                    className="h-6 text-xs px-2 text-destructive hover:bg-destructive/10 font-semibold"
                  >
                    <RotateCcw className="size-3 mr-1" /> Reset
                  </Button>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Status</span>
                  <span className="text-[11px] font-semibold text-primary capitalize">{statusFilter}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant={statusFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                    className="h-7 text-xs"
                  >
                    All Status
                  </Button>
                  {incompleteStatusOptions.map((s) => (
                    <Button
                      key={s.value}
                      variant={statusFilter === s.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(s.value)}
                      className="h-7 text-xs truncate"
                    >
                      {s.label}
                    </Button>
                  ))}
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
            </PopoverContent>
          </Popover>

          <div className="w-full sm:w-auto">
            <DateRangePicker value={dateRange} onUpdate={setDateRange} />
          </div>

          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="gap-1.5 text-xs h-9 text-destructive border-destructive/30 hover:bg-destructive/10 font-medium"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear Filters ({activeFiltersCount})
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh incomplete orders"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Incomplete Orders Table */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm min-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.map((o) => {
              const cleanId = o.id.replace(/^INC-|^ORD-/, "");
              const currentStatusObj =
                incompleteStatusOptions.find((s) => s.value === o.status) || incompleteStatusOptions[0];

              // Time formatting
              let timeDisplay = "";
              if (o.createdAt) {
                try {
                  const d = new Date(o.createdAt);
                  if (!isNaN(d.getTime())) {
                    timeDisplay = d.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });
                  }
                } catch {
                  /* ignore */
                }
              }

              return (
                <TableRow key={o.id} className="group">
                  <TableCell>
                    <div
                      className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors select-none group/id"
                      onClick={() => copyOrderId(o.id)}
                      title={`Click to copy Order ID: ${cleanId}`}
                    >
                      <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
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
                    {(() => {
                      const noteCount = getOrderNoteCount(o);
                      const isPending = o.status === "pending" || !o.status;
                      const showPendingNoteIcon = isPending && noteCount > 0;

                      return (
                        <div>
                          <div className="flex items-center gap-1.5 max-w-[160px]">
                            <Link
                              href={`/admin/customers/${encodeURIComponent(o.phone || "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium hover:underline hover:text-primary transition-colors truncate group-hover:flex group-hover:items-center group-hover:gap-1"
                              title={`Open ${o.customer}'s profile & all orders in new tab`}
                            >
                              <span className="truncate">{o.customer}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 shrink-0" />
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
                          {o.address && (
                            <span className="block text-[11px] text-muted-foreground truncate max-w-[180px]">
                              {o.address}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {o.phone ? (
                      <div
                        className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors select-none group/phone"
                        onClick={() => copyCustomerPhone(o.phone)}
                        title="Click to copy phone number"
                      >
                        <span className="text-xs text-muted-foreground group-hover/phone:text-primary font-medium">
                          {o.phone}
                        </span>
                        <Copy className="h-3 w-3 opacity-0 group-hover/phone:opacity-100 transition-opacity text-primary" />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize border transition-colors hover:opacity-80 cursor-pointer ${currentStatusObj.style}`}
                        >
                          <span>{currentStatusObj.label}</span>
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-40">
                        {incompleteStatusOptions.map((s) => (
                          <DropdownMenuItem
                            key={s.value}
                            onClick={() => handleStatusChange(o.id, s.value)}
                            className="capitalize flex justify-between text-xs"
                          >
                            <span>{s.label}</span>
                            {o.status === s.value && <Check className="h-3 w-3 text-primary" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="max-w-56 truncate text-xs text-muted-foreground">
                    {o.items && o.items.length > 0 ? (
                      o.items.map((it) => `${it.name} (${it.size}) ×${it.qty}`).join(", ")
                    ) : (
                      <span className="text-muted-foreground italic">No items</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold text-xs tracking-tight">
                    {formatBDT(Number(o.total) || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1.5 min-w-[200px]">
                      {/* Move to Orders / Convert */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          promoteIncomplete(o.id);
                          toast.success(`Order #${cleanId} converted to main orders!`);
                        }}
                        className="h-7 text-[10px] px-2 bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-600 hover:text-white flex items-center gap-1 font-bold"
                        title="Move to main orders"
                      >
                        <Check className="h-3 w-3" /> Move to Orders
                      </Button>

                      {/* Notes Modal */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveNotesOrder(o)}
                        className="h-7 text-[10px] px-2 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white"
                      >
                        Notes
                        {getOrderNoteCount(o) > 0 && (
                          <span className="ml-1 px-1 py-0.2 rounded-full bg-blue-600 text-[9px] font-bold text-white leading-none">
                            {getOrderNoteCount(o)}
                          </span>
                        )}
                      </Button>

                      {/* Invoice PDF */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveInvoiceOrder(o)}
                        className="h-7 text-[10px] px-2 bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-600 hover:text-white"
                      >
                        PDF
                      </Button>

                      {/* Delete with Confirmation */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOrderToDelete(o)}
                        className="h-7 text-[10px] px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                        title="Delete incomplete order"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}

            {paginatedOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground opacity-60">
                      <PackageX className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">No incomplete orders found</h3>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {dateRange?.from
                          ? "No incomplete orders found for the selected filter criteria."
                          : "Incomplete checkout orders will automatically show up here."}
                      </p>
                    </div>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                        className="gap-1.5 text-xs mt-1"
                      >
                        <RotateCcw className="size-3.5" /> Clear Filters
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
      {paginatedOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border p-4 rounded-lg">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span> —{" "}
            <span className="font-medium text-foreground">
              {Math.min(page * pageSize, filteredIncomplete.length)}
            </span>{" "}
            of {filteredIncomplete.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <div className="px-4 py-1.5 border rounded-md text-sm">
              Page {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Incomplete Order Confirmation Modal */}
      <AlertDialog open={!!orderToCancel} onOpenChange={(open) => !open && setOrderToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <Trash2 className="size-5" />
              <AlertDialogTitle>Cancel Incomplete Order #{orderToCancel?.id?.replace(/^INC-|^ORD-/, "")}?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to mark this incomplete order as <strong>CANCELLED</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 text-xs">Keep Incomplete</AlertDialogCancel>
            <AlertDialogAction
              className="h-9 text-xs bg-rose-600 text-white hover:bg-rose-700 font-bold"
              onClick={confirmCancelIncomplete}
            >
              Yes, Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Incomplete Order Confirmation Modal */}
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <Trash2 className="size-5" />
              <AlertDialogTitle>Delete Incomplete Order #{orderToDelete?.id?.replace(/^INC-|^ORD-/, "")}?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete this incomplete draft order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-9 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
              onClick={confirmDeleteIncomplete}
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modals */}
      <OrderInvoiceModal
        isOpen={!!activeInvoiceOrder}
        order={activeInvoiceOrder}
        onClose={() => setActiveInvoiceOrder(null)}
      />
      <OrderNotesModal
        isOpen={!!activeNotesOrder}
        order={activeNotesOrder}
        onClose={() => setActiveNotesOrder(null)}
      />
    </div>
  );
}

