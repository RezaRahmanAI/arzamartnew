"use client";

import { Pencil, Plus, Trash2, X, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { formatBDT } from "@/lib/dashboard-data";
import { type Product } from "@/lib/shop-data";
import { useProducts } from "@/lib/products-store";
import { useCategories } from "@/lib/categories-store";

type FormState = {
  slug: string;
  name: string;
  category: string;
  image: string;
  price: number;
  compareAt: number;
  purchaseRate: number;
  sizes: string;
  colors: string;
  description: string;
  badge: string;
  sizePrices: Record<string, number>;
  videoUrl: string;
  returnPolicy: string;
  images: string[];
  isBundle: boolean;
  bundleProducts: string[];
  isActive: boolean;
};

const emptyForm: FormState = {
  slug: "",
  name: "",
  category: "t-shirts",
  image: "",
  price: 0,
  compareAt: 0,
  purchaseRate: 0,
  sizes: "S, M, L, XL, XXL",
  colors: "Black, White",
  description: "",
  badge: "",
  sizePrices: {},
  videoUrl: "",
  returnPolicy: "",
  images: [],
  isBundle: false,
  bundleProducts: [],
  isActive: true,
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminProducts() {
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { categories } = useCategories();
  const [open, setOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const sizesArray = form.sizes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const openCreate = () => {
    setForm({
      ...emptyForm,
      category: categories[0]?.slug || "t-shirts",
    });
    setEditingSlug(null);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      slug: p.slug,
      name: p.name,
      category: p.category,
      image: p.image,
      price: p.price,
      compareAt: p.mrp ?? p.compareAt ?? 0,
      purchaseRate: p.purchaseRate,
      sizes: p.sizes.join(", "),
      colors: p.colors.join(", "),
      description: p.description,
      badge: p.badge ?? "",
      sizePrices: p.sizePrices ?? {},
      videoUrl: p.videoUrl ?? "",
      returnPolicy: p.returnPolicy ?? "",
      images: p.images ?? [],
      isBundle: p.isBundle ?? false,
      bundleProducts: p.bundleProducts ?? [],
      isActive: p.isActive !== false,
    });
    setEditingSlug(p.slug);
    setOpen(true);
  };

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setSizePrice = (size: string, price: number) =>
    setForm((f) => ({ ...f, sizePrices: { ...f.sizePrices, [size]: price } }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.slug || slugify(form.name);
    if (!slug || !form.name) {
      toast.error("Name is required");
      return;
    }
    const sizes = sizesArray;
    const colors = form.colors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const sizePrices: Record<string, number> = {};
    sizes.forEach((s) => {
      const sp = form.sizePrices[s];
      if (sp !== undefined && sp > 0) sizePrices[s] = sp;
    });

    const firstVal = Object.values(sizePrices)[0] || 0;
    const basePrice = sizes[0] ? (sizePrices[sizes[0]] || firstVal) : firstVal;

    const product: Product = {
      slug,
      name: form.name,
      category: form.category,
      price: basePrice,
      compareAt: Number(form.compareAt) > 0 ? Number(form.compareAt) : undefined,
      mrp: Number(form.compareAt) > 0 ? Number(form.compareAt) : undefined,
      image: form.image || "/src/assets/cat-tshirt.jpg",
      sizes,
      colors,
      description: form.description || "No description yet.",
      badge: form.badge || undefined,
      purchaseRate: Number(form.purchaseRate) || 0,
      sizePrices: Object.keys(sizePrices).length > 0 ? sizePrices : undefined,
      videoUrl: form.videoUrl || undefined,
      returnPolicy: form.returnPolicy || undefined,
      images: form.images.length > 0 ? form.images : undefined,
      isBundle: form.isBundle,
      bundleProducts: form.isBundle ? form.bundleProducts : undefined,
      isActive: form.isActive,
    };

    if (editingSlug) {
      updateProduct(editingSlug, product);
    } else {
      addProduct(product);
    }

    toast.success(editingSlug ? "Product updated" : "Product created", {
      description: product.name,
    });
    setOpen(false);
  };

  const addBundleProduct = (slug: string) => {
    setForm((prev) => ({
      ...prev,
      bundleProducts: [...prev.bundleProducts, slug],
    }));
  };

  const removeBundleProductAtIndex = (index: number) => {
    setForm((prev) => ({
      ...prev,
      bundleProducts: prev.bundleProducts.filter((_, i) => i !== index),
    }));
  };

  const toggleStatus = (p: Product) => {
    const nextStatus = p.isActive === false ? true : false;
    updateProduct(p.slug, { ...p, isActive: nextStatus });
    toast.success(`Product ${nextStatus ? "activated" : "deactivated"}`, {
      description: p.name,
    });
  };

  const remove = (slug: string) => {
    deleteProduct(slug);
    toast.success("Product deleted");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <Button onClick={openCreate} className="gap-2 cursor-pointer">
          <Plus className="size-4" />
          Create product
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Purchase</TableHead>
              <TableHead className="text-right">Base price</TableHead>
              <TableHead className="text-right">Sizes</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const minPrice =
                p.sizePrices && Object.keys(p.sizePrices).length > 0
                  ? Math.min(...Object.values(p.sizePrices))
                  : p.price;
              const maxPrice =
                p.sizePrices && Object.keys(p.sizePrices).length > 0
                  ? Math.max(...Object.values(p.sizePrices))
                  : p.price;
              const priceRange =
                minPrice === maxPrice
                  ? formatBDT(p.price)
                  : `${formatBDT(minPrice)} – ${formatBDT(maxPrice)}`;
              return (
                <TableRow key={p.slug}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image}
                        alt={p.name}
                        loading="lazy"
                        className="size-10 rounded-md object-cover"
                      />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">{p.category}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatBDT(p.purchaseRate)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{priceRange}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {p.sizes.join(", ")}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => toggleStatus(p)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent cursor-pointer ${
                        p.isActive !== false
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                    >
                      {p.isActive !== false ? "Active" : "Inactive"}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="rounded-md border border-border p-2 text-foreground transition-colors hover:border-primary hover:text-primary cursor-pointer"
                        aria-label="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p.slug)}
                        className="rounded-md border border-border p-2 text-foreground transition-colors hover:border-destructive hover:text-destructive cursor-pointer"
                        aria-label="Delete"
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
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSlug ? "Edit product" : "Create product"}</DialogTitle>
            <DialogDescription>
              Set the purchase rate (your cost) and a selling price for each size.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3 p-3 border border-border rounded-lg bg-secondary/10 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm w-full">
                  <input
                    type="checkbox"
                    checked={form.isBundle}
                    onChange={(e) => update("isBundle", e.target.checked)}
                    className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Is this a combo bundle product?
                </label>
              </div>
              <div className="space-y-3 p-3 border border-border rounded-lg bg-secondary/10 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-sm w-full">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => update("isActive", e.target.checked)}
                    className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  Active Status (Show in store)
                </label>
              </div>
            </div>

            {form.isBundle && (
              <div className="space-y-4 p-3 border border-border rounded-lg bg-secondary/10">
                <div className="space-y-3 mt-2 pt-2">
                  {/* Selected items list */}
                  <div>
                    <Label className="text-xs font-bold text-foreground">Selected Bundle Items ({form.bundleProducts.length})</Label>
                    {form.bundleProducts.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground mt-1">No products added to combo yet.</p>
                    ) : (
                      <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {form.bundleProducts.map((slug, idx) => {
                          const p = products.find((prod) => prod.slug === slug);
                          if (!p) return null;
                          return (
                            <div key={idx} className="flex items-center gap-2 bg-card p-1.5 rounded border border-border text-xs justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <img src={p.image} alt={p.name} className="size-6 object-cover rounded" />
                                <span className="truncate font-medium">{p.name}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBundleProductAtIndex(idx)}
                                className="h-6 text-destructive hover:text-destructive hover:bg-destructive/10 px-2 text-[10px]"
                              >
                                Remove
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Available items list */}
                  <div className="pt-2 border-t border-border/40">
                    <Label className="text-xs font-bold text-foreground">Add Products to Combo</Label>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 pr-2">
                      {products
                        .filter((p) => !p.isBundle && p.slug !== editingSlug)
                        .map((p) => (
                          <div
                            key={p.slug}
                            className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-secondary/40"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={p.image} alt={p.name} className="size-6 object-cover rounded" />
                              <span className="truncate">{p.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addBundleProduct(p.slug)}
                              className="h-6 text-[10px] px-2"
                            >
                              + Add
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Product name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => {
                    update("name", e.target.value);
                    if (!editingSlug) update("slug", slugify(e.target.value));
                  }}
                  placeholder="Midnight Heavyweight Tee"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => update("slug", slugify(e.target.value))}
                  placeholder="midnight-heavyweight-tee"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Featured Image</Label>
                <div className="flex items-center gap-3">
                  {form.image ? (
                    <div className="relative size-20 rounded-md border border-border overflow-hidden group">
                      <img src={form.image} alt="Featured Preview" className="size-full object-cover" />
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
                    <p className="font-semibold">Upload featured thumbnail</p>
                    <p>Supported: JPG, PNG, WEBP</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Gallery Images</Label>
              <div className="flex flex-wrap gap-3 items-center">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative size-16 rounded-md border border-border overflow-hidden group">
                    <img src={img} alt={`Gallery Preview ${idx + 1}`} className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const nextList = form.images.filter((_, i) => i !== idx);
                        update("images", nextList);
                      }}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center size-16 rounded-md border border-dashed border-border hover:border-primary bg-secondary/10 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  <Upload className="size-4" />
                  <span className="text-[9px] mt-1 font-semibold">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const loadedImages: string[] = [];
                      let processed = 0;
                      if (files.length === 0) return;
                      files.forEach((file) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          loadedImages.push(reader.result as string);
                          processed++;
                          if (processed === files.length) {
                            update("images", [...form.images, ...loadedImages]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                  />
                </label>
              </div>
            </div>

            <div className={`grid gap-4 ${form.isBundle ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
              {!form.isBundle && (
                <div className="space-y-1.5">
                  <Label htmlFor="purchaseRate">Purchase rate (৳)</Label>
                  <Input
                    id="purchaseRate"
                    type="number"
                    min="0"
                    value={form.purchaseRate || ""}
                    onChange={(e) => update("purchaseRate", Number(e.target.value))}
                    placeholder="450"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="compareAt">MRP / Original Price (৳)</Label>
                <Input
                  id="compareAt"
                  type="number"
                  min="0"
                  value={form.compareAt || ""}
                  onChange={(e) => update("compareAt", Number(e.target.value))}
                  placeholder="990"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sizes">Sizes (comma separated)</Label>
                <Input
                  id="sizes"
                  value={form.sizes}
                  onChange={(e) => update("sizes", e.target.value)}
                  placeholder="S, M, L, XL, XXL"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="colors">Colours (comma separated)</Label>
                <Input
                  id="colors"
                  value={form.colors}
                  onChange={(e) => update("colors", e.target.value)}
                  placeholder="Black, White"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="badge">Badge (optional)</Label>
              <Input
                id="badge"
                value={form.badge}
                onChange={(e) => update("badge", e.target.value)}
                placeholder="Best seller"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Product description..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="videoUrl">Product Video URL (YouTube link or direct video path)</Label>
              <Input
                id="videoUrl"
                value={form.videoUrl}
                onChange={(e) => update("videoUrl", e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="returnPolicy">Return Policy (optional)</Label>
              <Textarea
                id="returnPolicy"
                value={form.returnPolicy}
                onChange={(e) => update("returnPolicy", e.target.value)}
                placeholder="Leave blank to use default shop return policy..."
                rows={2}
              />
            </div>

            {sizesArray.length > 0 && (
              <div className="space-y-2">
                <Label>Size-wise selling prices (৳)</Label>
                <p className="text-xs text-muted-foreground">
                  Enter the selling price for each size.
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {sizesArray.map((s) => (
                    <div key={s} className="space-y-1">
                      <Label className="text-xs">Size {s}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={form.sizePrices[s] ?? ""}
                        onChange={(e) => setSizePrice(s, Number(e.target.value))}
                        placeholder="790"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                <X className="mr-1 size-4" />
                Cancel
              </Button>
              <Button type="submit">
                {editingSlug ? "Save changes" : "Create product"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
