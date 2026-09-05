"use client";

import { use, useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  Ban,
  Package,
  AlertTriangle,
  History,
  Copy,
  Pencil,
  Printer,
  ChevronDown,
  Check,
} from "lucide-react";
import { formatBDT } from "@/lib/shop-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  getShipmentBatchDetailsAction,
  updateShipmentStatusAction,
  updateTrackingNumberAction,
  type ShipmentBatchDto,
  type ShipmentDetailDto,
} from "@/actions/shipments.actions";

interface BatchPageProps {
  params: Promise<{ batchId: string }>;
}

const SHIPMENT_STATUS_OPTIONS = [
  { value: "assigned", label: "Assigned" },
  { value: "ready_to_ship", label: "Ready to Ship" },
  { value: "shipped", label: "Shipped" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Returned" },
  { value: "failed_delivery", label: "Failed Delivery" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE_STYLES: Record<string, string> = {
  assigned: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
  ready_to_ship: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  shipped: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300",
  in_transit: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  returned: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  failed_delivery: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
  cancelled: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
};

export default function BatchDetailsPage({ params }: BatchPageProps) {
  const { batchId: rawBatchId } = use(params);
  const batchId = decodeURIComponent(rawBatchId);

  const [batch, setBatch] = useState<ShipmentBatchDto | null>(null);
  const [shipments, setShipments] = useState<ShipmentDetailDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Status History Modal
  const [activeHistoryShipment, setActiveHistoryShipment] = useState<ShipmentDetailDto | null>(null);

  // Tracking Number Edit Modal
  const [editingTrackingShipment, setEditingTrackingShipment] = useState<ShipmentDetailDto | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);

  // Status Change Dialog (with reason for cancel/return)
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    shipment: ShipmentDetailDto;
    newStatus: string;
  } | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const loadBatchDetails = useCallback(async () => {
    setIsLoading(true);
    const data = await getShipmentBatchDetailsAction(batchId);
    setBatch(data.batch);
    setShipments(data.shipments);
    setIsLoading(false);
  }, [batchId]);

  useEffect(() => {
    loadBatchDetails();
  }, [batchId, loadBatchDetails]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  };

  const handleStatusChangeRequest = (shipment: ShipmentDetailDto, newStatus: string) => {
    if (newStatus === "cancelled" || newStatus === "returned" || newStatus === "failed_delivery") {
      setStatusChangeTarget({ shipment, newStatus });
      setStatusReason("");
    } else {
      executeStatusUpdate(shipment.id, newStatus, `Updated to ${newStatus}`);
    }
  };

  const executeStatusUpdate = async (shipmentId: string, newStatus: string, note?: string) => {
    setIsSubmittingStatus(true);
    try {
      const res = await updateShipmentStatusAction({
        shipmentId,
        newStatus,
        note,
        returnReason: newStatus === "returned" ? note : undefined,
        cancelReason: newStatus === "cancelled" ? note : undefined,
      });

      if (res.success) {
        toast.success(`Shipment status updated to ${newStatus}`);
        setStatusChangeTarget(null);
        await loadBatchDetails();
      } else {
        toast.error(res.error || "Failed to update status");
      }
    } catch {
      toast.error("An error occurred while updating status");
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleSaveTrackingNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrackingShipment) return;

    setIsUpdatingTracking(true);
    try {
      const res = await updateTrackingNumberAction(editingTrackingShipment.id, trackingInput);
      if (res.success) {
        toast.success("Tracking number updated successfully");
        setEditingTrackingShipment(null);
        await loadBatchDetails();
      } else {
        toast.error(res.error || "Failed to update tracking number");
      }
    } catch {
      toast.error("Error updating tracking number");
    } finally {
      setIsUpdatingTracking(false);
    }
  };

  // Quick Batch Actions (e.g. Mark all assigned as Shipped)
  const handleBulkProgressBatch = async (targetStatus: string) => {
    const eligible = shipments.filter(
      (s) => s.status !== "delivered" && s.status !== "cancelled" && s.status !== "returned"
    );
    if (eligible.length === 0) {
      toast.info("No eligible shipments to progress in this batch");
      return;
    }

    if (!confirm(`Are you sure you want to update ${eligible.length} shipments to "${targetStatus}"?`)) {
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    for (const s of eligible) {
      const res = await updateShipmentStatusAction({
        shipmentId: s.id,
        newStatus: targetStatus,
        note: `Bulk batch progress to ${targetStatus}`,
      });
      if (res.success) successCount++;
    }
    toast.success(`Successfully updated ${successCount} shipments to ${targetStatus}`);
    await loadBatchDetails();
  };

  if (isLoading && !batch) {
    return (
      <div className="py-24 text-center space-y-3">
        <RotateCcw className="size-8 text-primary animate-spin mx-auto opacity-70" />
        <p className="text-sm font-semibold text-muted-foreground">Loading shipment batch details...</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="py-20 text-center space-y-4">
        <AlertTriangle className="size-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold">Shipment Batch Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested shipment batch could not be located.</p>
        <Button asChild size="sm">
          <Link href="/admin/bulk-shipment">
            <ArrowLeft className="size-4 mr-1.5" /> Back to Bulk Shipment
          </Link>
        </Button>
      </div>
    );
  }

  const deliveryRate = batch.totalOrders > 0 ? Math.round((batch.deliveredCount / batch.totalOrders) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/bulk-shipment"
            className="p-2 -ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight font-mono">
                {batch.batchNumber}
              </h1>
              <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                🚚 {batch.courierName}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created on {new Date(batch.createdAt).toLocaleString()} by {batch.createdBy}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
            <Printer className="size-3.5" /> Print Manifest
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkProgressBatch("shipped")}
            className="gap-1.5 text-xs bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200"
          >
            Mark All Shipped
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkProgressBatch("delivered")}
            className="gap-1.5 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 font-bold"
          >
            Mark All Delivered
          </Button>

          <Button variant="outline" size="sm" onClick={loadBatchDetails} className="gap-1.5 text-xs">
            <RotateCcw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold text-muted-foreground uppercase">Total Orders</span>
          <div className="text-2xl font-black text-foreground mt-1">{batch.totalOrders}</div>
          <span className="text-xs font-bold text-muted-foreground">{formatBDT(batch.totalShipmentValue)}</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold text-emerald-600 uppercase">Delivered</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{batch.deliveredCount}</div>
          <span className="text-xs font-bold text-muted-foreground">Success rate: {deliveryRate}%</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold text-blue-600 uppercase">In Transit / Shipped</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{batch.inTransitCount}</div>
          <span className="text-xs text-muted-foreground">On the road</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold text-amber-600 uppercase">Returned / Failed</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{batch.returnedCount}</div>
          <span className="text-xs text-muted-foreground">Reverse logistics</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase">Cancelled</span>
          <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{batch.cancelledCount}</div>
          <span className="text-xs text-muted-foreground">Revoked shipments</span>
        </div>
      </div>

      {/* Orders in Batch Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <h3 className="font-extrabold text-sm sm:text-base">Shipments in this Batch ({shipments.length})</h3>
          <span className="text-xs text-muted-foreground">Update tracking & progress delivery status</span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Order No.</TableHead>
                <TableHead>Consignment / Tracking #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address / District</TableHead>
                <TableHead className="text-right">COD Amount</TableHead>
                <TableHead className="text-center">Shipment Status</TableHead>
                <TableHead className="text-center">History</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((s) => (
                <TableRow key={s.id} className="group">
                  <TableCell>
                    <div
                      className="flex items-center gap-1.5 font-mono text-xs font-bold cursor-pointer hover:text-primary transition-colors"
                      onClick={() => copyText(s.orderNumber, "Order #")}
                      title="Click to copy Order #"
                    >
                      <span>#{s.orderNumber}</span>
                      <Copy className="size-3 opacity-0 group-hover:opacity-100" />
                    </div>
                  </TableCell>

                  <TableCell>
                    {s.trackingNumber ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-mono text-xs font-bold bg-muted/50 px-2 py-0.5 rounded border border-border cursor-pointer hover:border-primary transition-colors"
                          onClick={() => copyText(s.trackingNumber!, "Tracking #")}
                          title="Click to copy Tracking #"
                        >
                          {s.trackingNumber}
                        </span>
                        <button
                          onClick={() => {
                            setEditingTrackingShipment(s);
                            setTrackingInput(s.trackingNumber || "");
                          }}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors"
                          title="Edit Tracking Number"
                        >
                          <Pencil className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingTrackingShipment(s);
                          setTrackingInput("");
                        }}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <Pencil className="size-3" /> Add Tracking #
                      </button>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="text-xs">
                      <span className="font-bold text-foreground block">{s.customerName}</span>
                      <span className="text-muted-foreground font-mono">{s.customerPhone}</span>
                    </div>
                  </TableCell>

                  <TableCell className="max-w-[200px]">
                    <div className="text-xs text-foreground truncate" title={s.customerAddress}>
                      {s.customerAddress}
                    </div>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                      {s.district}
                    </span>
                  </TableCell>

                  <TableCell className="text-right font-black text-xs text-foreground">
                    {formatBDT(s.totalAmount)}
                  </TableCell>

                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={`flex items-center gap-1.5 mx-auto rounded-md px-2.5 py-1 text-[11px] font-bold capitalize border transition-all hover:opacity-80 ${
                            STATUS_BADGE_STYLES[s.status] || "bg-muted text-foreground"
                          }`}
                        >
                          <span>{s.status.replace(/_/g, " ")}</span>
                          <ChevronDown className="size-3 opacity-60" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="w-44">
                        {SHIPMENT_STATUS_OPTIONS.map((opt) => (
                          <DropdownMenuItem
                            key={opt.value}
                            onClick={() => handleStatusChangeRequest(s, opt.value)}
                            className="capitalize flex items-center justify-between text-xs font-semibold"
                          >
                            <span>{opt.label}</span>
                            {s.status === opt.value && <Check className="size-3 text-primary" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>

                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveHistoryShipment(s)}
                      className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                      title="View Status Change History"
                    >
                      <History className="size-3.5" />
                      <span className="text-[11px] font-bold">{s.history.length}</span>
                    </Button>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`https://wa.me/${s.customerPhone.replace(/\D/g, "")}`, "_blank")}
                        className="h-7 text-[10px] px-2 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white border-green-200 font-bold"
                      >
                        WA
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {shipments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-muted-foreground text-xs">
                    No shipments found in this batch.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Tracking Number Edit Modal */}
      <Dialog open={!!editingTrackingShipment} onOpenChange={(open) => !open && setEditingTrackingShipment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Update Tracking / Consignment Number</DialogTitle>
            <DialogDescription className="text-xs">
              Assign or modify carrier tracking number for Order #{editingTrackingShipment?.orderNumber}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTrackingNumber} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tracking Number / Consignment ID</Label>
              <Input
                placeholder="e.g. STF-892345"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="h-9 text-xs font-mono"
                autoFocus
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingTrackingShipment(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isUpdatingTracking} className="font-bold">
                {isUpdatingTracking ? "Saving..." : "Save Tracking Number"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel / Return Reason Dialog */}
      <Dialog open={!!statusChangeTarget} onOpenChange={(open) => !open && setStatusChangeTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {statusChangeTarget?.newStatus === "returned"
                ? "Record Shipment Return"
                : statusChangeTarget?.newStatus === "cancelled"
                ? "Cancel Shipment"
                : "Record Delivery Failure"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please enter the reason for Order #{statusChangeTarget?.shipment.orderNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason / Note *</Label>
              <Input
                placeholder="e.g. Customer unreachable, refused delivery, duplicate order..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="h-9 text-xs"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setStatusChangeTarget(null)}>
              Dismiss
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmittingStatus || !statusReason.trim()}
              onClick={() => {
                if (statusChangeTarget) {
                  executeStatusUpdate(
                    statusChangeTarget.shipment.id,
                    statusChangeTarget.newStatus,
                    statusReason.trim()
                  );
                }
              }}
              className="font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmittingStatus ? "Submitting..." : "Confirm Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shipment Status History Log Modal */}
      <Dialog open={!!activeHistoryShipment} onOpenChange={(open) => !open && setActiveHistoryShipment(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <History className="size-4 text-primary" /> Status History & Audit Log
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete status lifecycle timeline for Order #{activeHistoryShipment?.orderNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-96 overflow-y-auto pr-1">
            {activeHistoryShipment?.history.map((h, idx) => (
              <div key={h.id} className="flex items-start gap-3 p-3 bg-muted/20 border border-border rounded-xl text-xs">
                <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold capitalize text-foreground">
                      {h.previousStatus ? `${h.previousStatus.replace(/_/g, " ")} → ` : ""}
                      <span className="text-primary">{h.newStatus.replace(/_/g, " ")}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(h.changedAt).toLocaleString()}
                    </span>
                  </div>
                  {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                    <span>By: {h.changedBy}</span>
                    <span>•</span>
                    <span className="uppercase">Source: {h.source}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveHistoryShipment(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
