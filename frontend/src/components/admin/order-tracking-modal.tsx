"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Order } from "@/lib/dashboard-data";
import { getSystemAuditLogs } from "@/lib/audit-logger";
import { Truck, Clock, CheckCircle2, PackageCheck, Copy, ExternalLink, Activity } from "lucide-react";
import { toast } from "sonner";

export function OrderTrackingModal({
  order,
  isOpen,
  onClose,
}: {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const auditEvents = useMemo(() => {
    if (!order) return [];
    const allLogs = getSystemAuditLogs();
    const cleanId = order.id.replace(/^ORD-/, "");
    return allLogs.filter(
      (l) =>
        l.targetId === order.id ||
        l.targetId === cleanId ||
        l.targetId === `ORD-${cleanId}` ||
        l.details.includes(order.id) ||
        l.details.includes(cleanId)
    );
  }, [order]);

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Truck className="size-5 text-primary" />
            <DialogTitle>Order Tracking & History: #{order.id}</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Live shipment tracking and lifecycle history for <strong>{order.customer}</strong> ({order.phone}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Courier & Live Tracking Info Card */}
          <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Courier Status</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary capitalize border border-primary/20">
                <CheckCircle2 className="size-3.5" /> {order.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2 rounded-lg bg-background border border-border/60">
                <span className="text-[11px] text-muted-foreground block">Courier Name</span>
                <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <Truck className="size-3.5 text-primary" />
                  {order.courierName || "Not assigned yet"}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-background border border-border/60">
                <span className="text-[11px] text-muted-foreground block">Tracking ID / Consignment</span>
                {order.courierTrackingNumber ? (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(order.courierTrackingNumber!);
                      toast.success(`Copied Tracking: ${order.courierTrackingNumber}`);
                    }}
                    className="font-mono font-bold text-primary hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                    title="Click to copy tracking ID"
                  >
                    {order.courierTrackingNumber}
                    <Copy className="size-3 text-muted-foreground" />
                  </button>
                ) : (
                  <span className="font-mono text-muted-foreground text-[11px] mt-0.5 block">-</span>
                )}
              </div>
            </div>
          </div>

          {/* Timeline & Lifecycle Events */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b pb-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Activity className="size-3.5 text-primary" /> Tracking Timeline ({auditEvents.length > 0 ? auditEvents.length + 1 : 2} events)
              </h4>
            </div>

            <div className="relative border-l-2 border-primary/30 ml-3.5 space-y-5 py-1">
              {/* Current Status Event */}
              <div className="relative pl-6">
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-background flex items-center justify-center">
                  <div className="size-1.5 rounded-full bg-white" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase text-primary tracking-wide">{order.status}</div>
                  <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                    <Clock className="size-3" /> Current Status
                  </div>
                </div>
                <div className="text-xs text-foreground font-medium mt-0.5">
                  Order is currently marked as <span className="font-bold capitalize">{order.status}</span>.
                </div>
              </div>

              {/* Dynamic Audit Log Events if any recorded */}
              {auditEvents.map((evt) => (
                <div key={evt.id} className="relative pl-6">
                  <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-amber-500 ring-4 ring-background" />
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-foreground">{evt.action}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {new Date(evt.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{evt.details}</div>
                  <div className="text-[10px] text-primary/80 font-medium mt-0.5">By: {evt.actorName} ({evt.actorRole})</div>
                </div>
              ))}

              {/* Order Placement Origin Event */}
              <div className="relative pl-6 opacity-85">
                <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-muted-foreground/60 ring-4 ring-background" />
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-foreground">ORDER CREATED</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{order.date}</div>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Order placed by <strong>{order.customer}</strong> via {order.source || "Website"}. Total: ৳{order.total}.
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

