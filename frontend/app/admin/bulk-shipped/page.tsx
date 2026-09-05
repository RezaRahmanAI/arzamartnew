"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Truck,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Barcode,
  Minus,
  Trash2,
  Package,
  Layers,
  Search,
  ArrowRight,
  ChevronRight,
  Info,
  Loader2,
  Volume2,
} from "lucide-react";
import { formatBDT } from "@/lib/shop-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  scanOrderForShipmentAction,
  submitBulkShippedBatchAction,
  type ScanOrderResult,
} from "@/actions/shipments.actions";
import { getActiveCouriersAction } from "@/actions/couriers.actions";
import { scannerAudio } from "@/lib/scanner-audio";
import { useAuth } from "@/context/auth-context";

interface QueuedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  district: string;
  totalAmount: number;
  dueAmount: number;
  paidAmount: number;
  orderStatus: number;
  orderStatusLabel: string;
  latestNote: string;
  scannedAt: string;
}

interface SkippedRecord {
  code: string;
  reason: string;
  isDuplicate: boolean;
  timestamp: string;
}

export default function BulkShippedPage() {
  const { user } = useAuth();

  // Courier & Batch Form Fields
  const [couriers, setCouriers] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>("");
  const [invoiceId, setInvoiceId] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [packagingNote, setPackagingNote] = useState("");

  // Live Queues & Counters
  const [queue, setQueue] = useState<QueuedOrder[]>([]);
  const [failedCodes, setFailedCodes] = useState<string[]>([]);
  const [skippedRecords, setSkippedRecords] = useState<SkippedRecord[]>([]);

  // Scanning State
  const [scanInput, setScanInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Dialog States
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState<number>(0);

  // Load Active Couriers on Mount
  useEffect(() => {
    getActiveCouriersAction().then((data) => {
      setCouriers(data);
      if (data.length > 0 && !selectedCourierId) {
        setSelectedCourierId(data[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Always keep scanner input focused for fast warehouse scanning
  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  // Derived Metrics
  const foundCount = queue.length;
  const notFoundCount = failedCodes.length;
  const skippedCount = skippedRecords.length;

  const duplicateCount = useMemo(
    () => skippedRecords.filter((s) => s.isDuplicate).length,
    [skippedRecords]
  );

  const totalDueAmount = useMemo(
    () => queue.reduce((sum, item) => sum + (item.dueAmount || 0), 0),
    [queue]
  );

  const verifiedCustomers = useMemo(
    () => queue.map((item) => item.customerName),
    [queue]
  );

  // Handle Single Scan
  const handleProcessScan = async (codeToScan?: string) => {
    const raw = (codeToScan !== undefined ? codeToScan : scanInput).trim();
    if (!raw || isScanning) return;

    setIsScanning(true);
    setScanInput("");

    try {
      const existingQueuedIds = queue.map((q) => q.id);
      const res = await scanOrderForShipmentAction(raw, existingQueuedIds);

      if (res.status === "found" && res.order) {
        scannerAudio.playFound();
        const newOrder: QueuedOrder = {
          ...res.order,
          scannedAt: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        };
        // Prepend to top of queue
        setQueue((prev) => [newOrder, ...prev]);
        toast.success(`Verified #${res.order.orderNumber} (${res.order.customerName})`, {
          description: `COD Due: ${formatBDT(res.order.dueAmount)}`,
        });
      } else if (res.status === "skipped") {
        scannerAudio.playSkipped();
        const reason = res.reason || "Order rejected from queue";
        setSkippedRecords((prev) => [
          {
            code: raw,
            reason,
            isDuplicate: !!res.isDuplicate,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
        toast.warning(`Skipped: ${raw}`, { description: reason });
      } else {
        // Not Found
        scannerAudio.playNotFound();
        setFailedCodes((prev) => (prev.includes(raw) ? prev : [raw, ...prev]));
        toast.error(`Not Found: ${raw}`, {
          description: "No matching order in database",
        });
      }
    } catch {
      scannerAudio.playNotFound();
      toast.error(`Error scanning ${raw}`);
    } finally {
      setIsScanning(false);
      // Auto-clear and refocus input immediately
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 50);
    }
  };

  // Remove Single Order from LOCAL Queue
  const handleRemoveFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((o) => o.id !== id));
    toast.info("Removed from current queue (No DB changes made)");
    scanInputRef.current?.focus();
  };

  // Clear Entire Queue
  const handleClearQueue = () => {
    setQueue([]);
    setFailedCodes([]);
    setSkippedRecords([]);
    setShowClearConfirm(false);
    toast.info("Queue and counters cleared");
    scanInputRef.current?.focus();
  };

  // Submit Batch Transaction
  const handleSubmitBatch = async () => {
    if (queue.length === 0) {
      toast.error("Queue is empty. Scan orders before creating a shipment batch.");
      return;
    }
    if (!selectedCourierId) {
      toast.error("Please select a Delivery Company (Courier).");
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(20);

    const timer = setInterval(() => {
      setSubmitProgress((p) => (p < 85 ? p + 15 : p));
    }, 150);

    try {
      const payload = {
        orderIds: queue.map((o) => o.id),
        courierId: selectedCourierId,
        invoiceId: invoiceId.trim() || undefined,
        customerNote: customerNote.trim() || undefined,
        packagingNote: packagingNote.trim() || undefined,
        actorName: user?.name || "Warehouse Staff",
      };

      const res = await submitBulkShippedBatchAction(payload);
      clearInterval(timer);
      setSubmitProgress(100);

      if (res.success) {
        toast.success(`Batch ${res.batchNumber} created successfully!`, {
          description: `All ${res.processedCount} orders have been marked as Shipped.`,
        });

        // Clear entire page for next shipment run
        setQueue([]);
        setFailedCodes([]);
        setSkippedRecords([]);
        setInvoiceId("");
        setCustomerNote("");
        setPackagingNote("");
      } else {
        // Full rollback on failure, keep queue intact
        toast.error("Batch Submission Failed", {
          description: res.error || "Transaction rolled back. No orders were modified.",
        });
      }
    } catch (err) {
      clearInterval(timer);
      toast.error("An unexpected error occurred during batch submission");
    } finally {
      setIsSubmitting(false);
      setSubmitProgress(0);
      scanInputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-5 p-1 sm:p-2">
      {/* Title Bar & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/admin/orders" className="hover:underline">Orders</Link>
            <ChevronRight className="size-3" />
            <Link href="/admin/bulk-shipment" className="hover:underline">Bulk Shipment</Link>
            <ChevronRight className="size-3" />
            <span className="font-semibold text-foreground">Bulk Shipped</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Truck className="size-7 text-primary" /> Bulk Shipped
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Rapid barcode & QR code warehouse dispatch scanner with instant status reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link href="/admin/bulk-shipment">
              <Layers className="size-3.5 text-primary" /> Shipment Batches
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link href="/admin/couriers">
              <Truck className="size-3.5 text-primary" /> Manage Couriers
            </Link>
          </Button>
        </div>
      </div>

      {/* TOP FORM ROW */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/70 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Info className="size-3.5 text-primary" /> Batch Dispatch Parameters
          </span>
          <span className="text-[11px] text-muted-foreground">
            Applies to all verified orders upon batch submission
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Delivery Company */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Delivery Company <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
              <SelectTrigger className="h-10 text-xs font-semibold bg-background">
                <SelectValue placeholder="Select Courier Partner" />
              </SelectTrigger>
              <SelectContent>
                {couriers.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                    🚚 {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Inv-ID */}
          <div className="space-y-1.5">
            <Label htmlFor="invId" className="text-xs font-bold text-foreground">
              Inv-ID / Courier Consignment ID
            </Label>
            <Input
              id="invId"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="example-inv-id"
              className="h-10 text-xs bg-background font-mono"
            />
          </div>

          {/* 3. Customer Note (type=2) */}
          <div className="space-y-1.5">
            <Label htmlFor="customerNote" className="text-xs font-bold text-foreground">
              Customer Note (type=2)
            </Label>
            <Input
              id="customerNote"
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Log customer-facing note..."
              className="h-10 text-xs bg-background"
            />
          </div>

          {/* 4. Packaging Note (type=10) */}
          <div className="space-y-1.5">
            <Label htmlFor="packagingNote" className="text-xs font-bold text-foreground">
              Packaging Note (type=10)
            </Label>
            <Input
              id="packagingNote"
              value={packagingNote}
              onChange={(e) => setPackagingNote(e.target.value)}
              placeholder="Internal packaging team note..."
              className="h-10 text-xs bg-background"
            />
          </div>
        </div>
      </div>

      {/* THREE LIVE COUNTER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: FOUND (Green) */}
        <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
              <span className="text-xs font-black uppercase tracking-wider">FOUND</span>
            </div>
            <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
              Batch Size: {foundCount}
            </span>
          </div>

          <div className="mt-3">
            <div className="text-4xl font-black text-emerald-700 dark:text-emerald-400">
              {foundCount}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-emerald-500/20 space-y-1 text-xs text-emerald-900/80 dark:text-emerald-200/90">
            <div className="flex items-center justify-between">
              <span className="font-semibold">COD to Collect:</span>
              <span className="font-black text-sm text-emerald-800 dark:text-emerald-300">
                {formatBDT(totalDueAmount)}
              </span>
            </div>
            <div className="text-[11px] truncate pt-0.5">
              <span className="font-semibold">Orders Verified: </span>
              {foundCount === 0 ? (
                <span className="text-muted-foreground italic">None yet</span>
              ) : (
                <span>
                  {verifiedCustomers.slice(0, 3).join(", ")}
                  {verifiedCustomers.length > 3 && ` +${verifiedCustomers.length - 3} more`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CARD 2: NOT FOUND (Red) */}
        <div className="rounded-xl border-2 border-rose-500/40 bg-rose-50/50 dark:bg-rose-950/20 p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <XCircle className="size-5" />
              <span className="text-xs font-black uppercase tracking-wider">NOT FOUND</span>
            </div>
            {notFoundCount > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowFailedModal(true)}
                className="h-6 text-[11px] font-bold px-2 border-rose-300 bg-background text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 cursor-pointer"
              >
                Review IDs ({notFoundCount})
              </Button>
            )}
          </div>

          <div className="mt-3">
            <div className="text-4xl font-black text-rose-700 dark:text-rose-400">
              {notFoundCount}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-rose-500/20 space-y-1 text-xs text-rose-900/80 dark:text-rose-200/90">
            <span className="font-semibold block">Failed IDs Preview:</span>
            {failedCodes.length === 0 ? (
              <span className="text-muted-foreground italic text-[11px]">No failed scans</span>
            ) : (
              <div className="font-mono text-[11px] truncate text-rose-700 dark:text-rose-300">
                {failedCodes.slice(0, 4).join(", ")}
                {failedCodes.length > 4 && ` +${failedCodes.length - 4} more`}
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: SKIPPED (Amber) */}
        <div className="rounded-xl border-2 border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-5" />
              <span className="text-xs font-black uppercase tracking-wider">SKIPPED</span>
            </div>
            <span className="text-[11px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
              Duplicates: {duplicateCount}
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-3">
            <div className="text-4xl font-black text-amber-700 dark:text-amber-400">
              {skippedCount}
            </div>
            <span className="text-xs text-amber-800/80 dark:text-amber-300 font-semibold">
              ({duplicateCount} duplicate, {skippedCount - duplicateCount} wrong-status)
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-1 text-xs text-amber-900/80 dark:text-amber-200/90">
            <span className="font-semibold block">Recent Skip Reasons:</span>
            {skippedRecords.length === 0 ? (
              <span className="text-muted-foreground italic text-[11px]">No skipped orders</span>
            ) : (
              <div className="text-[11px] space-y-0.5 max-h-12 overflow-hidden text-amber-800 dark:text-amber-300">
                {skippedRecords.slice(0, 2).map((s, idx) => (
                  <div key={idx} className="truncate">
                    • <span className="font-mono font-bold">{s.code}</span>: {s.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SCAN INPUT ROW */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProcessScan();
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <div className="relative flex-1">
            <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input
              ref={scanInputRef}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              disabled={isScanning}
              placeholder="Type order code and press Enter (or scan barcode / QR)..."
              className="h-11 pl-11 pr-4 text-sm font-semibold bg-background"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="submit"
              disabled={isScanning || !scanInput.trim()}
              className="h-11 px-6 font-bold text-xs gap-2 cursor-pointer"
            >
              {isScanning ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Barcode className="size-4" /> Process Order
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClearConfirm(true)}
              disabled={queue.length === 0 && failedCodes.length === 0 && skippedRecords.length === 0}
              className="h-11 px-4 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:border-destructive cursor-pointer gap-1.5"
            >
              <Trash2 className="size-4" /> Clear Queue
            </Button>
          </div>
        </form>
      </div>

      {/* BATCH SUBMISSION ROW & PROGRESS BAR */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Ready to Dispatch ({foundCount} Orders Queued)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Re-validates packaging status, updates orders to Shipped, and records courier notes atomically.
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={handleSubmitBatch}
            disabled={isSubmitting || foundCount === 0}
            className="h-11 px-8 text-sm font-black bg-primary hover:bg-primary/90 text-primary-foreground gap-2 cursor-pointer shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Creating Batch...
              </>
            ) : (
              <>
                <Package className="size-4" /> Create Batch ({foundCount})
              </>
            )}
          </Button>
        </div>

        {/* Real Dynamic Submission Progress Bar */}
        {isSubmitting && (
          <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
            <div className="flex justify-between text-xs text-muted-foreground font-semibold">
              <span>Executing atomic database transaction...</span>
              <span>{submitProgress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 transition-all duration-300 rounded-full"
                style={{ width: `${submitProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* QUEUE TABLE */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs min-h-[350px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[60px] text-center font-bold">ACTION</TableHead>
              <TableHead className="font-bold">ORDER CODE</TableHead>
              <TableHead className="font-bold">CUSTOMER</TableHead>
              <TableHead className="font-bold">PHONE</TableHead>
              <TableHead className="font-bold">ADDRESS</TableHead>
              <TableHead className="text-right font-bold">DUE (COD)</TableHead>
              <TableHead className="font-bold">LATEST NOTE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.map((order) => (
              <TableRow key={order.id} className="hover:bg-muted/40 transition-colors">
                {/* ACTION (Red minus button: removes from local queue only) */}
                <TableCell className="text-center py-2.5">
                  <button
                    type="button"
                    onClick={() => handleRemoveFromQueue(order.id)}
                    className="size-7 inline-flex items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer border border-rose-500/20"
                    title="Remove from current queue (No DB change)"
                  >
                    <Minus className="size-4 stroke-[3]" />
                  </button>
                </TableCell>

                <TableCell className="font-mono font-bold text-xs text-foreground">
                  {order.orderNumber}
                </TableCell>

                <TableCell className="text-xs font-semibold text-foreground">
                  {order.customerName}
                </TableCell>

                <TableCell className="text-xs font-mono text-muted-foreground">
                  {order.phone}
                </TableCell>

                <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate" title={order.address}>
                  {order.address}
                </TableCell>

                <TableCell className="text-right font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  {formatBDT(order.dueAmount)}
                </TableCell>

                <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate" title={order.latestNote}>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-secondary text-secondary-foreground">
                    {order.latestNote || "COD"}
                  </span>
                </TableCell>
              </TableRow>
            ))}

            {queue.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Barcode className="size-10 stroke-1 opacity-50 mb-1" />
                    <p className="text-sm font-semibold">Queue is empty</p>
                    <p className="text-xs max-w-sm">
                      Scan barcodes or enter order numbers above to populate the dispatch queue. Only orders in "Packaging" status are accepted.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL: Review Failed IDs */}
      <Dialog open={showFailedModal} onOpenChange={setShowFailedModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <XCircle className="size-5" /> Review Failed Scan IDs
            </DialogTitle>
            <DialogDescription className="text-xs">
              The following order codes were scanned but matched no order in the database. Double check for typos or incorrect barcodes.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-64 overflow-y-auto space-y-1.5 p-2 bg-muted/30 rounded-lg border border-border">
            {failedCodes.map((code, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded bg-card border border-border/60 text-xs font-mono"
              >
                <span className="font-bold text-foreground">{code}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowFailedModal(false);
                    handleProcessScan(code);
                  }}
                  className="h-6 text-[10px] px-2 text-primary hover:bg-primary/10 cursor-pointer"
                >
                  Retry
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFailedCodes([])}
              className="text-xs text-destructive hover:bg-destructive/10"
            >
              Clear Failed List
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowFailedModal(false)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Confirm Clear Queue */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" /> Discard Current Queue?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to clear the current queue ({foundCount} verified orders)? All unsaved scan progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleClearQueue}
            >
              Confirm Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
