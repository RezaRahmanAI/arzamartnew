import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Order } from "@/lib/dashboard-data";
import { getSystemAuditLogs } from "@/lib/audit-logger";
import { Truck, Clock, CheckCircle2, PackageCheck, Copy, ExternalLink, Activity, History, FileText } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"tracking" | "history">("tracking");

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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Truck className="size-5 text-primary" />
              <DialogTitle>Order #{order.id}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs">
            Customer: <strong>{order.customer}</strong> ({order.phone}) • Total: <strong>৳{order.total}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-border mt-1">
          <button
            type="button"
            onClick={() => setActiveTab("tracking")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "tracking"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Truck className="size-3.5" />
            Order Tracking
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "history"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="size-3.5" />
            Change History (Audit)
            {auditEvents.length > 0 && (
              <span className="size-4 rounded-full bg-secondary text-[10px] flex items-center justify-center font-bold">
                {auditEvents.length}
              </span>
            )}
          </button>
        </div>

        <div className="space-y-4 py-2">
          {activeTab === "tracking" ? (
            /* Tab 1: Order Tracking (Narrative story of progress) */
            <div className="space-y-4">
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
                    <span className="text-[11px] text-muted-foreground block">Courier Partner</span>
                    <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                      <Truck className="size-3.5 text-primary" />
                      {order.courierName || "Not assigned yet"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <span className="text-[11px] text-muted-foreground block">Consignment / Tracking No</span>
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

              {/* Narrative Story Line */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Activity className="size-3.5 text-primary" /> Operational Progress
                </h4>

                <div className="relative border-l-2 border-primary/30 ml-3.5 space-y-4 py-1">
                  {/* Current Status */}
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-background flex items-center justify-center">
                      <div className="size-1.5 rounded-full bg-white" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-black uppercase text-primary tracking-wide">{order.status}</div>
                      <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                        <Clock className="size-3" /> Live
                      </div>
                    </div>
                    <div className="text-xs text-foreground font-medium mt-0.5">
                      {order.status === "pending" && "Order received. Pending confirmation call with customer."}
                      {order.status === "confirmed" && "Order verified and confirmed with customer. Sent to packaging."}
                      {order.status === "processing" && "Order items being packed and prepared for courier dispatch."}
                      {order.status === "shipped" && `Handed over to courier (${order.courierName || "courier service"}) for delivery.`}
                      {order.status === "delivered" && "Successfully delivered to customer."}
                      {order.status === "cancelled" && "Order was cancelled."}
                      {order.status === "return" && "Parcel returned from courier."}
                      {!["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "return"].includes(order.status) &&
                        `Order is currently marked as ${order.status}.`}
                    </div>
                  </div>

                  {/* Shipment dispatch note if courier assigned */}
                  {order.courierName && (
                    <div className="relative pl-6">
                      <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-background" />
                      <div className="text-xs font-bold text-foreground">ASSIGNED TO COURIER</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Courier partner: <strong>{order.courierName}</strong>
                        {order.courierTrackingNumber && ` (Consignment ID: ${order.courierTrackingNumber})`}
                      </div>
                    </div>
                  )}

                  {/* Creation note */}
                  <div className="relative pl-6 opacity-85">
                    <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-muted-foreground/60 ring-4 ring-background" />
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-foreground">ORDER INITIATED</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{order.date}</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Placed by <strong>{order.customer}</strong> via {order.source || "Website"}.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Change History (Field-level audit log) */
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" /> Audit Log & Field Mutations
              </h4>

              {auditEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  <History className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                  No field changes recorded for this order yet.
                  <p className="text-[11px] mt-1 text-muted-foreground/70">
                    Any status updates, address edits, or item changes will be logged here with staff credentials.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {auditEvents.map((evt) => (
                    <div key={evt.id} className="rounded-lg border border-border/70 bg-card p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-primary" />
                          {evt.action}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(evt.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="text-muted-foreground text-[11px]">
                        {evt.details}
                      </div>

                      {evt.changes && Object.keys(evt.changes).length > 0 && (
                        <div className="mt-1.5 bg-muted/40 rounded p-2 text-[11px] space-y-1 font-mono">
                          {Object.entries(evt.changes).map(([fld, diff]) => (
                            <div key={fld} className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{fld}:</span>
                              <span className="text-destructive line-through">{String(diff.from ?? "none")}</span>
                              <span>→</span>
                              <span className="text-emerald-600 font-bold">{String(diff.to ?? "none")}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-[10px] text-primary/80 font-medium pt-1 border-t border-border/40 flex items-center justify-between">
                        <span>Staff: <strong>{evt.actorName}</strong></span>
                        <span className="text-muted-foreground">{evt.actorRole}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

