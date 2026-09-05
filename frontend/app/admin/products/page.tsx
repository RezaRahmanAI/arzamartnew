"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Plus,
  Trash2,
  X,
  Boxes,
  RefreshCw,
  Search,
  PackageCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBDT } from "@/lib/dashboard-data";
import { type Product } from "@/lib/shop-data";
import { useProducts } from "@/lib/products-store";
import { useCategories } from "@/lib/categories-store";
import { getImageUrl, FALLBACK_IMAGE } from "@/components/image-uploader";

export default function AdminProducts() {
  const router = useRouter();
  const { products, updateProduct, deleteProduct } = useProducts();
  const { categories } = useCategories();

  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [stockForm, setStockForm] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("ALL");
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const parentCategories = useMemo(
    () => categories.filter((c) => !c.parentCategoryId && !c.parentSlug),
    [categories],
  );

  const filterAvailableSubCategories = useMemo(() => {
    if (selectedCategory === "ALL") return [];
    const targetSlug = selectedCategory.trim().toLowerCase();
    const parent = categories.find(
      (c) =>
        c.slug.toLowerCase() === targetSlug ||
        c.name.toLowerCase() === targetSlug ||
        (c.id && String(c.id) === selectedCategory),
    );
    if (!parent) return [];
    return categories.filter(
      (c) =>
        (c.parentSlug && c.parentSlug.toLowerCase() === parent.slug.toLowerCase()) ||
        (parent.id && c.parentCategoryId === parent.id),
    );
  }, [categories, selectedCategory]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.slug.toLowerCase().includes(q) &&
        !p.category.toLowerCase().includes(q) &&
        (!p.subcategory || !p.subcategory.toLowerCase().includes(q))
      ) {
        return false;
      }
      if (selectedCategory !== "ALL") {
        if (p.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }
      if (selectedSubCategory !== "ALL") {
        if (!p.subcategory || p.subcategory.toLowerCase() !== selectedSubCategory.toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }, [products, searchQuery, selectedCategory, selectedSubCategory]);

  const openCreate = () => {
    router.push("/admin/products/new");
  };

  const openEdit = (p: Product) => {
    router.push(`/admin/products/${p.slug}/edit`);
  };

  const openStockModal = (p: Product) => {
    setStockModalProduct(p);
    const initialStock: Record<string, number> = {};
    p.sizes.forEach((s) => {
      initialStock[s] = p.sizeStock?.[s] ?? 0;
    });
    setStockForm(initialStock);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      await deleteProduct(productToDelete.slug);
      toast.success("Product deleted", { description: productToDelete.name });
      setProductToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete product";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleStatus = (p: Product) => {
    const nextStatus = p.isActive === false ? true : false;
    updateProduct(p.slug, { ...p, isActive: nextStatus });
    toast.success(`Product ${nextStatus ? "activated" : "deactivated"}`, {
      description: p.name,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, slug..."
              className="pl-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedSubCategory("ALL");
            }}
            className="h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {parentCategories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          {selectedCategory !== "ALL" && filterAvailableSubCategories.length > 0 && (
            <select
              value={selectedSubCategory}
              onChange={(e) => setSelectedSubCategory(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground cursor-pointer animate-in fade-in duration-200"
            >
              <option value="ALL">All Sub-Categories</option>
              {filterAvailableSubCategories.map((sc) => (
                <option key={sc.slug} value={sc.slug}>
                  {sc.name}
                </option>
              ))}
            </select>
          )}

          {(selectedCategory !== "ALL" || selectedSubCategory !== "ALL" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
                setSelectedSubCategory("ALL");
              }}
              className="text-xs text-muted-foreground hover:text-foreground h-9 cursor-pointer"
            >
              Reset Filters
            </Button>
          )}
        </div>

        <Button onClick={openCreate} className="gap-2 cursor-pointer shrink-0">
          <Plus className="size-4" />
          Create product
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
            <Search className="size-8 text-muted-foreground opacity-50" />
            <p className="font-medium">No products found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? `Nothing matches "${searchQuery}". Try a different keyword.`
                : "Create your first product to get started."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Base price</TableHead>
                <TableHead className="text-right">Sizes</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => {
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

                const totalStock = p.sizes.reduce((acc, s) => {
                  return acc + (p.sizeStock?.[s] ?? 0);
                }, 0);

                return (
                  <TableRow key={p.slug}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={getImageUrl(p.image)}
                          alt={p.name}
                          className="size-10 rounded-md object-cover bg-muted/20"
                          width={40}
                          height={40}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";
                          }}
                        />
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        let displayParent = p.categoryName;
                        let displaySub = p.subcategoryName;

                        if (!displayParent && p.categoryId) {
                          const matchedCat = categories.find((c) => c.id === p.categoryId);
                          if (matchedCat) {
                            if (matchedCat.parentName) {
                              displayParent = matchedCat.parentName;
                              displaySub = matchedCat.name;
                            } else {
                              displayParent = matchedCat.name;
                            }
                          }
                        }

                        if (!displaySub && p.subcategoryId) {
                          const matchedSub = categories.find((c) => c.id === p.subcategoryId);
                          if (matchedSub) {
                            displaySub = matchedSub.name;
                            if (!displayParent && matchedSub.parentName) {
                              displayParent = matchedSub.parentName;
                            }
                          }
                        }

                        if (!displayParent) {
                          const cleanCat = (p.category || "").trim().toLowerCase();
                          const parentCat = categories.find(
                            (c) =>
                              c.slug.toLowerCase() === cleanCat ||
                              c.name.toLowerCase() === cleanCat ||
                              (c.id && String(c.id) === p.category),
                          );
                          displayParent =
                            parentCat?.parentName ||
                            (parentCat?.parentSlug
                              ? categories.find((c) => c.slug === parentCat.parentSlug)?.name
                              : null) ||
                            parentCat?.name ||
                            p.category ||
                            "Unassigned";
                          if (!displaySub && (parentCat?.parentSlug || parentCat?.parentCategoryId)) {
                            displaySub = parentCat.name;
                          }
                        }

                        if (!displaySub && p.subcategory) {
                          const cleanSub = p.subcategory.trim().toLowerCase();
                          const subCat = categories.find(
                            (c) =>
                              c.slug.toLowerCase() === cleanSub ||
                              c.name.toLowerCase() === cleanSub ||
                              (c.id && String(c.id) === p.subcategory),
                          );
                          displaySub = subCat?.name || p.subcategory;
                        }

                        if (
                          displaySub &&
                          displayParent &&
                          displaySub.toLowerCase() === displayParent.toLowerCase()
                        ) {
                          displaySub = undefined;
                        }

                        return (
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground text-xs">
                              {displayParent || "Unassigned"}
                            </span>
                            {displaySub && (
                              <span className="text-[10px] text-muted-foreground">↳ {displaySub}</span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{priceRange}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.sizes.join(", ")}</TableCell>
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => openStockModal(p)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition-colors ${
                          totalStock > 20
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : totalStock > 0
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                      >
                        <Boxes className="size-3" />
                        <span>{totalStock} in stock</span>
                      </button>
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
                      <div className="flex justify-end items-center gap-1.5 whitespace-nowrap">
                        <Link
                          href={`/admin/landing-page-design?productId=${p.id || p.slug}&slug=${p.slug}`}
                          className="inline-flex items-center justify-center rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-xs font-bold text-cyan-700 transition-all hover:bg-cyan-600 hover:text-white dark:border-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-300 dark:hover:bg-cyan-600 cursor-pointer shadow-2xs"
                          title="Design Custom Landing Page for this Product"
                        >
                          CLP
                        </Link>

                        <button
                          type="button"
                          onClick={() => openStockModal(p)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary cursor-pointer"
                          title="Manage Size Stock"
                        >
                          <Boxes className="size-3.5 text-primary" />
                          <span className="hidden sm:inline">Stock</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="rounded-md border border-border p-2 text-foreground transition-colors hover:border-primary hover:text-primary cursor-pointer"
                          aria-label="Edit"
                          title="Edit Product"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(p)}
                          className="rounded-md border border-border p-2 text-foreground transition-colors hover:border-destructive hover:text-destructive cursor-pointer"
                          aria-label="Delete"
                          title="Delete Product"
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

      {/* Delete Confirmation Modal */}
      <Dialog open={!!productToDelete} onOpenChange={(isOpen) => !isOpen && setProductToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="size-5" /> প্রোডাক্ট ডিলিট কনফার্মেশন
            </DialogTitle>
            <DialogDescription>
              আপনি কি নিশ্চিত যে আপনি{" "}
              <span className="font-bold text-foreground">"{productToDelete?.name}"</span> প্রোডাক্টটি ডিলিট করতে চান?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg border border-destructive/20 space-y-1">
            <p className="font-bold">সতর্কবার্তা:</p>
            <p>
              এই প্রোডাক্টটির সাথে যদি কোনো কাস্টমার বা অ্যাডমিন অর্ডার হিস্টোরি থাকে, তাহলে ডাটাবেজ ইন্টিগ্রিটি রক্ষার
              স্বার্থে এটি ডিলিট করা যাবে না।
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setProductToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="gap-1.5"
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Management Dialog (kept inline) */}
      <Dialog
        open={!!stockModalProduct}
        onOpenChange={(open) => !open && setStockModalProduct(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageCheck className="size-5" /> Stock Management
            </DialogTitle>
            <DialogDescription>
              Set exact inventory quantity for each size of {stockModalProduct?.name}.
            </DialogDescription>
          </DialogHeader>

          {stockModalProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-2 border border-border rounded-lg bg-secondary/30">
                <img
                  src={getImageUrl(stockModalProduct.image)}
                  alt={stockModalProduct.name}
                  className="size-10 rounded-md object-cover"
                  width={40}
                  height={40}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
                <div>
                  <h4 className="font-bold text-sm text-foreground">{stockModalProduct.name}</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Category: {stockModalProduct.category}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    const updated: Record<string, number> = {};
                    stockModalProduct.sizes.forEach((s) => (updated[s] = 10));
                    setStockForm(updated);
                  }}
                >
                  Set all to 10
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    const updated: Record<string, number> = {};
                    stockModalProduct.sizes.forEach((s) => (updated[s] = 50));
                    setStockForm(updated);
                  }}
                >
                  Set all to 50
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    const updated: Record<string, number> = {};
                    stockModalProduct.sizes.forEach((s) => (updated[s] = 0));
                    setStockForm(updated);
                  }}
                >
                  Set all to 0
                </Button>
              </div>

              <div className="space-y-2">
                {stockModalProduct.sizes.map((s) => {
                  const qty = stockForm[s] ?? 0;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-16 text-xs font-mono font-bold">{s}</span>
                      <Input
                        type="number"
                        min="0"
                        value={qty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setStockForm((prev) => ({ ...prev, [s]: isNaN(val) ? 0 : val }));
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  );
                })}
                <p className="text-[11px] text-muted-foreground pt-1">
                  Total: {Object.values(stockForm).reduce((a, b) => a + b, 0)} units available
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStockModalProduct(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!stockModalProduct) return;
                    try {
                      await updateProduct(stockModalProduct.slug, {
                        ...stockModalProduct,
                        sizeStock: stockForm,
                      });
                      toast.success(`Stock updated for ${stockModalProduct.name}`, {
                        description: `Total: ${Object.values(stockForm).reduce((a, b) => a + b, 0)} units`,
                      });
                      setStockModalProduct(null);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to update stock");
                    }
                  }}
                >
                  Save Stock
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
