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
import { User, Clock, ShieldAlert, Truck } from "lucide-react";

export type NoteRecord = {
  id: string;
  text: string;
  noteType?: "Internal Note" | "Customer / Delivery Note";
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

type OrderWithNotes = Order & { notesList?: NoteRecord[] };

export function OrderNotesModal({
  order,
  isOpen,
  onClose,
}: {
  order: OrderWithNotes | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [selectedType, setSelectedType] = useState<"Internal Note" | "Customer / Delivery Note">("Internal Note");
  const [notesList, setNotesList] = useState<NoteRecord[]>([]);

  useEffect(() => {
    if (order) {
      const store = getSavedNotesStore();
      let savedForOrder = store[order.id] || order.notesList || [];

      // If no saved notes list exists yet, check if order.note was populated during order creation/placement
      if (savedForOrder.length === 0 && order.note && order.note.trim()) {
        const parts = order.note.split(" | ");
        const initialNotes: NoteRecord[] = parts.map((part, idx) => {
          const isInternal = part.toLowerCase().startsWith("internal note:");
          return {
            id: `init-${idx}`,
            text: part.replace(/^(internal note|customer note|customer \/ delivery note):\s*/i, "").trim(),
            noteType: isInternal ? "Internal Note" : "Customer / Delivery Note",
            author: isInternal ? "Staff / Admin" : "Customer",
            timestamp: order.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          };
        });

        savedForOrder = initialNotes;
        store[order.id] = initialNotes;
        saveNotesStore(store);
      }

      const normalized: NoteRecord[] = savedForOrder.map((item: string | NoteRecord, idx: number) => {
        if (typeof item === "string") {
          const isInternal = item.toLowerCase().startsWith("internal note:");
          return {
            id: `note-${idx}`,
            text: item.replace(/^(internal note|customer note|customer \/ delivery note):\s*/i, "").trim(),
            noteType: isInternal ? "Internal Note" : "Customer / Delivery Note",
            author: isInternal ? "Staff / Admin" : "Customer",
            timestamp: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          };
        }
        return {
          ...item,
          noteType: item.noteType || (item.text?.toLowerCase().startsWith("internal note:") ? "Internal Note" : "Customer / Delivery Note"),
        };
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
      noteType: selectedType,
      author: currentAuthor,
      timestamp: currentTime,
    };

    const updatedNotes = [...notesList, newNoteObj];
    setNotesList(updatedNotes);
    order.notesList = updatedNotes;
    order.hasNotes = true;

    // Update order.note string for customer/delivery instructions
    if (selectedType === "Customer / Delivery Note") {
      order.note = order.note ? `${order.note} | Delivery Note: ${note.trim()}` : `Delivery Note: ${note.trim()}`;
    }

    // Persist permanently in localStorage and Database
    const store = getSavedNotesStore();
    store[order.id] = updatedNotes;
    saveNotesStore(store);

    ordersService.addNote(order.id, `[${selectedType}] ${note.trim()}`, currentAuthor);

    setNote("");
    toast.success(`${selectedType} saved successfully!`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Order Notes for {order.id}</DialogTitle>
          <DialogDescription>
            Log notes for this order. Current user: <span className="font-semibold text-foreground">{currentAuthor}</span>
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
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-foreground whitespace-pre-wrap font-medium flex-1">{n.text}</p>
                      <span
                        className={`inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          n.noteType === "Customer / Delivery Note"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-blue-100 text-blue-800 border border-blue-300"
                        }`}
                      >
                        {n.noteType === "Customer / Delivery Note" ? (
                          <>
                            <Truck className="h-2.5 w-2.5" /> Customer/Delivery
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="h-2.5 w-2.5" /> Internal
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No notes added yet.</p>
            )}
          </div>

          <div className="space-y-2.5 pt-2 border-t">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add New Note</h4>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as "Internal Note" | "Customer / Delivery Note")}
                className="h-7 text-xs font-semibold rounded-md border border-input bg-background px-2 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="Internal Note">🔒 Internal Note</option>
                <option value="Customer / Delivery Note">🚚 Customer / Delivery Note</option>
              </select>
            </div>

            <Textarea
              rows={3}
              placeholder={
                selectedType === "Customer / Delivery Note"
                  ? "Type customer or delivery instruction (shows on Invoice PDF & Delivery)..."
                  : "Type internal private note here..."
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs"
            />
          </div>

          <Button className="w-full font-bold" onClick={handleSaveNote}>
            Save {selectedType}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
