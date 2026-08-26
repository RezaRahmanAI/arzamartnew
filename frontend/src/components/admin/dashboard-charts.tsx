"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBDT } from "@/lib/shop-data";

interface DashboardChartsProps {
  revenueSeries: Array<{ date: string; revenue: number; orders?: number }>;
  categoryData?: Array<{ name: string; value: number; color?: string }>;
  statusData?: Array<{ name: string; value: number; color: string }>;
}

const CATEGORY_COLORS = [
  "hsl(var(--primary))",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];

export function DashboardCharts({
  revenueSeries,
  categoryData = [],
  statusData = [],
}: DashboardChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Main Revenue Trend Chart */}
      <div className="lg:col-span-8 rounded-2xl border border-border/80 bg-card p-6 shadow-sm hover:shadow-md transition-all">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Revenue & Sales Velocity</h3>
            <p className="text-xs text-muted-foreground">Historical order volume and revenue generation trend</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="size-2.5 rounded-full bg-primary animate-pulse" /> Revenue (BDT)
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueSeries} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
              <XAxis
                dataKey="date"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `৳${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border border-border bg-popover/95 p-3 shadow-xl backdrop-blur-md text-xs">
                        <div className="font-bold text-foreground mb-1">{label}</div>
                        <div className="flex items-center justify-between gap-4 text-primary font-extrabold">
                          <span>Revenue:</span>
                          <span>{formatBDT(Number(payload[0]?.value) || 0)}</span>
                        </div>
                        {payload[0]?.payload?.orders !== undefined && (
                          <div className="flex items-center justify-between gap-4 text-muted-foreground font-medium mt-1">
                            <span>Orders:</span>
                            <span>{payload[0].payload.orders} placed</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fill="url(#revenueGlow)"
                dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 1, stroke: "#fff" }}
                activeDot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category or Status Distribution */}
      <div className="lg:col-span-4 rounded-2xl border border-border/80 bg-card p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-base font-bold text-foreground">Sales Distribution</h3>
            <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              By Category
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Volume breakdown across store departments</p>
        </div>

        {categoryData.length > 0 ? (
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/40" />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={75}
                  className="text-foreground font-medium truncate"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-border bg-popover/95 px-2.5 py-1.5 shadow-md backdrop-blur-xs text-xs font-bold">
                          {payload[0]?.payload?.name}: {formatBDT(Number(payload[0]?.value) || 0)}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {categoryData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 flex flex-col items-center justify-center text-center p-4 border border-dashed border-border rounded-xl">
            <p className="text-xs font-medium text-muted-foreground">No category sales recorded yet.</p>
          </div>
        )}

        <div className="mt-2 pt-3 border-t border-border/60 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          {categoryData.slice(0, 4).map((c, i) => (
            <div key={c.name} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
              />
              <span className="font-semibold text-foreground">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardChartsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="h-5 w-40 bg-muted rounded-md animate-pulse mb-2" />
        <div className="h-3 w-64 bg-muted/60 rounded-md animate-pulse mb-6" />
        <div className="h-72 bg-muted/30 rounded-xl animate-pulse flex items-center justify-center text-xs text-muted-foreground">
          Loading analytics...
        </div>
      </div>
      <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="h-5 w-32 bg-muted rounded-md animate-pulse mb-2" />
        <div className="h-3 w-48 bg-muted/60 rounded-md animate-pulse mb-6" />
        <div className="h-60 bg-muted/30 rounded-xl animate-pulse flex items-center justify-center text-xs text-muted-foreground">
          Loading breakdown...
        </div>
      </div>
    </div>
  );
}

export default DashboardCharts;
