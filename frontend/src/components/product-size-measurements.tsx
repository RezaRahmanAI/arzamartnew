"use client";

import React from "react";
import { Ruler, Sparkles } from "lucide-react";

export interface SizeMeasurementInfo {
  chest?: string | null;
  length?: string | null;
  waist?: string | null;
  sleeve?: string | null;
}

interface ProductSizeMeasurementsProps {
  selectedSize: string;
  measurements?: SizeMeasurementInfo | null;
  className?: string;
}

export function ProductSizeMeasurements({
  selectedSize,
  measurements,
  className = "",
}: ProductSizeMeasurementsProps) {
  // If no measurements available at all for this size
  const hasAnyMeasurement = Boolean(
    measurements &&
      (measurements.chest?.trim() ||
        measurements.length?.trim() ||
        measurements.waist?.trim() ||
        measurements.sleeve?.trim())
  );

  return (
    <div className={`mt-3 overflow-hidden ${className}`}>
      {hasAnyMeasurement ? (
        <div
          key={selectedSize}
          className="rounded-xl border border-border/80 bg-secondary/30 p-3 shadow-xs animate-in fade-in-50 slide-in-from-top-1 duration-200 transition-all"
        >
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Ruler className="size-3.5 text-primary" />
              <span>Exact Measurements for Size {selectedSize}</span>
            </div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-background/80 px-2 py-0.5 rounded border border-border/40">
              Inches (&quot;)
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {measurements?.chest && (
              <div className="rounded-lg bg-background/90 p-2 border border-border/40 shadow-xs flex flex-col justify-center">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  Chest (বুকে)
                </span>
                <span className="text-sm font-extrabold text-foreground mt-0.5">
                  {measurements.chest}&quot;
                </span>
              </div>
            )}

            {measurements?.length && (
              <div className="rounded-lg bg-background/90 p-2 border border-border/40 shadow-xs flex flex-col justify-center">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  Length (দৈর্ঘ্য)
                </span>
                <span className="text-sm font-extrabold text-foreground mt-0.5">
                  {measurements.length}&quot;
                </span>
              </div>
            )}

            {measurements?.waist && (
              <div className="rounded-lg bg-background/90 p-2 border border-border/40 shadow-xs flex flex-col justify-center">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  Waist (কোমর)
                </span>
                <span className="text-sm font-extrabold text-foreground mt-0.5">
                  {measurements.waist}&quot;
                </span>
              </div>
            )}

            {measurements?.sleeve && (
              <div className="rounded-lg bg-background/90 p-2 border border-border/40 shadow-xs flex flex-col justify-center">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  Sleeve (হাতা)
                </span>
                <span className="text-sm font-extrabold text-foreground mt-0.5">
                  {measurements.sleeve}&quot;
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/60 bg-secondary/10 px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="size-3 text-muted-foreground/60 shrink-0" />
          <span>Standard sizing applies for size {selectedSize}. Exact dimensions not specified.</span>
        </div>
      )}
    </div>
  );
}
