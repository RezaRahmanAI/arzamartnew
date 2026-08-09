"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Order } from "@/lib/dashboard-data";

export function OrderNotesModal({
  order,
  isOpen,
  onClose,
}: {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Order Notes for {order.id}</DialogTitle>
          <DialogDescription>
            Add internal notes for this order. These are not visible to the customer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium leading-none">Existing Notes</h4>
            {order.hasNotes ? (
              <div className="rounded-md bg-muted p-3 text-sm">
                This order has existing notes from previous interactions. (Mocked content)
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium leading-none">Add Note</h4>
            <Textarea
              placeholder="Type your note here..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={() => {
              order.hasNotes = true;
              onClose();
            }}
          >
            Save Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
