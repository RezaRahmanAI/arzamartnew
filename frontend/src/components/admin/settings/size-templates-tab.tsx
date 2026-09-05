"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Ruler,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Check,
  X,
  AlertCircle,
  PackageCheck,
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
  SizeTemplateEntryDto,
} from "@/actions/size-templates.actions";

interface TemplateRowForm {
  size: string;
  chest: string;
  length: string;
  waist: string;
  sleeve: string;
}

const TOPWEAR_DEFAULTS: TemplateRowForm[] = [
  { size: "M", chest: "38", length: "27", waist: "", sleeve: "8" },
  { size: "L", chest: "40", length: "28", waist: "", sleeve: "8.5" },
  { size: "XL", chest: "42", length: "29", waist: "", sleeve: "9" },
  { size: "XXL", chest: "44", length: "30", waist: "", sleeve: "9.5" },
];

const BOTTOMWEAR_DEFAULTS: TemplateRowForm[] = [
  { size: "28", waist: "28", length: "38", chest: "36", sleeve: "12" },
  { size: "30", waist: "30", length: "39", chest: "38", sleeve: "13" },
  { size: "32", waist: "32", length: "40", chest: "40", sleeve: "14" },
  { size: "34", waist: "34", length: "41", chest: "42", sleeve: "14.5" },
  { size: "36", waist: "36", length: "42", chest: "44", sleeve: "15" },
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
  // If waist is populated on entries but chest is absent or smaller, or pants sizes like numeric 28, 30, 32
  const firstEntry = template.entries?.[0];
  if (firstEntry?.waist && !firstEntry?.chest) return true;
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
  const [rows, setRows] = useState<TemplateRowForm[]>(TOPWEAR_DEFAULTS);
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

  const openCreateModal = () => {
    setEditingTemplate(null);
    setTemplateType("topwear");
    setName("");
    setRows(TOPWEAR_DEFAULTS);
    setIsModalOpen(true);
  };

  const handleTypeChange = (newType: "topwear" | "bottomwear") => {
    if (newType === templateType) return;
    setTemplateType(newType);
    if (!editingTemplate) {
      if (newType === "bottomwear") {
        setRows(BOTTOMWEAR_DEFAULTS);
      } else {
        setRows(TOPWEAR_DEFAULTS);
      }
    }
  };

  const openEditModal = (t: SizeTemplateDto) => {
    setEditingTemplate(t);
    const isBottom = isBottomwearTemplate(t);
    setTemplateType(isBottom ? "bottomwear" : "topwear");
    setName(t.name);
    const mappedRows: TemplateRowForm[] = (t.entries || []).map((e) => ({
      size: e.size,
      chest: e.chest || "",
      length: e.length || "",
      waist: e.waist || "",
      sleeve: e.sleeve || "",
    }));
    setRows(mappedRows.length > 0 ? mappedRows : isBottom ? BOTTOMWEAR_DEFAULTS : TOPWEAR_DEFAULTS);
    setIsModalOpen(true);
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, { size: "", chest: "", length: "", waist: "", sleeve: "" }]);
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: keyof TemplateRowForm, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }

    const validEntries = rows
      .filter((r) => r.size.trim().length > 0)
      .map((r, idx) => ({
        size: r.size.trim(),
        chest: r.chest.trim() || undefined,
        length: r.length.trim() || undefined,
        waist: r.waist.trim() || undefined,
        sleeve: r.sleeve.trim() || undefined,
        displayOrder: idx,
      }));

    if (validEntries.length === 0) {
      toast.error("Please add at least one size row with a valid size name (e.g. M, L)");
      return;
    }

    try {
      setIsSaving(true);
      if (editingTemplate) {
        const res = await updateSizeTemplateAction(editingTemplate.id, {
          name: name.trim(),
          entries: validEntries,
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
          entries: validEntries,
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
              Create and manage standard size measurement templates (Chest, Length, Waist) by category.
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
                      {(() => {
                        const isBottom = isBottomwearTemplate(t);
                        return t.entries.slice(0, 3).map((e, idx) => (
                          <span key={idx} className="block truncate">
                            <strong className="text-foreground">{e.size}:</strong>{" "}
                            {isBottom ? (
                              <>
                                {e.waist ? `Waist ${e.waist}"` : ""} {e.length ? `Len ${e.length}"` : ""} {e.chest ? `Hip ${e.chest}"` : ""}
                              </>
                            ) : (
                              <>
                                {e.chest ? `Chest ${e.chest}"` : ""} {e.length ? `Len ${e.length}"` : ""} {e.waist ? `Waist ${e.waist}"` : ""}
                              </>
                            )}
                          </span>
                        ));
                      })()}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Ruler className="size-5 text-primary" />
              <span>{editingTemplate ? "Edit Size Template" : "Create New Size Template"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define standard chest, length, waist, and sleeve measurements (in inches) for each size in this category.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTemplate} className="space-y-4 pt-2">
            {/* Template Type / Garment Preset Selector */}
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
                {templateType === "topwear"
                  ? "Topwear uses: Chest, Length, Waist, Sleeve measurements."
                  : "Bottomwear uses: Waist, Length, Hip / Thigh, and Inseam / Mohori measurements."}
              </p>
            </div>

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

            {/* Dynamic Sizes Table */}
            <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground">
                    {templateType === "topwear" ? "Topwear Measurements (Inches)" : "Pants / Bottomwear Measurements (Inches)"}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {templateType === "topwear"
                      ? "Specify Chest, Length, Waist, and Sleeve for each size."
                      : "Specify Waist, Length, Hip / Thigh, and Inseam / Mohori for each size."}
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

              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-muted-foreground px-1">
                  <div className="col-span-2">Size *</div>
                  {templateType === "topwear" ? (
                    <>
                      <div className="col-span-2">Chest (&quot;)</div>
                      <div className="col-span-2">Length (&quot;)</div>
                      <div className="col-span-2">Waist (&quot;)</div>
                      <div className="col-span-2">Sleeve (&quot;)</div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-2">Waist (&quot;)</div>
                      <div className="col-span-2">Length (&quot;)</div>
                      <div className="col-span-2">Hip/Thigh (&quot;)</div>
                      <div className="col-span-2">Inseam (&quot;)</div>
                    </>
                  )}
                  <div className="col-span-2 text-right">Action</div>
                </div>

                {rows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-2">
                      <Input
                        placeholder={templateType === "topwear" ? "M" : "32"}
                        value={row.size}
                        onChange={(e) => handleRowChange(idx, "size", e.target.value)}
                        className="h-8 text-xs font-bold"
                        required
                      />
                    </div>
                    {templateType === "topwear" ? (
                      <>
                        <div className="col-span-2">
                          <Input
                            placeholder='38'
                            value={row.chest}
                            onChange={(e) => handleRowChange(idx, "chest", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder='27'
                            value={row.length}
                            onChange={(e) => handleRowChange(idx, "length", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder='32'
                            value={row.waist}
                            onChange={(e) => handleRowChange(idx, "waist", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder='8'
                            value={row.sleeve}
                            onChange={(e) => handleRowChange(idx, "sleeve", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-2">
                          <Input
                            placeholder='32'
                            value={row.waist}
                            onChange={(e) => handleRowChange(idx, "waist", e.target.value)}
                            className="h-8 text-xs font-semibold"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder='40'
                            value={row.length}
                            onChange={(e) => handleRowChange(idx, "length", e.target.value)}
                            className="h-8 text-xs font-semibold"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder='40'
                            value={row.chest}
                            onChange={(e) => handleRowChange(idx, "chest", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder='14'
                            value={row.sleeve}
                            onChange={(e) => handleRowChange(idx, "sleeve", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </>
                    )}
                    <div className="col-span-2 text-right">
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
                  </div>
                ))}
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
