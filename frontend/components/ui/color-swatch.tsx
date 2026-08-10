"use client";

import { getColorHex } from "@/lib/shop-data";

interface ColorSwatchesProps {
  colors: string[];
  selectedColor?: string;
  onSelectColor?: (color: string) => void;
  size?: "sm" | "md" | "lg";
  showNames?: boolean;
}

export function ColorSwatches({
  colors,
  selectedColor,
  onSelectColor,
  size = "md",
  showNames = false,
}: ColorSwatchesProps) {
  if (!colors || colors.length === 0) return null;

  const sizeClasses = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
  }[size];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {colors.map((color) => {
        const hex = getColorHex(color);
        const isSelected = selectedColor === color;
        return (
          <button
            key={color}
            type="button"
            title={color}
            onClick={() => onSelectColor?.(color)}
            disabled={!onSelectColor}
            className={`group relative flex items-center justify-center rounded-full border transition-all ${sizeClasses} ${
              onSelectColor ? "cursor-pointer hover:scale-110" : "cursor-default"
            } ${
              isSelected
                ? "ring-2 ring-primary ring-offset-2 border-primary shadow-sm"
                : "border-border/80 hover:border-primary/50"
            }`}
            style={{ backgroundColor: hex }}
          >
            {/* White inner border indicator if background is white/light */}
            {(hex === "#ffffff" || hex.toLowerCase() === "#fff" || hex === "#fef9c3") && (
              <span className="absolute inset-0 rounded-full border border-black/20" />
            )}

            {/* Hover Tooltip showing color name/code */}
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] font-bold text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-30">
              {color}
            </span>
          </button>
        );
      })}
      {showNames && (
        <span className="ml-1 text-xs text-muted-foreground">
          ({colors.join(", ")})
        </span>
      )}
    </div>
  );
}
