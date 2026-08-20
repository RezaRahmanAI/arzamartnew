"use client";

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
import { formatBDT, categoryShare } from "@/lib/dashboard-data";

interface DashboardChartsProps {
  revenueSeries: Array<{ date: string; revenue: number }>;
}

export function DashboardCharts({ revenueSeries }: DashboardChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2">
        <p className="text-sm font-bold text-foreground">Revenue trend</p>
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
                contentStyle={{ borderRadius: 12, fontSize: 12, backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
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
        <p className="text-sm font-bold text-foreground">Revenue by category</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryShare}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="category" fontSize={10} stroke="currentColor" className="text-muted-foreground" />
              <YAxis fontSize={11} stroke="currentColor" className="text-muted-foreground" width={48} />
              <Tooltip
                formatter={(v: number) => formatBDT(v)}
                contentStyle={{ borderRadius: 12, fontSize: 12, backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="value" isAnimationActive={false} radius={[6, 6, 0, 0]} fill="currentColor" className="text-primary" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function DashboardChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2">
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="mt-4 h-64 bg-muted/30 rounded-lg animate-pulse flex items-center justify-center text-xs text-muted-foreground">
          Loading charts...
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="h-4 w-36 bg-muted rounded animate-pulse" />
        <div className="mt-4 h-64 bg-muted/30 rounded-lg animate-pulse flex items-center justify-center text-xs text-muted-foreground">
          Loading charts...
        </div>
      </div>
    </div>
  );
}

export default DashboardCharts;
