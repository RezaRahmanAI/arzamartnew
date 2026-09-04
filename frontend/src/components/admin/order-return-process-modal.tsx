"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Order, OrderItem } from "@/lib/orders";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RotateCcw,
  Package,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Undo2,
  DollarSign,
  Truck,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  processOrderReturnAction,
  ProcessOrderReturnPayload,
  ReturnedItemInput,
} from "@/actions/orders.actions";

// Flexible order interface to support either dashboard-data.ts or orders.tsx Order structures
export interface ReturnModalOrder {
  id: string;
  customer: string;
  phone: string;
  status: string;
  total: number;
  paid?: number;
  delivery?: number;
  items?: Array<{
    slug: string;
    name: string;
    size?: string;
    qty: number;
    price: number;
    imageUrl?: string;
  }>;
}

interface OrderReturnProcessModalProps {
  order: ReturnModalOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onReturnSuccess?: (result: {
    newStatus: string;
    newTotal: number;
    newDue: number;
    refund: number;
  }) => void;
}

interface ItemReturnState {
  selected: boolean;
  returnQty: number;
}

export function OrderReturnProcessModal({
  order,
  isOpen,
  onClose,
  onReturnSuccess,
}: OrderReturnProcessModalProps) {
  const [returnType, setReturnType] = useState<"full" | "partial">("full");
  const [restockInventory, setRestockInventory] = useState<boolean>(true);
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Per-item return selection state keyed by item index or slug+size
  const [itemSelections, setItemSelections] = useState<Record<number, ItemReturnState>>({});

  useEffect(() => {
    if (order?.items) {
      const initial: Record<number, ItemReturnState> = {};
      order.items.forEach((item, idx) => {
        initial[idx] = {
          selected: true,
          returnQty: item.qty || 1,
        };
      });
      setItemSelections(initial);
      setReturnType("full");
      setReason("");
    }
  }, [order]);

  const totalAmount = Number(order?.total || 0);
  const paidAmount = Number(order?.paid || 0);
  const deliveryFee = Number(order?.delivery || 0);
  const originalDue = Math.max(0, totalAmount - paidAmount);

  // Handle switching full vs partial
  const handleReturnTypeChange = (val: "full" | "partial") => {
    setReturnType(val);
    if (val === "full" && order?.items) {
      // Select all items with full quantity
      const allSelected: Record<number, ItemReturnState> = {};
      order.items.forEach((item, idx) => {
        allSelected[idx] = {
          selected: true,
          returnQty: item.qty || 1,
        };
      });
      setItemSelections(allSelected);
    }
  };

  const handleToggleItem = (idx: number, checked: boolean) => {
    setItemSelections((prev) => {
      const current = prev[idx] || { selected: false, returnQty: 1 };
      const updated = {
        ...prev,
        [idx]: {
          ...current,
          selected: checked,
          returnQty: checked ? current.returnQty || 1 : 0,
        },
      };

      // Check if all are selected to auto sync returnType
      const allChecked = (order?.items || []).every((_, i) =>
        i === idx ? checked : updated[i]?.selected
      );
      if (allChecked) {
        setReturnType("full");
      } else {
        setReturnType("partial");
      }
      return updated;
    });
  };

  const handleQtyChange = (idx: number, qty: number) => {
    setItemSelections((prev) => {
      const current = prev[idx] || { selected: true, returnQty: 1 };
      return {
        ...prev,
        [idx]: {
          ...current,
          returnQty: qty,
          selected: qty > 0,
        },
      };
    });
  };

  // Recalculations for live preview
  const { returnedValue, newTotal, refundDue, newDue } = useMemo(() => {
    let returnedItemsVal = 0;

    (order?.items || []).forEach((item, idx) => {
      const sel = itemSelections[idx];
      if (sel && sel.selected && sel.returnQty > 0) {
        const qty = Math.min(sel.returnQty, item.qty);
        returnedItemsVal += item.price * qty;
      }
    });

    // Delivery fee is STRICTLY non-refundable
    // Order Total becomes: Math.max(deliveryFee, totalAmount - returnedItemsVal)
    const calculatedNewTotal = Math.max(deliveryFee, Math.round(totalAmount - returnedItemsVal));
    let calculatedRefund = 0;
    let calculatedNewDue = 0;

    if (paidAmount > calculatedNewTotal) {
      calculatedRefund = paidAmount - calculatedNewTotal;
      calculatedNewDue = 0;
    } else {
      calculatedNewDue = calculatedNewTotal - paidAmount;
      calculatedRefund = 0;
    }

    return {
      returnedValue: returnedItemsVal,
      newTotal: calculatedNewTotal,
      refundDue: calculatedRefund,
      newDue: calculatedNewDue,
    };
  }, [order, itemSelections, totalAmount, paidAmount, deliveryFee]);

  const handleSubmitReturn = async (overrideType?: "reject") => {
    if (!order) return;
    const actionType = overrideType || returnType;

    if (actionType !== "reject") {
      const selectedItemsList: ReturnedItemInput[] = [];
      (order.items || []).forEach((item, idx) => {
        const sel = itemSelections[idx];
        if (sel && sel.selected && sel.returnQty > 0) {
          selectedItemsList.push({
            slug: item.slug,
            name: item.name,
            size: item.size,
            returnQty: sel.returnQty,
          });
        }
      });

      if (selectedItemsList.length === 0) {
        toast.error("Please select at least one item to return.");
        return;
      }

      setIsSubmitting(true);
      try {
        const payload: ProcessOrderReturnPayload = {
          orderIdentifier: order.id,
          returnType: actionType,
          restockInventory,
          returnedItems: selectedItemsList,
          reason,
          actorName: "Admin User",
        };

        const res = await processOrderReturnAction(payload);
        if (res.success) {
          toast.success(
            actionType === "full"
              ? `Order #${order.id} fully marked as Returned! Restocked ${res.restockedCount} units.`
              : `Order #${order.id} partially returned! New total: ৳${res.newTotalAmount}.`
          );
          if (onReturnSuccess) {
            onReturnSuccess({
              newStatus: res.newStatus || (actionType === "full" ? "return" : "return-process"),
              newTotal: res.newTotalAmount ?? newTotal,
              newDue: res.newDueAmount ?? newDue,
              refund: res.refundAmount ?? refundDue,
            });
          }
          onClose();
        } else {
          toast.error(res.error || "Failed to process return.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error processing return.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // REJECT RETURN
      setIsSubmitting(true);
      try {
        const payload: ProcessOrderReturnPayload = {
          orderIdentifier: order.id,
          returnType: "reject",
          restockInventory: false,
          returnedItems: [],
          reason: reason || "Rejected by administrator",
          actorName: "Admin User",
        };

        const res = await processOrderReturnAction(payload);
        if (res.success) {
          toast.info(`Return request for Order #${order.id} was rejected.`);
          if (onReturnSuccess) {
            onReturnSuccess({
              newStatus: res.newStatus || order.status,
              newTotal: totalAmount,
              newDue: originalDue,
              refund: 0,
            });
          }
          onClose();
        } else {
          toast.error(res.error || "Failed to reject return.");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error rejecting return.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50">
                <RotateCcw className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Process Order Return &mdash; #{order.id}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Customer: <span className="font-semibold text-foreground">{order.customer}</span> ({order.phone})
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Current Status
              </span>
              <p className="text-xs font-bold capitalize text-primary">{order.status}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Top Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-2.5 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Original Total
            </span>
            <span className="text-base font-extrabold text-foreground">৳{totalAmount}</span>
          </div>
          <div className="rounded-lg border bg-card p-2.5 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block">
              Customer Paid
            </span>
            <span className="text-base font-extrabold text-emerald-600">৳{paidAmount}</span>
          </div>
          <div className="rounded-lg border bg-card p-2.5 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-amber-600 block">
              Non-Refundable Delivery
            </span>
            <div className="flex items-center gap-1">
              <Truck className="size-3.5 text-amber-600" />
              <span className="text-base font-extrabold text-amber-600">৳{deliveryFee}</span>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-2.5 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-rose-600 block">
              Original Due
            </span>
            <span className="text-base font-extrabold text-rose-600">৳{originalDue}</span>
          </div>
        </div>

        {/* Return Mode Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-lg border bg-muted/30">
          <div className="space-y-1">
            <Label className="text-xs font-bold">Return Mode</Label>
            <RadioGroup
              value={returnType}
              onValueChange={(val) => handleReturnTypeChange(val as "full" | "partial")}
              className="flex items-center gap-4 pt-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="return-full" />
                <Label htmlFor="return-full" className="text-xs font-medium cursor-pointer">
                  Full Return (All Items)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="return-partial" />
                <Label htmlFor="return-partial" className="text-xs font-medium cursor-pointer">
                  Partial Return (Selected Items)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Restock Switch */}
          <div className="flex items-center gap-3 bg-background px-3 py-2 rounded-md border shadow-sm">
            <div className="space-y-0.5">
              <Label htmlFor="restock-switch" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Package className="size-3.5 text-primary" /> Back to Stock?
              </Label>
              <p className="text-[10px] text-muted-foreground">
                {restockInventory ? "Inventory will auto-increase" : "Marked as damaged / no restock"}
              </p>
            </div>
            <Switch
              id="restock-switch"
              checked={restockInventory}
              onCheckedChange={setRestockInventory}
            />
          </div>
        </div>

        {/* Line Items Table with Thumbnails */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/60 px-3 py-2 border-b flex items-center justify-between text-xs font-semibold">
            <span>Order Line Items ({order.items?.length || 0})</span>
            <span className="text-[11px] text-muted-foreground">
              Select items and return quantities below
            </span>
          </div>
          <div className="divide-y max-h-60 overflow-y-auto">
            {(order.items || []).map((item, idx) => {
              const sel = itemSelections[idx] || { selected: false, returnQty: item.qty };
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 transition-colors ${
                    sel.selected ? "bg-card" : "bg-muted/10 opacity-60"
                  }`}
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={sel.selected}
                    onCheckedChange={(checked) => handleToggleItem(idx, !!checked)}
                    className="data-[state=checked]:bg-primary"
                  />

                  {/* Product Thumbnail */}
                  <div className="size-12 rounded-md border bg-muted/40 overflow-hidden relative shrink-0 flex items-center justify-center">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <ImageIcon className="size-5 text-muted-foreground/50" />
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {item.size && (
                        <span className="bg-muted px-1.5 py-0.2 rounded font-medium">
                          Size: {item.size}
                        </span>
                      )}
                      <span>Price: ৳{item.price}</span>
                      <span>Ordered Qty: {item.qty}</span>
                    </div>
                  </div>

                  {/* Return Qty Select */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                      Return Qty:
                    </span>
                    <Select
                      value={String(sel.returnQty)}
                      onValueChange={(val) => handleQtyChange(idx, Number(val))}
                      disabled={!sel.selected}
                    >
                      <SelectTrigger className="w-16 h-8 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: item.qty }, (_, i) => i + 1).map((q) => (
                          <SelectItem key={q} value={String(q)} className="text-xs">
                            {q}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Item Subtotal Value Returned */}
                  <div className="w-20 text-right font-mono text-xs font-bold">
                    ৳{sel.selected ? item.price * sel.returnQty : 0}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Calculation Preview Banner */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground">Returned Merchandise Value:</span>
            <span className="font-mono font-bold text-rose-600">- ৳{returnedValue}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground">
              Retained Delivery Charge (Non-Refundable):
            </span>
            <span className="font-mono font-bold text-foreground">+ ৳{deliveryFee}</span>
          </div>
          <div className="border-t pt-2 flex items-center justify-between text-sm">
            <span className="font-bold text-foreground">Adjusted Order Total:</span>
            <span className="font-mono font-extrabold text-foreground">৳{newTotal}</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed">
            {refundDue > 0 ? (
              <>
                <span className="font-bold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="size-3.5" /> Amount to Refund to Customer:
                </span>
                <span className="font-mono font-extrabold text-rose-600 text-sm">৳{refundDue}</span>
              </>
            ) : (
              <>
                <span className="font-bold text-amber-600 flex items-center gap-1">
                  <AlertCircle className="size-3.5" /> Remaining Due from Customer:
                </span>
                <span className="font-mono font-extrabold text-amber-600 text-sm">৳{newDue}</span>
              </>
            )}
          </div>
        </div>

        {/* Reason / Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="return-reason" className="text-xs font-semibold">
            Return Reason / Notes (Optional)
          </Label>
          <Input
            id="return-reason"
            placeholder="e.g. Size mismatch, defective zip, customer refused at door..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-xs"
          />
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 border-t pt-3">
          {/* Reject button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 text-xs font-bold"
            disabled={isSubmitting}
            onClick={() => handleSubmitReturn("reject")}
          >
            <XCircle className="size-3.5 mr-1" />
            Reject Return Request
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              disabled={isSubmitting}
              onClick={() => handleSubmitReturn()}
            >
              {isSubmitting ? (
                "Processing..."
              ) : returnType === "full" ? (
                <>
                  <Undo2 className="size-3.5 mr-1" /> Initiate Full Return
                </>
              ) : (
                <>
                  <RotateCcw className="size-3.5 mr-1" /> Process Partial Return
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
