"use client";

import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { comboOffers, formatBDT, products } from "@/lib/shop-data";

export default function AdminLinks() {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const copy = async (path: string, label: string) => {
    const url = `${origin || "https://arza.example"}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", { description: label });
    } catch {
      toast.error("Couldn't copy — select the link text manually.");
    }
  };

  return (
    <div className="space-y-5">

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Promotion link</TableHead>
              <TableHead className="text-right">Copy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.slug}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{formatBDT(p.price)}</TableCell>
                <TableCell className="max-w-64 truncate font-mono text-xs text-muted-foreground">
                  /promotion/{p.slug}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    onClick={() => copy(`/promotion/${p.slug}`, p.name)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:border-primary hover:text-primary cursor-pointer"
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <LinkIcon className="size-4 text-primary" />
          <p className="text-sm font-bold">Combo offer links</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bundle</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Offer link</TableHead>
              <TableHead className="text-right">Copy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comboOffers.map((c) => (
              <TableRow key={c.slug}>
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell className="text-muted-foreground">{formatBDT(c.price)}</TableCell>
                <TableCell className="max-w-64 truncate font-mono text-xs text-muted-foreground">
                  /offer/{c.slug}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    type="button"
                    onClick={() => copy(`/offer/${c.slug}`, c.title)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:border-primary hover:text-primary cursor-pointer"
                  >
                    <Check className="size-3.5" />
                    Copy
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
