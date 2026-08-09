"use client";

import { Check, Trash2 } from "lucide-react";
import { useOrders } from "@/lib/orders";
import { formatBDT } from "@/lib/dashboard-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminIncomplete() {
  const { incomplete, promoteIncomplete, removeIncomplete } = useOrders();

  return (
    <div className="space-y-5">

      {incomplete.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center shadow-card">
          <p className="text-sm text-muted-foreground">No incomplete orders right now.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomplete.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell>
                    <span className="font-medium">{o.customer}</span>
                    {o.address && (
                      <span className="block text-xs text-muted-foreground">{o.address}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{o.phone || "—"}</TableCell>
                  <TableCell>{o.city}</TableCell>
                  <TableCell className="max-w-56 truncate text-xs text-muted-foreground">
                    {o.items.map((it) => `${it.name} (${it.size}) ×${it.qty}`).join(", ")}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatBDT(o.total)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => promoteIncomplete(o.id)}
                        className="rounded-md border border-border p-2 text-foreground transition-colors hover:border-emerald-500 hover:text-emerald-600 cursor-pointer"
                        aria-label="Move to orders"
                        title="Move to orders"
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeIncomplete(o.id)}
                        className="rounded-md border border-border p-2 text-foreground transition-colors hover:border-destructive hover:text-destructive cursor-pointer"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
