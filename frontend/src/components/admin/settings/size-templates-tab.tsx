"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Ruler,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  deleteSizeTemplateAction,
  SizeTemplateDto,
} from "@/actions/size-templates.actions";

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
  const router = useRouter();
  const [templates, setTemplates] = useState<SizeTemplateDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  const handleCreate = () => {
    router.push("/admin/size-templates/new");
  };

  const handleEdit = (t: SizeTemplateDto) => {
    router.push(`/admin/size-templates/${t.id}/edit`);
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
            onClick={handleCreate}
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
              onClick={handleCreate}
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
                        onClick={() => handleEdit(t)}
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

      {/* Delete Confirmation Modal (kept inline — quick confirmation) */}
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
