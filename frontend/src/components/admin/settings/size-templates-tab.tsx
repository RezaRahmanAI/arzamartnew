"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Ruler,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  X,
  AlertCircle,
  PackageCheck,
  ChevronUp,
  ChevronDown,
  Columns3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getSizeTemplatesAction,
  createSizeTemplateAction,
  updateSizeTemplateAction,
  deleteSizeTemplateAction,
  SizeTemplateDto,
  SizeTemplateColumnDto,
} from "@/actions/size-templates.actions";

interface ColumnForm {
  key: string; // local UI key (for React keys)
  id?: string; // server-side id when editing existing columns
  name: string;
}

interface TemplateRowForm {
  size: string;
  measurements: Record<string, string>; // key = column id (when known) or column name (lower-cased)
}

function genKey() {
  return `c_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

const TOPWEAR_PRESET_COLUMNS: string[] = ["Chest", "Length", "Waist", "Sleeve"];
const BOTTOMWEAR_PRESET_COLUMNS: string[] = ["Waist", "Length", "Hip", "Inseam"];

const TOPWEAR_DEFAULT_ROWS: TemplateRowForm[] = [
  { size: "M", measurements: { Chest: "38", Length: "27", Waist: "", Sleeve: "8" } },
  { size: "L", measurements: { Chest: "40", Length: "28", Waist: "", Sleeve: "8.5" } },
  { size: "XL", measurements: { Chest: "42", Length: "29", Waist: "", Sleeve: "9" } },
  { size: "XXL", measurements: { Chest: "44", Length: "30", Waist: "", Sleeve: "9.5" } },
];

const BOTTOMWEAR_DEFAULT_ROWS: TemplateRowForm[] = [
  { size: "28", measurements: { Waist: "28", Length: "38", Hip: "36", Inseam: "12" } },
  { size: "30", measurements: { Waist: "30", Length: "39", Hip: "38", Inseam: "13" } },
  { size: "32", measurements: { Waist: "32", Length: "40", Hip: "40", Inseam: "14" } },
  { size: "34", measurements: { Waist: "34", Length: "41", Hip: "42", Inseam: "14.5" } },
  { size: "36", measurements: { Waist: "36", Length: "42", Hip: "44", Inseam: "15" } },
];

export function isBottomwearCategory(nameOrCategory?: string | null): boolean {
  if (!nameOrCategory) return false;
  const c = nameOrCategory.toLowerCase();
  return (
    c.includes("pant") ||
    c.includes("bottom") ||
    c.includes("chino") ||
    c.includes("denim") ||
    c.includes("jeans") ||
    c.includes("trouser") ||
    c.includes("palazzo") ||
    c.includes("pajama") ||
    c.includes("jogger") ||
    c.includes("boxer") ||
    c.includes("pantaloons")
  );
}

export function isBottomwearTemplate(template: SizeTemplateDto | null | undefined): boolean {
  if (!template) return false;
  if (isBottomwearCategory(template.name)) return true;
  return false;
}

export function SizeTemplatesTab() {
  const [templates, setTemplates] = useState<SizeTemplateDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<SizeTemplateDto | null>(null);
  const [templateType, setTemplateType] = useState<"topwear" | "bottomwear">("topwear");
  const [name, setName] = useState<string>("");
  const [columns, setColumns] = useState<ColumnForm[]>([]);
  const [rows, setRows] = useState<TemplateRowForm[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete State
  const [templateToDelete, setTemplateToDelete] = useState<SizeTemplateDto | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await getSizeTemplatesAction();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load size templates:", err);
      toast.error("Failed to load size templates");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase().trim();
    return templates.filter((t) => t.name.toLowerCase().includes(q));
  }, [templates, searchQuery]);

  const initColumns = (presetNames: string[]): ColumnForm[] =>
    presetNames.map((n) => ({ key: genKey(), name: n }));

  const initRows = (defaults: TemplateRowForm[]): TemplateRowForm[] =>
    defaults.map((r) => ({ size: r.size, measurements: { ...r.measurements } }));

  const openCreateModal = () => {
    setEditingTemplate(null);
    setTemplateType("topwear");
    setName("");
    setColumns(initColumns(TOPWEAR_PRESET_COLUMNS));
    setRows(initRows(TOPWEAR_DEFAULT_ROWS));
    setIsModalOpen(true);
  };

  const handleTypeChange = (newType: "topwear" | "bottomwear") => {
    if (newType === templateType) return;
    setTemplateType(newType);
    if (!editingTemplate) {
      if (newType === "bottomwear") {
        setColumns(initColumns(BOTTOMWEAR_PRESET_COLUMNS));
        setRows(initRows(BOTTOMWEAR_DEFAULT_ROWS));
      } else {
        setColumns(initColumns(TOPWEAR_PRESET_COLUMNS));
        setRows(initRows(TOPWEAR_DEFAULT_ROWS));
      }
    }
  };

  const openEditModal = (t: SizeTemplateDto) => {
    setEditingTemplate(t);
    const isBottom = isBottomwearTemplate(t);
    setTemplateType(isBottom ? "bottomwear" : "topwear");
    setName(t.name);

    const loadedColumns: ColumnForm[] =
      t.columns && t.columns.length > 0
        ? t.columns.map((c: SizeTemplateColumnDto) => ({
            key: c.id || genKey(),
            id: c.id,
            name: c.name,
          }))
        : initColumns(isBottom ? BOTTOMWEAR_PRESET_COLUMNS : TOPWEAR_PRESET_COLUMNS);

    setColumns(loadedColumns);

    const columnNameKeys = loadedColumns.map((c) => c.name.toLowerCase());

    const loadedRows: TemplateRowForm[] =
      t.entries && t.entries.length > 0
        ? t.entries.map((e) => {
            // Map server measurements keyed by column id back to column name keys for editing UI
            const idToName = new Map<string, string>();
            for (const c of t.columns) {
              if (c.id) idToName.set(c.id, c.name);
            }
            const measurements: Record<string, string> = {};
            for (const [k, v] of Object.entries(e.measurements || {})) {
              const name = idToName.get(k) || k;
              measurements[name] = v;
            }
            // Ensure all current columns have at least an empty entry for display
            for (const cname of columnNameKeys) {
              if (!(cname in measurements)) measurements[cname] = "";
            }
            return { size: e.size, measurements };
          })
        : initRows(isBottom ? BOTTOMWEAR_DEFAULT_ROWS : TOPWEAR_DEFAULT_ROWS);

    setRows(loadedRows);
    setIsModalOpen(true);
  };

  // ---- Column handlers ----
  const handleAddColumn = () => {
    setColumns((prev) => [...prev, { key: genKey(), name: "" }]);
  };

  const handleRemoveColumn = (key: string) => {
    setColumns((prev) => {
      if (prev.length <= 1) return prev;
      const removed = prev.find((c) => c.key === key);
      const next = prev.filter((c) => c.key !== key);
      // Remove this column's measurement value from every row
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
      // Rename measurement key in all rows to follow column rename
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

  // ---- Row handlers ----
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

  const handleSaveTemplate = async (e: React.FormEvent) => {
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

    // Build name->newColumnId mapping locally for client measurement keys
    const nameToIdMap = new Map<string, string>();
    validColumns.forEach((c, idx) => {
      // Use a stable temporary id derived from index for new (unsaved) columns
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
      if (editingTemplate) {
        const res = await updateSizeTemplateAction(editingTemplate.id, {
          name: name.trim(),
          columns: columnPayload,
          entries: entryPayload,
        });
        if (res.success) {
          toast.success(`Template "${name}" updated successfully!`);
          setIsModalOpen(false);
          loadTemplates();
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
          setIsModalOpen(false);
          loadTemplates();
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

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      setIsDeleting(true);
      const res = await deleteSizeTemplateAction(templateToDelete.id);
      if (res.success) {
        toast.success(`Template "${templateToDelete.name}" deleted successfully!`);
        setTemplateToDelete(null);
        loadTemplates();
      } else {
        toast.error(res.error || "Failed to delete size template");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete size template");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <Ruler className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Size Measurement Templates</h3>
            <p className="text-xs text-muted-foreground">
              Create and manage size measurement templates. Add, rename, reorder, or remove columns as needed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadTemplates}
            disabled={isLoading}
            className="h-9 text-xs"
          >
            <RefreshCw className={`size-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={openCreateModal}
            className="h-9 text-xs bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90"
          >
            <Plus className="size-3.5 mr-1.5" />
            New Size Template
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search templates by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-xs"
        />
      </div>

      {/* Templates Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground text-xs">
            <RefreshCw className="size-5 animate-spin mr-2 text-primary" /> Loading templates...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <Ruler className="size-8 mx-auto opacity-40 text-primary" />
            <p className="text-sm font-semibold text-foreground">No size templates found</p>
            <p className="text-xs">
              {searchQuery
                ? `No templates match "${searchQuery}".`
                : "Create your first size template to speed up product entry."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openCreateModal}
              className="mt-2 text-xs"
            >
              <Plus className="size-3.5 mr-1" /> Create Template
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-bold">Template Name</TableHead>
                <TableHead className="text-xs font-bold">Sizes Defined</TableHead>
                <TableHead className="text-xs font-bold">Measurements Preview</TableHead>
                <TableHead className="text-center text-xs font-bold">Products Using</TableHead>
                <TableHead className="text-right text-xs font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/30">
                  <TableCell className="font-semibold text-xs text-foreground">
                    <span className="font-bold text-foreground block">{t.name}</span>
                    {t.columns.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        Columns: {t.columns.map((c) => c.name).join(" · ")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {t.entries.map((e, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20"
                        >
                          {e.size}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[11px] text-muted-foreground space-y-0.5 font-mono">
                      {t.entries.slice(0, 3).map((e, idx) => {
                        const parts = t.columns
                          .map((c) => {
                            const v = e.measurements?.[c.id || ""];
                            return v ? `${c.name} ${v}"` : null;
                          })
                          .filter(Boolean);
                        return (
                          <span key={idx} className="block truncate">
                            <strong className="text-foreground">{e.size}:</strong>{" "}
                            {parts.length > 0 ? parts.join(" · ") : <em className="opacity-60">no measurements</em>}
                          </span>
                        );
                      })}
                      {t.entries.length > 3 && (
                        <span className="text-[10px] text-muted-foreground/70 italic">
                          +{t.entries.length - 3} more sizes...
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                      <PackageCheck className="size-3" />
                      {t.productCount ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(t)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        title="Edit Size Template"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTemplateToDelete(t)}
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        title="Delete Size Template"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Ruler className="size-5 text-primary" />
              <span>{editingTemplate ? "Edit Size Template" : "Create New Size Template"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define size measurements (in inches) for this category. You can rename, add, remove, or reorder columns freely.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTemplate} className="space-y-4 pt-2">
            {/* Template Type / Garment Preset Selector */}
            {!editingTemplate && (
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

            <DialogFooter className="pt-2 border-t flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
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
                {isSaving ? "Saving..." : editingTemplate ? "Save Changes" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={!!templateToDelete}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 text-base">
              <Trash2 className="size-5" />
              <span>Delete Size Template?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground space-y-2 pt-2">
              <p>
                Are you sure you want to delete template{" "}
                <strong className="text-foreground">&quot;{templateToDelete?.name}&quot;</strong>?
              </p>
              <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/80 text-[11px] space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1">
                  <AlertCircle className="size-3.5 text-primary" /> Safe Deletion Policy:
                </span>
                <p>
                  Any products that previously applied this template will <strong>NOT</strong> lose their
                  measurements. Values were copied directly onto the product records at application time.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTemplateToDelete(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteTemplate}
              disabled={isDeleting}
              className="text-xs font-bold"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}