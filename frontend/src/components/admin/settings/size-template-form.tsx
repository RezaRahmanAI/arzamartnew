"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Columns3, ChevronUp, ChevronDown, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  createSizeTemplateAction,
  updateSizeTemplateAction,
  SizeTemplateDto,
  SizeTemplateColumnDto,
} from "@/actions/size-templates.actions";

export interface ColumnForm {
  key: string;
  id?: string;
  name: string;
}

export interface TemplateRowForm {
  size: string;
  measurements: Record<string, string>;
}

export function genKey() {
  return `c_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

export const TOPWEAR_PRESET_COLUMNS: string[] = ["Chest", "Length", "Waist", "Sleeve"];
export const BOTTOMWEAR_PRESET_COLUMNS: string[] = ["Waist", "Length", "Hip", "Inseam"];

export const TOPWEAR_DEFAULT_ROWS: TemplateRowForm[] = [
  { size: "M", measurements: { Chest: "38", Length: "27", Waist: "", Sleeve: "8" } },
  { size: "L", measurements: { Chest: "40", Length: "28", Waist: "", Sleeve: "8.5" } },
  { size: "XL", measurements: { Chest: "42", Length: "29", Waist: "", Sleeve: "9" } },
  { size: "XXL", measurements: { Chest: "44", Length: "30", Waist: "", Sleeve: "9.5" } },
];

export const BOTTOMWEAR_DEFAULT_ROWS: TemplateRowForm[] = [
  { size: "28", measurements: { Waist: "28", Length: "38", Hip: "36", Inseam: "12" } },
  { size: "30", measurements: { Waist: "30", Length: "39", Hip: "38", Inseam: "13" } },
  { size: "32", measurements: { Waist: "32", Length: "40", Hip: "40", Inseam: "14" } },
  { size: "34", measurements: { Waist: "34", Length: "41", Hip: "42", Inseam: "14.5" } },
  { size: "36", measurements: { Waist: "36", Length: "42", Hip: "44", Inseam: "15" } },
];

export interface SizeTemplateFormProps {
  initialTemplate?: SizeTemplateDto | null;
  initialType?: "topwear" | "bottomwear";
  backHref?: string;
}

export function SizeTemplateForm({
  initialTemplate = null,
  initialType = "topwear",
  backHref = "/admin/settings?tab=sizeTemplates",
}: SizeTemplateFormProps) {
  const router = useRouter();
  const editing = Boolean(initialTemplate?.id);

  const [templateType, setTemplateType] = useState<"topwear" | "bottomwear">(initialType);
  const [name, setName] = useState<string>(initialTemplate?.name || "");
  const [columns, setColumns] = useState<ColumnForm[]>(() => {
    if (initialTemplate?.columns && initialTemplate.columns.length > 0) {
      return initialTemplate.columns.map((c) => ({
        key: c.id || genKey(),
        id: c.id,
        name: c.name,
      }));
    }
    return TOPWEAR_PRESET_COLUMNS.map((n) => ({ key: genKey(), name: n }));
  });
  const [rows, setRows] = useState<TemplateRowForm[]>(() => {
    if (initialTemplate?.entries && initialTemplate.entries.length > 0) {
      const idToName = new Map<string, string>();
      for (const c of initialTemplate.columns) {
        if (c.id) idToName.set(c.id, c.name);
      }
      return initialTemplate.entries.map((e) => {
        const measurements: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.measurements || {})) {
          const name = idToName.get(k) || k;
          measurements[name.toLowerCase()] = v;
        }
        // Ensure all current columns have an entry
        for (const c of initialTemplate.columns) {
          const k = c.name.toLowerCase();
          if (!(k in measurements)) measurements[k] = "";
        }
        return { size: e.size, measurements };
      });
    }
    return TOPWEAR_DEFAULT_ROWS.map((r) => ({ size: r.size, measurements: { ...r.measurements } }));
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleTypeChange = (newType: "topwear" | "bottomwear") => {
    if (newType === templateType) return;
    setTemplateType(newType);
    if (!editing) {
      if (newType === "bottomwear") {
        setColumns(BOTTOMWEAR_PRESET_COLUMNS.map((n) => ({ key: genKey(), name: n })));
        setRows(BOTTOMWEAR_DEFAULT_ROWS.map((r) => ({ size: r.size, measurements: { ...r.measurements } })));
      } else {
        setColumns(TOPWEAR_PRESET_COLUMNS.map((n) => ({ key: genKey(), name: n })));
        setRows(TOPWEAR_DEFAULT_ROWS.map((r) => ({ size: r.size, measurements: { ...r.measurements } })));
      }
    }
  };

  const handleAddColumn = () => {
    setColumns((prev) => [...prev, { key: genKey(), name: "" }]);
  };

  const handleRemoveColumn = (key: string) => {
    setColumns((prev) => {
      if (prev.length <= 1) return prev;
      const removed = prev.find((c) => c.key === key);
      const next = prev.filter((c) => c.key !== key);
      if (removed?.name) {
        const removedKey = removed.name.toLowerCase();
        setRows((rprev) =>
          rprev.map((r) => {
            const m = { ...r.measurements };
            delete m[removedKey];
            return { ...r, measurements: m };
          }),
        );
      }
      return next;
    });
  };

  const handleColumnRename = (key: string, newName: string) => {
    setColumns((prev) => {
      const next = prev.map((c) => (c.key === key ? { ...c, name: newName } : c));
      const old = prev.find((c) => c.key === key);
      if (old && old.name.toLowerCase() !== newName.toLowerCase()) {
        const oldKey = old.name.toLowerCase();
        setRows((rprev) =>
          rprev.map((r) => {
            const m = { ...r.measurements };
            if (oldKey in m) {
              const value = m[oldKey];
              delete m[oldKey];
              m[newName.toLowerCase()] = value;
            }
            return { ...r, measurements: m };
          }),
        );
      }
      return next;
    });
  };

  const moveColumn = (key: string, dir: -1 | 1) => {
    setColumns((prev) => {
      const idx = prev.findIndex((c) => c.key === key);
      const nextIdx = idx + dir;
      if (idx < 0 || nextIdx < 0 || nextIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
      return next;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => {
      const empty: TemplateRowForm = { size: "", measurements: {} };
      for (const c of columns) empty.measurements[c.name.toLowerCase()] = "";
      return [...prev, empty];
    });
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowSizeChange = (index: number, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], size: value };
      return next;
    });
  };

  const handleCellChange = (rowIndex: number, columnName: string, value: string) => {
    const key = columnName.toLowerCase();
    setRows((prev) => {
      const next = [...prev];
      next[rowIndex] = {
        ...next[rowIndex],
        measurements: { ...next[rowIndex].measurements, [key]: value },
      };
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    const validColumns = columns.filter((c) => c.name.trim().length > 0);
    if (validColumns.length === 0) {
      toast.error("Please add at least one measurement column with a name");
      return;
    }

    const validEntries = rows.filter((r) => r.size.trim().length > 0);
    if (validEntries.length === 0) {
      toast.error("Please add at least one size row with a valid size name (e.g. M, L)");
      return;
    }

    const columnPayload: SizeTemplateColumnDto[] = validColumns.map((c, idx) => ({
      id: c.id,
      name: c.name.trim(),
      displayOrder: idx,
    }));

    const nameToIdMap = new Map<string, string>();
    validColumns.forEach((c, idx) => {
      const tempId = c.id || `__new_${idx}`;
      nameToIdMap.set(c.name.toLowerCase(), tempId);
    });

    const entryPayload = validEntries.map((r, idx) => {
      const measurements: Record<string, string> = {};
      for (const [key, v] of Object.entries(r.measurements)) {
        const trimmed = (v ?? "").toString().trim();
        if (!trimmed) continue;
        const mappedId = nameToIdMap.get(key.toLowerCase());
        if (!mappedId) continue;
        measurements[mappedId] = trimmed;
      }
      return {
        size: r.size.trim(),
        measurements,
        displayOrder: idx,
      };
    });

    try {
      setIsSaving(true);
      if (initialTemplate?.id) {
        const res = await updateSizeTemplateAction(initialTemplate.id, {
          name: name.trim(),
          columns: columnPayload,
          entries: entryPayload,
        });
        if (res.success) {
          toast.success(`Template "${name}" updated successfully!`);
          router.push(backHref);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to update size template");
        }
      } else {
        const res = await createSizeTemplateAction({
          name: name.trim(),
          columns: columnPayload,
          entries: entryPayload,
        });
        if (res.success) {
          toast.success(`Template "${name}" created successfully!`);
          router.push(backHref);
          router.refresh();
        } else {
          toast.error(res.error || "Failed to create size template");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push(backHref)}
          className="text-xs"
        >
          <ArrowLeft className="size-3.5 mr-1" /> Back to templates
        </Button>
      </div>

      {/* Template Type / Garment Preset Selector */}
      {!editing && (
        <div className="space-y-1.5 p-3 rounded-lg border border-border bg-secondary/30">
          <Label className="text-xs font-bold text-foreground">Garment Type / Preset</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange("topwear")}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                templateType === "topwear"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <span>👕 Topwear</span>
              <span className="text-[10px] font-normal opacity-85 hidden sm:inline">(Shirt, T-Shirt, Panjabi)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("bottomwear")}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                templateType === "bottomwear"
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <span>👖 Bottomwear (Pants)</span>
              <span className="text-[10px] font-normal opacity-85 hidden sm:inline">(Chinos, Jeans, Pajama)</span>
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            The preset only seeds defaults — you can rename, add, or remove columns below.
          </p>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="template-name" className="text-xs font-bold">
          Template Name *
        </Label>
        <Input
          id="template-name"
          placeholder={
            templateType === "topwear"
              ? "e.g. T-Shirt Standard, Panjabi Regular..."
              : "e.g. Chinos Pants, Slim Fit Denim, Pajama..."
          }
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 text-xs"
          required
        />
      </div>

      {/* Editable Columns Header Row */}
      <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Columns3 className="size-3.5" /> Measurement Columns
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Click a column header to rename. Use the arrows to reorder, and the trash icon to remove.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddColumn}
            className="h-7 text-xs font-semibold"
          >
            <Plus className="size-3 mr-1" /> Add Column
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-2 rounded-md bg-background/60 border border-dashed">
          {columns.map((col, idx) => (
            <div
              key={col.key}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-card shadow-xs"
            >
              <span className="text-[10px] text-muted-foreground font-mono">{idx + 1}.</span>
              <Input
                value={col.name}
                onChange={(e) => handleColumnRename(col.key, e.target.value)}
                placeholder="Column name"
                className="h-7 w-32 text-xs font-bold border-0 bg-transparent px-1 focus-visible:ring-1"
              />
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => moveColumn(col.key, -1)}
                  disabled={idx === 0}
                  className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move left"
                >
                  <ChevronUp className="size-3.5 rotate-[-90deg]" />
                </button>
                <button
                  type="button"
                  onClick={() => moveColumn(col.key, 1)}
                  disabled={idx === columns.length - 1}
                  className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move right"
                >
                  <ChevronDown className="size-3.5 rotate-[-90deg]" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveColumn(col.key)}
                  disabled={columns.length <= 1}
                  className="p-1 rounded text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Remove column"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Sizes Table */}
      <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-bold text-foreground">Sizes</Label>
            <p className="text-[11px] text-muted-foreground">
              Enter the value (in inches) for each measurement column per size.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="h-7 text-xs font-semibold"
          >
            <Plus className="size-3 mr-1" /> Add Size Row
          </Button>
        </div>

        <div className="overflow-x-auto">
          <div
            className="grid gap-2 items-center text-[11px] font-bold text-muted-foreground px-1 min-w-max"
            style={{
              gridTemplateColumns: `120px repeat(${columns.length}, minmax(100px, 1fr)) 40px`,
            }}
          >
            <div>Size *</div>
            {columns.map((col) => (
              <div key={`hdr-${col.key}`}>{col.name.trim() || <em className="opacity-50">Unnamed</em>}</div>
            ))}
            <div className="text-right">Action</div>
          </div>

          <div className="space-y-2 mt-2">
            {rows.map((row, idx) => (
              <div
                key={`row-${idx}`}
                className="grid gap-2 items-center min-w-max"
                style={{
                  gridTemplateColumns: `120px repeat(${columns.length}, minmax(100px, 1fr)) 40px`,
                }}
              >
                <Input
                  placeholder={templateType === "topwear" ? "M" : "32"}
                  value={row.size}
                  onChange={(e) => handleRowSizeChange(idx, e.target.value)}
                  className="h-8 text-xs font-bold"
                  required
                />
                {columns.map((col) => {
                  const key = col.name.toLowerCase();
                  return (
                    <Input
                      key={`cell-${idx}-${col.key}`}
                      placeholder=""
                      value={row.measurements[key] ?? ""}
                      onChange={(e) => handleCellChange(idx, col.name, e.target.value)}
                      className="h-8 text-xs"
                      disabled={!col.name.trim()}
                    />
                  );
                })}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRow(idx)}
                  disabled={rows.length <= 1}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  title="Remove row"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push(backHref)}
          disabled={isSaving}
          className="text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSaving}
          className="text-xs font-bold bg-primary text-primary-foreground"
        >
          <Save className="size-3.5 mr-1" />
          {isSaving ? "Saving..." : editing ? "Save Changes" : "Create Template"}
        </Button>
      </div>
    </form>
  );
}
