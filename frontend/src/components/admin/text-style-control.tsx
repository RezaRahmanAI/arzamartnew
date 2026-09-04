"use client";

import { useState } from "react";
import { Type, Bold, Sliders } from "lucide-react";

export interface TextStyleValue {
  fontFamily?: "sans" | "serif" | "mono" | "display";
  fontSize?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  fontWeight?: "normal" | "medium" | "semibold" | "bold" | "black";
  color?: string;
  opacity?: number; // 0 to 100
}

interface TextStyleControlProps {
  label?: string;
  value?: TextStyleValue;
  onChange: (val: TextStyleValue) => void;
}

const FONT_FAMILIES = [
  { label: "Default Sans", value: "sans" },
  { label: "Display Serif", value: "serif" },
  { label: "Monospace", value: "mono" },
];

const FONT_SIZES = [
  { label: "XS", value: "xs" },
  { label: "SM", value: "sm" },
  { label: "Base", value: "base" },
  { label: "LG", value: "lg" },
  { label: "XL", value: "xl" },
  { label: "2XL", value: "2xl" },
  { label: "3XL", value: "3xl" },
];

const FONT_WEIGHTS = [
  { label: "Regular", value: "normal" },
  { label: "Medium", value: "medium" },
  { label: "SemiBold", value: "semibold" },
  { label: "Bold", value: "bold" },
  { label: "Black", value: "black" },
];

export function TextStyleControl({
  label = "টাইপোগ্রাফি ও টেক্সট স্টাইল",
  value = {},
  onChange,
}: TextStyleControlProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentFamily = value.fontFamily || "sans";
  const currentSize = value.fontSize || "base";
  const currentWeight = value.fontWeight || "normal";
  const currentColor = value.color || "#ffffff";
  const currentOpacity = value.opacity ?? 100;

  const update = (patch: Partial<TextStyleValue>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="rounded-lg border border-border bg-background/50 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2.5 py-1.5 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Type className="size-3 text-primary" />
          <span>{label}</span>
        </span>
        <span className="text-[10px] text-primary font-mono font-semibold">
          {isOpen ? "বন্ধ করুন" : "স্টাইল পরিবর্তন"}
        </span>
      </button>

      {isOpen && (
        <div className="p-2.5 border-t border-border space-y-2.5 bg-muted/10 animate-in fade-in-50">
          {/* Font Family */}
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-semibold">ফন্ট ফ্যামিলি</label>
            <div className="flex gap-1">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => update({ fontFamily: f.value as TextStyleValue["fontFamily"] })}
                  className={`flex-1 py-1 px-1.5 rounded text-[10px] border cursor-pointer transition-colors ${
                    currentFamily === f.value
                      ? "bg-primary text-primary-foreground border-primary font-bold"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size & Weight */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-semibold">ফন্ট সাইজ</label>
              <select
                value={currentSize}
                onChange={(e) => update({ fontSize: e.target.value as TextStyleValue["fontSize"] })}
                className="w-full h-7 px-2 bg-background border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {FONT_SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <Bold className="size-2.5" />
                <span>ফন্ট ওয়েট</span>
              </label>
              <select
                value={currentWeight}
                onChange={(e) => update({ fontWeight: e.target.value as TextStyleValue["fontWeight"] })}
                className="w-full h-7 px-2 bg-background border border-border rounded text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {FONT_WEIGHTS.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Color & Opacity */}
          <div className="grid grid-cols-2 gap-2 pt-1 items-end">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-semibold">টেক্সট কালার</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={currentColor.startsWith("#") && currentColor.length === 7 ? currentColor : "#ffffff"}
                  onChange={(e) => update({ color: e.target.value })}
                  className="size-7 rounded border border-border cursor-pointer bg-transparent p-0.5 shrink-0"
                />
                <input
                  type="text"
                  value={currentColor}
                  onChange={(e) => update({ color: e.target.value })}
                  className="w-full h-7 px-1.5 bg-background border border-border rounded text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                <span>অদৃশ্যতা (Opacity)</span>
                <span>{currentOpacity}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={currentOpacity}
                onChange={(e) => update({ opacity: Number(e.target.value) })}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
