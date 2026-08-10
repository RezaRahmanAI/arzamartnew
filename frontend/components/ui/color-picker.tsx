"use client";

import { useState } from "react";
import { Check, Plus, X, Palette } from "lucide-react";
import { getColorHex } from "@/lib/shop-data";

// W3Schools style Hexagonal Grid Color Palette
export const HEXAGON_GRID_COLORS = [
  // Row 1 - Darks & Blues
  "#000511", "#021024", "#051630", "#0b2545", "#13315c", "#1e40af", "#2563eb", "#3b82f6", "#60a5fa",
  // Row 2 - Deep Blues & Cyan
  "#0f172a", "#1e293b", "#334155", "#0284c7", "#0369a1", "#0891b2", "#06b6d4", "#22d3ee", "#67e8f9",
  // Row 3 - Greens & Emeralds
  "#064e3b", "#047857", "#059669", "#10b981", "#34d399", "#16a34a", "#22c55e", "#4ade80", "#86efac",
  // Row 4 - Yellows & Amber
  "#713f12", "#854d0e", "#a16207", "#ca8a04", "#eab308", "#facc15", "#fde047", "#fef08a", "#fef9c3",
  // Row 5 - Oranges & Reds
  "#7c2d12", "#9a3412", "#c2410c", "#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa", "#ffedd5",
  // Row 6 - Deep Reds & Crimsons
  "#450a0a", "#7f1d1d", "#991b1b", "#b91c1c", "#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fecaca",
  // Row 7 - Pinks & Purples
  "#500724", "#831843", "#9d174d", "#be185d", "#db2777", "#ec4899", "#f472b6", "#f43f5e", "#fda4af",
  // Row 8 - Deep Purples & Violets
  "#3b0764", "#581c87", "#6b21a8", "#7e22ce", "#9333ea", "#a855f7", "#c084fc", "#e879f9", "#f0abfc",
  // Row 9 - Neutrals, Charcoal & Whites
  "#000000", "#18181b", "#27272a", "#3f3f46", "#52525b", "#71717a", "#a1a1aa", "#d4d4d8", "#e4e4e7", "#ffffff"
];

interface ColorPickerProps {
  selectedColors: string[];
  onChange: (colors: string[]) => void;
}

export function W3ColorPicker({ selectedColors, onChange }: ColorPickerProps) {
  const [customColorInput, setCustomColorInput] = useState("");
  const [activeHex, setActiveHex] = useState("#dc2626");

  const addColor = (color: string) => {
    if (!color) return;
    const trimmed = color.trim();
    if (!selectedColors.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...selectedColors, trimmed]);
    }
  };

  const removeColor = (colorToRemove: string) => {
    onChange(selectedColors.filter((c) => c !== colorToRemove));
  };

  const handleCustomAdd = () => {
    if (customColorInput.trim()) {
      addColor(customColorInput);
      setCustomColorInput("");
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* 1. Header & Active Pick Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Palette className="size-4 text-primary" />
          <span>Pick a Color</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Selected Code:</span>
          <span
            className="size-5 rounded-full border border-border shadow-sm inline-block"
            style={{ backgroundColor: getColorHex(activeHex) }}
          />
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs font-bold text-foreground">
            {activeHex}
          </code>
        </div>
      </div>

      {/* 2. W3Schools Honeycomb / Grid Color Palette */}
      <div className="mx-auto max-w-md">
        <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">
          Click any color cell below to select:
        </p>
        <div className="flex flex-wrap justify-center gap-1.5 rounded-lg border border-border/80 bg-secondary/30 p-3">
          {HEXAGON_GRID_COLORS.map((hex) => {
            const isSelected = selectedColors.some(
              (c) => c.toLowerCase() === hex.toLowerCase()
            );
            return (
              <button
                key={hex}
                type="button"
                title={hex}
                onClick={() => {
                  setActiveHex(hex);
                  addColor(hex);
                }}
                className={`relative size-6 cursor-pointer rounded-md border transition-transform hover:scale-125 hover:z-10 ${
                  isSelected
                    ? "ring-2 ring-primary ring-offset-1 border-white"
                    : "border-black/10 hover:border-white"
                }`}
                style={{ backgroundColor: hex }}
              >
                {isSelected && (
                  <Check
                    className={`size-3 mx-auto ${
                      hex === "#ffffff" || hex === "#fef9c3" || hex === "#e4e4e7"
                        ? "text-black"
                        : "text-white"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. "Or Enter a Color" Manual Input Section */}
      <div className="pt-2 border-t border-border">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Or Enter a Color:
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="e.g. #FF0000, Black, Navy, Maroon"
              value={customColorInput}
              onChange={(e) => setCustomColorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCustomAdd();
                }
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {customColorInput && (
              <span
                className="absolute right-2.5 top-2.5 size-4 rounded-full border border-border shadow-sm"
                style={{ backgroundColor: getColorHex(customColorInput) }}
              />
            )}
          </div>

          <div className="flex items-center gap-1">
            <input
              type="color"
              value={activeHex}
              onChange={(e) => {
                setActiveHex(e.target.value);
                addColor(e.target.value);
              }}
              className="size-9 cursor-pointer rounded-md border border-input p-0.5 bg-background"
              title="Native Color Picker"
            />

            <button
              type="button"
              onClick={handleCustomAdd}
              className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground hover:opacity-90 cursor-pointer"
            >
              <Plus className="size-3.5" />
              OK
            </button>
          </div>
        </div>
      </div>

      {/* 4. Selected Color Badges List */}
      {selectedColors.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Selected Colors ({selectedColors.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedColors.map((color) => (
              <span
                key={color}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-semibold text-foreground shadow-sm"
              >
                <span
                  className="size-3.5 rounded-full border border-border shadow-sm"
                  style={{ backgroundColor: getColorHex(color) }}
                />
                <span>{color}</span>
                <button
                  type="button"
                  onClick={() => removeColor(color)}
                  className="rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive cursor-pointer"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
