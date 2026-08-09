"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export interface OutOfStockItem {
  name: string;
  size?: string;
  needed: number;
  available: number;
}

export function OrderStockWarningModal({
  isOpen,
  items,
  onCancel,
  onConfirmAnyway,
}: {
  isOpen: boolean;
  items: OutOfStockItem[];
  onCancel: () => void;
  onConfirmAnyway: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="p-0 overflow-hidden max-w-md">
        <DialogHeader className="bg-destructive p-6 rounded-t-lg text-destructive-foreground">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-white" />
            <div>
              <DialogTitle className="text-white text-lg">Stock Unavailable</DialogTitle>
              <p className="text-white/80 text-sm mt-1">
                {items.length} item(s) have insufficient stock
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 pb-4">
          <p className="text-sm text-muted-foreground font-medium mb-3">
            Out of Stock Products:
          </p>
          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20 rounded-lg"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <p className="font-bold text-sm truncate text-foreground">{item.name}</p>
                  {item.size && (
                    <p className="text-xs text-muted-foreground mt-0.5">Size: {item.size}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm text-destructive">Required: {item.needed}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Available: {item.available}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3 bg-background">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" className="flex-1 font-bold" onClick={onConfirmAnyway}>
            Confirm Anyway
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
