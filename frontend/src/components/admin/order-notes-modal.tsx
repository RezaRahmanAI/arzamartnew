"use client";

import { useState, useEffect } from "react";
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
import { useAuth } from "@/context/auth-context";
import { ordersService } from "@/lib/api/services/orders.service";
import { toast } from "sonner";
import { User, Clock } from "lucide-react";

export type NoteRecord = {
  id: string;
  text: string;
  author: string;
  timestamp: string;
};

const STORAGE_KEY = "arzamart_order_notes_store_v1";

export const getSavedNotesStore = (): Record<string, NoteRecord[]> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveNotesStore = (store: Record<string, NoteRecord[]>) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error("Failed to save order notes to localStorage:", err);
  }
};

export function OrderNotesModal({
  order,
  isOpen,
  onClose,
}: {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [notesList, setNotesList] = useState<NoteRecord[]>([]);

  useEffect(() => {
    if (order) {
      const store = getSavedNotesStore();
      const savedForOrder = store[order.id] || (order as any).notesList || [];
      const normalized: NoteRecord[] = savedForOrder.map((item: any, idx: number) => {
        if (typeof item === "string") {
          return {
            id: `note-${idx}`,
            text: item,
            author: "System Admin",
            timestamp: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          };
        }
        return item;
      });

      setNotesList(normalized);
    }
  }, [order]);

  if (!order) return null;

  const currentAuthor = user?.name
    ? `${user.name}${user.role === "staff" && user.staffRole ? ` (${user.staffRole})` : user.role === "admin" ? " (Admin)" : ""}`
    : "Admin Account";

  const handleSaveNote = () => {
    if (!note.trim()) {
      toast.error("Please enter a note before saving.");
      return;
    }

    const currentTime = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const newNoteObj: NoteRecord = {
      id: `note-${Date.now()}`,
      text: note.trim(),
      author: currentAuthor,
      timestamp: currentTime,
    };

    const updatedNotes = [...notesList, newNoteObj];
    setNotesList(updatedNotes);
    (order as any).notesList = updatedNotes;
    order.hasNotes = true;

    // Persist permanently in localStorage and Database
    const store = getSavedNotesStore();
    store[order.id] = updatedNotes;
    saveNotesStore(store);

    ordersService.addNote(order.id, note.trim(), currentAuthor);

    setNote("");
    toast.success(`Note saved by ${currentAuthor}!`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Order Notes for {order.id}</DialogTitle>
          <DialogDescription>
            Internal notes for this order. Logged as: <span className="font-semibold text-foreground">{currentAuthor}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Existing Notes ({notesList.length})</h4>
            {notesList.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {notesList.map((n) => (
                  <div key={n.id} className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b pb-1">
                      <span className="font-semibold text-primary flex items-center gap-1">
                        <User className="h-3 w-3" /> {n.author}
                      </span>
                      <span className="flex items-center gap-1 text-[10px]">
                        <Clock className="h-3 w-3" /> {n.timestamp}
                      </span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap font-medium">{n.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No notes added yet.</p>
            )}
          </div>
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add New Note</h4>
            <Textarea
              rows={3}
              placeholder="Type internal note here..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs"
            />
          </div>
          <Button
            className="w-full font-bold"
            onClick={handleSaveNote}
          >
            Save Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
