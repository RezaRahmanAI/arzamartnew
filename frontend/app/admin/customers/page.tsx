"use client";

import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBDT } from "@/lib/dashboard-data";
import { useCustomers } from "@/lib/customers-store";
import { useOrders } from "@/lib/orders";
import { customersService, type ApiCustomer } from "@/lib/api/services/customers.service";
import { useRouter } from "next/navigation";

const normalizePhone = (phone: string) => (phone || "").trim().replace(/\s+/g, "");

export default function AdminCustomers() {
  const router = useRouter();
  const { customers: localCustomers } = useCustomers();
  const { orders } = useOrders();
  const [apiCustomers, setApiCustomers] = useState<ApiCustomer[]>([]);

  useEffect(() => {
    customersService.getAll().then(setApiCustomers);
  }, []);

  // Real order stats per phone number derived from the orders feed
  const orderStatsByPhone = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const o of orders) {
      const key = normalizePhone(o.phone);
      const rec = map.get(key) || { count: 0, total: 0 };
      rec.count++;
      if (o.status !== "cancelled" && o.status !== "refund" && o.status !== "return-process") {
        rec.total += o.total;
      }
      map.set(key, rec);
    }
    return map;
  }, [orders]);

  const rows = useMemo(() => {
    const source =
      apiCustomers.length > 0
        ? apiCustomers.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            phone: c.phone,
            district: c.district || "Dhaka",
            createdAtUtc: c.createdAtUtc,
          }))
        : localCustomers.map((c) => ({
            id: c.customerId,
            fullName: c.fullName,
            phone: c.mobileNumber,
            district: c.district || c.area || "Dhaka",
            createdAtUtc: c.createdAt,
          }));

    return source
      .map((c) => {
        const stats = orderStatsByPhone.get(normalizePhone(c.phone)) || { count: 0, total: 0 };
        return { ...c, orderCount: stats.count, totalSpent: stats.total };
      })
      .filter((c) => (c.fullName && c.fullName.trim()) || c.orderCount > 0);
  }, [apiCustomers, localCustomers, orderStatsByPhone]);

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
            {rows.map((c) => (
              <TableRow
                key={c.id}
                onClick={() => router.push(`/admin/customers/${encodeURIComponent(c.phone)}`)}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <TableCell className="font-medium">{c.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{c.phone}</TableCell>
                <TableCell>{c.district}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.createdAtUtc?.slice(0, 10)}</TableCell>
                <TableCell className="text-right">{c.orderCount}</TableCell>
                <TableCell className="text-right font-semibold">{formatBDT(c.totalSpent)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No customers yet. Customers are created automatically when they place an order.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}