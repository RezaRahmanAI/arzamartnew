"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Order } from "@/lib/dashboard-data";

export function OrderTrackingModal({
  order,
  isOpen,
  onClose,
}: {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Order History: {order.id}</DialogTitle>
          <DialogDescription>
            Tracking and status history for this order.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative border-l border-muted-foreground/30 ml-3 space-y-6">
            <div className="relative pl-6">
              <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary" />
              <div className="text-sm font-medium">{order.status.toUpperCase()}</div>
              <div className="text-xs text-muted-foreground">{new Date().toLocaleString()}</div>
              <div className="text-xs mt-1">Order status updated to {order.status}</div>
            </div>
            <div className="relative pl-6 opacity-70">
              <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-muted-foreground/50" />
              <div className="text-sm font-medium">PENDING</div>
              <div className="text-xs text-muted-foreground">{order.date}</div>
              <div className="text-xs mt-1">Order placed by {order.customer}</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
