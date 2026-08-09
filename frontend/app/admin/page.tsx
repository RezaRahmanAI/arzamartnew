"use client";

import Link from "next/link";
import { ShoppingBag, TrendingUp, Users, Wallet } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  categoryShare,
  formatBDT,
  kpis,
  orders,
  revenueSeries,
  statusStyles,
  topProducts,
} from "@/lib/dashboard-data";

const cards = [
  { label: "Revenue", value: formatBDT(kpis.revenue), icon: Wallet, hint: "Last 14 days" },
  { label: "Orders", value: String(kpis.orders), icon: ShoppingBag, hint: `${kpis.pending} pending` },
  { label: "Customers", value: String(kpis.customers), icon: Users, hint: "Repeat buyers included" },
  { label: "Avg. order", value: formatBDT(kpis.avgOrder), icon: TrendingUp, hint: "Per paid order" },
];

export default function AdminOverview() {
  const recent = orders.slice(0, 6);

  return (
    <div className="space-y-6">

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
              <card.icon className="size-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-2xl font-extrabold">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <p className="text-sm font-bold">Revenue trend</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="date" fontSize={11} stroke="currentColor" className="text-muted-foreground" />
                <YAxis fontSize={11} stroke="currentColor" className="text-muted-foreground" width={48} />
                <Tooltip
                  formatter={(v: number) => formatBDT(v)}
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="currentColor"
                  className="text-primary"
                  fill="url(#rev)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <p className="text-sm font-bold">Revenue by category</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryShare}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="category" fontSize={10} stroke="currentColor" className="text-muted-foreground" />
                <YAxis fontSize={11} stroke="currentColor" className="text-muted-foreground" width={48} />
                <Tooltip
                  formatter={(v: number) => formatBDT(v)}
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="value" isAnimationActive={false} radius={[6, 6, 0, 0]} fill="currentColor" className="text-primary" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Recent orders</p>
            <Link href="/admin/orders" className="text-xs font-semibold text-primary">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recent.map((order) => (
              <div key={order.id} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{order.id}</span>
                <span className="truncate font-medium">{order.customer}</span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusStyles[order.status]}`}
                >
                  {order.status}
                </span>
                <span className="w-20 text-right font-semibold">{formatBDT(order.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <p className="text-sm font-bold">Best sellers</p>
          <div className="mt-4 space-y-3">
            {topProducts.map((p) => (
              <div key={p.slug} className="flex items-center gap-3 text-sm">
                <span className="truncate font-medium">{p.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{p.units} units</span>
                <span className="w-20 text-right font-semibold">{formatBDT(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
