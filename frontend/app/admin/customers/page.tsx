"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBDT } from "@/lib/dashboard-data";
import { useCustomers } from "@/lib/customers-store";
import { useRouter } from "next/navigation";

export default function AdminCustomers() {
  const router = useRouter();
  const { customers } = useCustomers();
  const ranked = [...customers];

  return (
    <div className="space-y-5">

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Since</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Lifetime spend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranked.map((c) => (
              <TableRow
                key={c.customerId}
                onClick={() => router.push(`/admin/customers/${encodeURIComponent(c.mobileNumber)}`)}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <TableCell className="font-medium">{c.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{c.mobileNumber}</TableCell>
                <TableCell>{c.district || c.area || "Dhaka"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.createdAt?.slice(0, 10)}</TableCell>
                <TableCell className="text-right">0</TableCell>
                <TableCell className="text-right font-semibold">{formatBDT(0)}</TableCell>
              </TableRow>
            ))}
            {ranked.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No registered customers found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
