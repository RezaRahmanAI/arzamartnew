"use client";

import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, FolderOpen, Layers, Search, X } from "lucide-react";
import { toast } from "sonner";
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
} from "@/components/ui/dialog";
import { useCategories } from "@/lib/categories-store";
import { type Category } from "@/lib/shop-data";
import { ImageUploader, getImageUrl, FALLBACK_IMAGE } from "@/components/image-uploader";

type FormState = {
  name: string;
  slug: string;
  parentSlug: string;
  image: string;
  blurb: string;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  parentSlug: "",
  image: "",
  blurb: "",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function SubCategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const [open, setOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");

  // Top level categories (categories with NO parent)
  const parentCategories = useMemo(() => {
    return categories.filter((c) => !c.parentCategoryId && !c.parentSlug);
  }, [categories]);

  // Sub-categories (categories WITH a parent)
  const subCategories = useMemo(() => {
    return categories.filter((c) => Boolean(c.parentCategoryId || c.parentSlug));
  }, [categories]);

  const filteredSubCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subCategories;
    return subCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.parentName && c.parentName.toLowerCase().includes(q)) ||
        (c.parentSlug && c.parentSlug.toLowerCase().includes(q))
    );
  }, [subCategories, searchQuery]);

  const openCreate = () => {
    setEditingSlug(null);
    setForm({
      ...emptyForm,
      parentSlug: parentCategories[0]?.slug || "",
    });
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditingSlug(c.slug);
    setForm({
      name: c.name,
      slug: c.slug,
      parentSlug: c.parentSlug || "",
      image: c.image || "",
      blurb: c.blurb || "",
    });
    setOpen(true);
  };

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.slug || slugify(form.name);
    if (!slug || !form.name) {
      toast.error("Sub-category name is required");
      return;
    }

    if (!form.parentSlug) {
      toast.error("Please select a parent category");
      return;
    }

    const parentCat = parentCategories.find((p) => p.slug === form.parentSlug);

    const subCat: Category = {
      slug,
      name: form.name,
      image: form.image || FALLBACK_IMAGE,
      blurb: form.blurb,
      parentCategoryId: parentCat?.id || null,
      parentSlug: form.parentSlug,
      parentName: parentCat?.name || null,
    };

    if (editingSlug) {
      await updateCategory(editingSlug, subCat);
    } else {
      await addCategory(subCat);
    }

    toast.success(editingSlug ? "Sub-category updated" : "Sub-category created", {
      description: subCat.name,
    });
    setOpen(false);
  };

  const remove = async (slug: string) => {
    if (confirm("Are you sure you want to delete this sub-category?")) {
      await deleteCategory(slug);
      toast.success("Sub-category deleted");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Layers className="size-5 text-primary" /> Sub-Categories
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage product sub-categories grouped under main store categories.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sub-categories..."
              className="pl-9 h-9 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <Button onClick={openCreate} className="gap-1.5 h-9 text-xs font-bold cursor-pointer shrink-0">
            <Plus className="size-4" />
            Create Sub-category
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        {filteredSubCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
            <Layers className="size-10 text-muted-foreground opacity-40" />
            <p className="font-semibold text-sm text-foreground">No sub-categories found</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {searchQuery
                ? `Nothing matches "${searchQuery}".`
                : "Create sub-categories under categories like T-Shirts, Shirts, Panjabi etc."}
            </p>
            {!searchQuery && (
              <Button onClick={openCreate} size="sm" className="mt-3 gap-1.5 text-xs">
                <Plus className="size-3.5" /> Add First Sub-category
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sub-Category</TableHead>
                <TableHead>Parent Category</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Blurb</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubCategories.map((c) => {
                const parent = parentCategories.find((p) => p.slug === c.parentSlug || p.id === c.parentCategoryId);
                return (
                  <TableRow key={c.slug}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={getImageUrl(c.image)}
                          alt={c.name}
                          className="size-10 rounded-md object-cover bg-muted/20"
                          width={40}
                          height={40}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_IMAGE;
                          }}
                        />
                        <span className="font-semibold text-sm">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                        <FolderOpen className="size-3" />
                        {parent?.name || c.parentName || c.parentSlug || "Main Category"}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
                    <TableCell className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{c.blurb}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="rounded-md border border-border p-2 text-foreground transition-colors hover:border-primary hover:text-primary cursor-pointer"
                          aria-label="Edit"
                          title="Edit Sub-Category"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(c.slug)}
                          className="rounded-md border border-border p-2 text-foreground transition-colors hover:border-destructive hover:text-destructive cursor-pointer"
                          aria-label="Delete"
                          title="Delete Sub-Category"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSlug ? "Edit Sub-category" : "Create Sub-category"}</DialogTitle>
            <DialogDescription>
              {editingSlug
                ? "Update sub-category details and parent category linkage."
                : "Add a new sub-category under a parent category."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Parent Category *</Label>
              <select
                value={form.parentSlug}
                onChange={(e) => update("parentSlug", e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="" disabled>Select parent category...</option>
                {parentCategories.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sc-name" className="text-xs font-bold text-foreground">Sub-Category Name *</Label>
                <Input
                  id="sc-name"
                  required
                  placeholder="e.g. Graphic Tees, Linen Shirts"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      slug: f.slug || slugify(name),
                    }));
                  }}
                  className="h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sc-slug" className="text-xs font-bold text-foreground">URL Slug *</Label>
                <Input
                  id="sc-slug"
                  required
                  placeholder="graphic-tees"
                  value={form.slug}
                  onChange={(e) => update("slug", slugify(e.target.value))}
                  className="h-10 text-sm font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Image</Label>
              <ImageUploader
                value={form.image}
                onChange={(url) => update("image", url)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sc-blurb" className="text-xs font-bold text-foreground">Description / Blurb</Label>
              <Input
                id="sc-blurb"
                placeholder="Short tagline for this sub-category"
                value={form.blurb}
                onChange={(e) => update("blurb", e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSlug ? "Save changes" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
