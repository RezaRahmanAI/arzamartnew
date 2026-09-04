"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Phone,
  MapPin,
  Pencil,
  X,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import {
  retrySingleOrderCourierSyncAction,
  type FailedSyncItemDto,
  type ShipmentBatchDto,
} from "@/actions/shipments.actions";

interface CourierSyncErrorsModalProps {
  batch: ShipmentBatchDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccessRetry: (updatedBatchId: string, orderId: string, newTracking: string) => void;
}

export function CourierSyncErrorsModal({
  batch,
  isOpen,
  onClose,
  onSuccessRetry,
}: CourierSyncErrorsModalProps) {
  const [items, setItems] = useState<FailedSyncItemDto[]>(batch?.errorItems || []);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Form edit states
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);

  // Keep items synced if batch changes
  if (batch?.errorItems && items !== batch.errorItems && !editingOrderId && !isRetrying) {
    setItems(batch.errorItems);
  }

  if (!isOpen || !batch) return null;

  const handleStartEdit = (item: FailedSyncItemDto) => {
    setEditingOrderId(item.orderId);
    setEditName(item.customerName || "");
    setEditPhone(item.customerPhone || "");
    setEditAddress(item.customerAddress || "");
    setEditDistrict(item.district || "Dhaka");
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
  };

  const handleSaveAndRetry = async (orderId: string) => {
    if (!editPhone.trim()) {
      toast.error("Phone number cannot be empty.");
      return;
    }
    if (!editAddress.trim()) {
      toast.error("Address cannot be empty.");
      return;
    }

    setIsRetrying(true);
    try {
      const res = await retrySingleOrderCourierSyncAction({
        batchId: batch.id,
        orderId,
        customerName: editName.trim(),
        customerPhone: editPhone.trim(),
        customerAddress: editAddress.trim(),
        district: editDistrict.trim() || "Dhaka",
      });

      if (res.success && res.trackingNumber) {
        toast.success(`Order #${items.find((i) => i.orderId === orderId)?.orderNumber} synced! Tracking: ${res.trackingNumber}`);
        // Remove item live from modal state
        setItems((prev) => prev.filter((i) => i.orderId !== orderId));
        setEditingOrderId(null);
        // Notify parent to decrement errors and increment synced count live
        onSuccessRetry(batch.id, orderId, res.trackingNumber);
      } else {
        const failureReason = res.error || "Courier API rejected the retry request.";
        toast.error(`Retry Failed: ${failureReason}`);
        // Update error message live for this item
        setItems((prev) =>
          prev.map((i) =>
            i.orderId === orderId ? { ...i, errorMessage: failureReason, failedAt: new Date().toISOString() } : i
          )
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error executing courier retry.");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                  Failed Synchronization Details
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Batch <span className="font-mono font-bold text-foreground">{batch.batchNumber}</span> • {batch.courierName} • {items.length} unresolved error(s)
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {items.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-foreground">All Errors Resolved!</h4>
              <p className="text-xs text-muted-foreground">
                Every order in this batch has been successfully synced with {batch.courierName}.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-32">Order Code</TableHead>
                    <TableHead className="w-48">Customer Info</TableHead>
                    <TableHead>Courier Error Message</TableHead>
                    <TableHead className="w-36 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isEditing = editingOrderId === item.orderId;
                    return (
                      <TableRow key={item.orderId} className={`group ${isEditing ? "bg-primary/5" : ""}`}>
                        {/* Order Code */}
                        <TableCell className="align-top py-3 font-mono font-bold text-xs">
                          <span className="text-foreground">#{item.orderNumber}</span>
                          <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">
                            {new Date(item.failedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </TableCell>

                        {/* Customer Info (or Inline Edit Inputs) */}
                        <TableCell className="align-top py-3">
                          {isEditing ? (
                            <div className="space-y-2 pr-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Name</Label>
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="h-7 text-xs font-medium"
                                  placeholder="Full Name"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Phone (11 Digits)</Label>
                                <Input
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  className="h-7 text-xs font-mono font-bold"
                                  placeholder="017xxxxxxxx"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Address</Label>
                                <Input
                                  value={editAddress}
                                  onChange={(e) => setEditAddress(e.target.value)}
                                  className="h-7 text-xs"
                                  placeholder="House, Road, Area"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground">District</Label>
                                <Input
                                  value={editDistrict}
                                  onChange={(e) => setEditDistrict(e.target.value)}
                                  className="h-7 text-xs"
                                  placeholder="e.g. Dhaka, Chittagong"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1 text-xs">
                              <div className="font-bold text-foreground">{item.customerName}</div>
                              <div className="font-mono text-muted-foreground flex items-center gap-1">
                                <Phone className="size-3 text-muted-foreground shrink-0" />
                                {item.customerPhone}
                              </div>
                              <div className="text-muted-foreground text-[11px] truncate max-w-[200px]" title={item.customerAddress}>
                                <MapPin className="size-3 text-muted-foreground inline mr-0.5" />
                                {item.customerAddress} ({item.district})
                              </div>
                            </div>
                          )}
                        </TableCell>

                        {/* Courier Error Message */}
                        <TableCell className="align-top py-3">
                          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs space-y-1">
                            <div className="flex items-start gap-1.5 font-semibold leading-tight">
                              <AlertTriangle className="size-3.5 shrink-0 text-rose-600 mt-0.5" />
                              <span>{item.errorMessage}</span>
                            </div>
                            <span className="text-[10px] text-rose-600/80 block pl-5">
                              Courier API validation rejected consignment registration.
                            </span>
                          </div>
                        </TableCell>

                        {/* Action Column */}
                        <TableCell className="align-top py-3 text-right">
                          {isEditing ? (
                            <div className="flex flex-col gap-1.5 justify-end">
                              <Button
                                size="sm"
                                disabled={isRetrying}
                                onClick={() => handleSaveAndRetry(item.orderId)}
                                className="h-7 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                              >
                                <RotateCcw className={`size-3 ${isRetrying ? "animate-spin" : ""}`} />
                                {isRetrying ? "Sending..." : "Save & Resend"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isRetrying}
                                onClick={handleCancelEdit}
                                className="h-7 text-xs cursor-pointer"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartEdit(item)}
                              className="h-7 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10 hover:text-primary cursor-pointer"
                            >
                              <Pencil className="size-3" /> Edit & Retry
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-muted/10">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
