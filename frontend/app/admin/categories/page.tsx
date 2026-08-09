"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Upload } from "lucide-react";
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

type FormState = {
  name: string;
  slug: string;
  image: string;
  blurb: string;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
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

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const [open, setOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const openCreate = () => {
    setEditingSlug(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditingSlug(c.slug);
    setForm({
      name: c.name,
      slug: c.slug,
      image: c.image,
      blurb: c.blurb || "",
    });
    setOpen(true);
  };

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.slug || slugify(form.name);
    if (!slug || !form.name) {
      toast.error("Name is required");
      return;
    }

    const category: Category = {
      slug,
      name: form.name,
      image: form.image || "/src/assets/t-shirt.jpg",
      blurb: form.blurb,
    };

    if (editingSlug) {
      updateCategory(editingSlug, category);
    } else {
      addCategory(category);
    }

    toast.success(editingSlug ? "Category updated" : "Category created", {
      description: category.name,
    });
    setOpen(false);
  };

  const remove = (slug: string) => {
    deleteCategory(slug);
    toast.success("Category deleted");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <Button onClick={openCreate} className="gap-2 cursor-pointer">
          <Plus className="size-4" />
          Create category
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Blurb</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => {
              return (
                <TableRow key={c.slug}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={c.image}
                        alt={c.name}
                        loading="lazy"
                        className="size-10 rounded-md object-cover"
                      />
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
                  <TableCell className="text-muted-foreground">{c.blurb}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(c)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(c.slug)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSlug ? "Edit category" : "Create category"}</DialogTitle>
            <DialogDescription>
              Add or update category info.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => {
                  update("name", e.target.value);
                  if (!editingSlug) update("slug", slugify(e.target.value));
                }}
                placeholder="Polo Shirt"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => update("slug", slugify(e.target.value))}
                placeholder="polo-shirt"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category Image</Label>
              <div className="flex items-center gap-3">
                {form.image ? (
                  <div className="relative size-20 rounded-md border border-border overflow-hidden group">
                    <img src={form.image} alt="Category Preview" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => update("image", "")}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center size-20 rounded-md border border-dashed border-border hover:border-primary bg-secondary/10 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                    <Upload className="size-4" />
                    <span className="text-[9px] mt-1 font-semibold">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            update("image", reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
                <div className="text-xs text-muted-foreground">
                  <p className="font-semibold">Upload category banner</p>
                  <p>Supported: JPG, PNG, WEBP</p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="blurb">Blurb (Short description)</Label>
              <Input
                id="blurb"
                value={form.blurb}
                onChange={(e) => update("blurb", e.target.value)}
                placeholder="Everyday premium fit"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="cursor-pointer">
                {editingSlug ? "Save changes" : "Create category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
