"use client";

import { useState, useEffect, useMemo } from "react";
import { Palette, Sparkles } from "lucide-react";

interface ColorGradientPickerProps {
  value: string; // CSS color or gradient string e.g. "#9333ea" or "linear-gradient(135deg, #9333ea, #3b82f6)"
  onChange: (val: string) => void;
  label?: string;
  defaultColor?: string;
}

const COLOR_PRESETS = [
  { label: "Purple", color: "#9333ea" },
  { label: "Magenta", color: "#c026d3" },
  { label: "Navy Blue", color: "#1e3a8a" },
  { label: "Ocean Blue", color: "#0284c7" },
  { label: "Emerald Green", color: "#059669" },
  { label: "Amber Gold", color: "#d97706" },
  { label: "Fire Red", color: "#dc2626" },
  { label: "Dark Slate", color: "#0f172a" },
  { label: "Pure Black", color: "#000000" },
  { label: "Soft Gray", color: "#f8fafc" },
  { label: "Pure White", color: "#ffffff" },
];

const GRADIENT_PRESETS = [
  { label: "Purple Haze", val: "linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)" },
  { label: "Sunset Glow", val: "linear-gradient(135deg, #f97316 0%, #dc2626 100%)" },
  { label: "Ocean Teal", val: "linear-gradient(135deg, #059669 0%, #0284c7 100%)" },
  { label: "Midnight Sky", val: "linear-gradient(135deg, #0f172a 0%, #581c87 100%)" },
  { label: "Rose Gold", val: "linear-gradient(135deg, #e11d48 0%, #fb923c 100%)" },
  { label: "Emerald Luxury", val: "linear-gradient(135deg, #065f46 0%, #10b981 100%)" },
];

const ANGLES = [
  { label: "To Right →", angle: "90deg" },
  { label: "To Bottom ↓", angle: "180deg" },
  { label: "Diagonal ↘", angle: "135deg" },
  { label: "Diagonal ↗", angle: "45deg" },
];

export function ColorGradientPicker({
  value = "",
  onChange,
  label = "Background Color / Gradient",
  defaultColor = "#9333ea",
}: ColorGradientPickerProps) {
  const isGradient = (value || "").includes("gradient");

  const parsed = useMemo(() => {
    if (!isGradient) {
      return {
        mode: "solid" as const,
        color1: value || defaultColor,
        color2: "#3b82f6",
        angle: "135deg",
      };
    }

    const match = value.match(/linear-gradient\(([^,]+),\s*([^,\s]+)[^,]*,\s*([^,\s]+)/i);
    if (match) {
      return {
        mode: "gradient" as const,
        angle: match[1]?.trim() || "135deg",
        color1: match[2]?.trim() || defaultColor,
        color2: match[3]?.trim() || "#3b82f6",
      };
    }

    return {
      mode: "gradient" as const,
      angle: "135deg",
      color1: defaultColor,
      color2: "#3b82f6",
    };
  }, [value, isGradient, defaultColor]);

  const [mode, setMode] = useState<"solid" | "gradient">(parsed.mode);
  const [color1, setColor1] = useState(parsed.color1);
  const [color2, setColor2] = useState(parsed.color2);
  const [angle, setAngle] = useState(parsed.angle);

  useEffect(() => {
    setMode(parsed.mode);
    setColor1(parsed.color1);
    setColor2(parsed.color2);
    setAngle(parsed.angle);
  }, [parsed]);

  const handleModeToggle = (newMode: "solid" | "gradient") => {
    setMode(newMode);
    if (newMode === "solid") {
      onChange(color1 || defaultColor);
    } else {
      onChange(`linear-gradient(${angle}, ${color1 || defaultColor} 0%, ${color2 || "#3b82f6"} 100%)`);
    }
  };

  const handleColor1Change = (c: string) => {
    setColor1(c);
    if (mode === "solid") {
      onChange(c);
    } else {
      onChange(`linear-gradient(${angle}, ${c} 0%, ${color2} 100%)`);
    }
  };

  const handleColor2Change = (c: string) => {
    setColor2(c);
    onChange(`linear-gradient(${angle}, ${color1} 0%, ${c} 100%)`);
  };

  const handleAngleChange = (a: string) => {
    setAngle(a);
    onChange(`linear-gradient(${a}, ${color1} 0%, ${color2} 100%)`);
  };

  const handleReset = () => {
    setMode("solid");
    setColor1("");
    onChange("");
  };

  return (
    <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2.5 text-xs">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
          <Palette className="size-3.5 text-primary" />
          <span>{label}</span>
        </label>

        <div className="flex items-center gap-1 bg-background border border-border p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => handleModeToggle("solid")}
            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
              mode === "solid"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Solid
          </button>
          <button
            type="button"
            onClick={() => handleModeToggle("gradient")}
            className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors flex items-center gap-1 ${
              mode === "gradient"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="size-2.5" />
            <span>Gradient</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="h-8 flex-1 rounded-lg border border-border/80 shadow-xs transition-all relative overflow-hidden"
          style={{ background: value || defaultColor }}
        >
          {!value && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground font-semibold bg-background/50 backdrop-blur-xs">
              ডিফল্ট
            </div>
          )}
        </div>

        {value && (
          <button
            type="button"
            onClick={handleReset}
            className="text-[10px] px-2 py-1 rounded bg-background border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer"
            title="Reset to default"
          >
            রিসেট
          </button>
        )}
      </div>

      {mode === "solid" && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color1.startsWith("#") && color1.length === 7 ? color1 : defaultColor}
              onChange={(e) => handleColor1Change(e.target.value)}
              className="size-8 rounded border border-border cursor-pointer bg-transparent p-0.5 shrink-0"
            />
            <input
              type="text"
              value={color1}
              onChange={(e) => handleColor1Change(e.target.value)}
              placeholder={defaultColor}
              className="flex-1 h-8 px-2.5 bg-background border border-border rounded-md text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 items-center pt-1">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.color}
                type="button"
                title={p.label}
                onClick={() => handleColor1Change(p.color)}
                className={`size-5 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer ${
                  color1.toLowerCase() === p.color.toLowerCase()
                    ? "border-white ring-2 ring-primary scale-110"
                    : "border-border"
                }`}
                style={{ backgroundColor: p.color }}
              />
            ))}
          </div>
        </div>
      )}

      {mode === "gradient" && (
        <div className="space-y-2.5 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">রং ১ (Start)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={color1.startsWith("#") && color1.length === 7 ? color1 : defaultColor}
                  onChange={(e) => handleColor1Change(e.target.value)}
                  className="size-7 rounded border border-border cursor-pointer bg-transparent p-0.5 shrink-0"
                />
                <input
                  type="text"
                  value={color1}
                  onChange={(e) => handleColor1Change(e.target.value)}
                  className="w-full h-7 px-1.5 bg-background border border-border rounded text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">রং ২ (End)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={color2.startsWith("#") && color2.length === 7 ? color2 : "#3b82f6"}
                  onChange={(e) => handleColor2Change(e.target.value)}
                  className="size-7 rounded border border-border cursor-pointer bg-transparent p-0.5 shrink-0"
                />
                <input
                  type="text"
                  value={color2}
                  onChange={(e) => handleColor2Change(e.target.value)}
                  className="w-full h-7 px-1.5 bg-background border border-border rounded text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">ডিরেকশন / অ্যাঙ্গেল</label>
            <div className="grid grid-cols-2 gap-1.5">
              {ANGLES.map((ang) => (
                <button
                  key={ang.angle}
                  type="button"
                  onClick={() => handleAngleChange(ang.angle)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold border cursor-pointer transition-colors ${
                    angle === ang.angle
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {ang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">রেডিমেড গ্র্যাডিয়েন্ট প্রিসেট</label>
            <div className="grid grid-cols-3 gap-1.5">
              {GRADIENT_PRESETS.map((gp) => (
                <button
                  key={gp.label}
                  type="button"
                  onClick={() => onChange(gp.val)}
                  className="h-6 rounded-md border border-border/80 text-[9px] font-bold text-white shadow-2xs hover:scale-105 transition-transform cursor-pointer flex items-center justify-center truncate px-1 drop-shadow-xs"
                  style={{ background: gp.val }}
                >
                  {gp.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
