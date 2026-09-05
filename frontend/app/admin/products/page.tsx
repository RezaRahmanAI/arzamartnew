"use client";

import Link from "next/link";
import { Pencil, Plus, Trash2, X, Upload, Boxes, PackageCheck, Layers, RefreshCw, Search, Ruler, Sparkles } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { getSizeTemplatesAction, SizeTemplateDto } from "@/actions/size-templates.actions";

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
import { useSettings } from "@/context/settings-context";
import { ImageUploader, getImageUrl, handleImageError, FALLBACK_IMAGE } from "@/components/image-uploader";
import { apiClient } from "@/lib/api/client";


type FormState = {
  slug: string;
  name: string;
  category: string;
  subcategory?: string;
  image: string;
  price: number;
  compareAt: number;
  sizes: string;
  description: string;
  discountNote: string;
  offerRuleIds: string[];
  badge: string;
  sizePrices: Record<string, number>;
  sizeMeasurements: Record<string, { chest?: string; length?: string; waist?: string; sleeve?: string }>;
  sizeTemplateId: string;
  videoUrl: string;
  returnPolicy: string;
  images: string[];
  isBundle: boolean;
  bundleProducts: string[];
  isActive: boolean;
  acceptPreOrder: boolean;
};

const emptyForm: FormState = {
  slug: "",
  name: "",
  category: "t-shirts",
  subcategory: "",
  image: "",
  price: 790,
  compareAt: 990,
  sizes: "M, L, XL, XXL",
  description: "",
  discountNote: "",
  offerRuleIds: [],
  badge: "",
  sizePrices: {},
  sizeMeasurements: {},
  sizeTemplateId: "",
  videoUrl: "",
  returnPolicy: "",
  images: [],
  isBundle: false,
  bundleProducts: [],
  isActive: true,
  acceptPreOrder: false,
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
  const { settings } = useSettings();
  const quantityOffers = useMemo(() => {
    return (settings?.shipping?.quantityOffers || []).filter(o => o.active);
  }, [settings?.shipping?.quantityOffers]);

  const [open, setOpen] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [stockForm, setStockForm] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("ALL");
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sizeTemplates, setSizeTemplates] = useState<SizeTemplateDto[]>([]);

  useEffect(() => {
    getSizeTemplatesAction()
      .then((data) => setSizeTemplates(data))
      .catch((err) => console.error("Failed to load size templates:", err));
  }, []);

  // Group parent categories and sub-categories
  const parentCategories = useMemo(() => {
    return categories.filter((c) => !c.parentCategoryId && !c.parentSlug);
  }, [categories]);

  const subCategories = useMemo(() => {
    return categories.filter((c) => Boolean(c.parentCategoryId || c.parentSlug));
  }, [categories]);

  // Subcategories available for selected category in form
  const availableSubCategories = useMemo(() => {
    if (!form.category) return [];
    const targetSlug = form.category.trim().toLowerCase();
    const parent = categories.find(
      (c) =>
        c.slug.toLowerCase() === targetSlug ||
        c.name.toLowerCase() === targetSlug ||
        (c.id && String(c.id) === form.category)
    );
    if (!parent) return [];
    return categories.filter(
      (c) =>
        (c.parentSlug && c.parentSlug.toLowerCase() === parent.slug.toLowerCase()) ||
        (parent.id && c.parentCategoryId === parent.id)
    );
  }, [categories, form.category]);

  // Subcategories available for category filter
  const filterAvailableSubCategories = useMemo(() => {
    if (selectedCategory === "ALL") return [];
    const targetSlug = selectedCategory.trim().toLowerCase();
    const parent = categories.find(
      (c) =>
        c.slug.toLowerCase() === targetSlug ||
        c.name.toLowerCase() === targetSlug ||
        (c.id && String(c.id) === selectedCategory)
    );
    if (!parent) return [];
    return categories.filter(
      (c) =>
        (c.parentSlug && c.parentSlug.toLowerCase() === parent.slug.toLowerCase()) ||
        (parent.id && c.parentCategoryId === parent.id)
    );
  }, [categories, selectedCategory]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      // Search filter
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.slug.toLowerCase().includes(q) &&
        !p.category.toLowerCase().includes(q) &&
        (!p.subcategory || !p.subcategory.toLowerCase().includes(q))
      ) {
        return false;
      }

      // Category filter
      if (selectedCategory !== "ALL") {
        if (p.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Sub-category filter
      if (selectedSubCategory !== "ALL") {
        if (!p.subcategory || p.subcategory.toLowerCase() !== selectedSubCategory.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory, selectedSubCategory]);

  const openStockModal = (p: Product) => {
    setStockModalProduct(p);
    const initialStock: Record<string, number> = {};
    p.sizes.forEach((s) => {
      initialStock[s] = p.sizeStock?.[s] ?? 0;
    });
    setStockForm(initialStock);
  };

  const saveStock = () => {
    if (!stockModalProduct) return;
    updateProduct(stockModalProduct.slug, {
      ...stockModalProduct,
      sizeStock: stockForm,
    });
    toast.success(`Stock updated for ${stockModalProduct.name}`, {
      description: "Size-wise inventory saved successfully.",
    });
    setStockModalProduct(null);
  };

  const sizesArray = form.sizes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const openCreate = () => {
    const firstParent = parentCategories[0]?.slug || categories[0]?.slug || "t-shirts";
    setForm({
      ...emptyForm,
      category: firstParent,
    });
    setEditingSlug(null);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    // 1. Direct ID based lookup (foolproof)
    let selectedMainCat = "";
    let selectedSubCat = "";

    if (p.categoryId) {
      const catById = categories.find((c) => c.id === p.categoryId);
      if (catById) {
        if (catById.parentSlug || catById.parentCategoryId) {
          // This category is a subcategory
          selectedSubCat = catById.slug;
          const parent = categories.find((c) => c.slug === catById.parentSlug || (catById.parentCategoryId && c.id === catById.parentCategoryId));
          selectedMainCat = parent?.slug || catById.parentSlug || catById.slug;
        } else {
          selectedMainCat = catById.slug;
        }
      }
    }

    if (p.subcategoryId && !selectedSubCat) {
      const subById = categories.find((c) => c.id === p.subcategoryId);
      if (subById) {
        selectedSubCat = subById.slug;
        if (!selectedMainCat) {
          const parent = categories.find((c) => c.slug === subById.parentSlug || (subById.parentCategoryId && c.id === subById.parentCategoryId));
          selectedMainCat = parent?.slug || subById.parentSlug || "t-shirts";
        }
      }
    }

    // 2. Fallback to slug / name matching if IDs were not available
    if (!selectedMainCat) {
      const rawCat = (p.category || "").trim().toLowerCase();
      const matchedCategory = categories.find(
        (c) =>
          c.slug.toLowerCase() === rawCat ||
          c.name.toLowerCase() === rawCat ||
          (c.id && String(c.id) === p.category)
      );

      if (matchedCategory) {
        if (matchedCategory.parentSlug) {
          selectedMainCat = matchedCategory.parentSlug;
          selectedSubCat = matchedCategory.slug;
        } else if (matchedCategory.parentCategoryId) {
          const parent = categories.find((c) => c.id === matchedCategory.parentCategoryId);
          selectedMainCat = parent ? parent.slug : matchedCategory.slug;
          selectedSubCat = matchedCategory.slug;
        } else {
          selectedMainCat = matchedCategory.slug;
        }
      }
    }

    if (!selectedSubCat && p.subcategory) {
      const rawSub = (p.subcategory || "").trim().toLowerCase();
      const matchedSub = categories.find(
        (c) =>
          c.slug.toLowerCase() === rawSub ||
          c.name.toLowerCase() === rawSub ||
          (c.id && String(c.id) === p.subcategory)
      );
      if (matchedSub) {
        selectedSubCat = matchedSub.slug;
        if (!selectedMainCat) {
          selectedMainCat = matchedSub.parentSlug || "t-shirts";
        }
      }
    }

    setForm({
      slug: p.slug,
      name: p.name,
      category: selectedMainCat || "t-shirts",
      subcategory: selectedSubCat || "",
      image: p.image,
      price: p.price,
      compareAt: p.mrp ?? p.compareAt ?? 0,
      sizes: p.sizes.join(", "),
      description: p.description || "",
      discountNote: p.discountNote || p.shortDescription || "",
      offerRuleIds: p.offerRuleIds || [],
      badge: (p.badge ?? "").replace(/\|?PREORDER_ENABLED/g, "").trim(),
      sizePrices: p.sizePrices ?? {},
      sizeMeasurements: p.sizeMeasurements
        ? Object.fromEntries(
            Object.entries(p.sizeMeasurements).map(([s, m]) => [
              s,
              {
                chest: m.chest || "",
                length: m.length || "",
                waist: m.waist || "",
                sleeve: m.sleeve || "",
              },
            ])
          )
        : {},
      sizeTemplateId: p.sizeTemplateId || "",
      videoUrl: p.videoUrl ?? "",
      returnPolicy: p.returnPolicy ?? "",
      images: p.images ?? [],
      isBundle: p.isBundle ?? false,
      bundleProducts: p.bundleProducts ?? [],
      isActive: p.isActive !== false,
      acceptPreOrder: p.acceptPreOrder ?? (p.badge?.includes("PREORDER_ENABLED") ?? false),
    });
    setEditingSlug(p.slug);
    setOpen(true);
  };

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setSizePrice = (size: string, price: number) =>
    setForm((f) => ({ ...f, sizePrices: { ...f.sizePrices, [size]: price } }));

  const setSizeMeasurementField = (size: string, field: "chest" | "length" | "waist" | "sleeve", value: string) => {
    setForm((f) => {
      const prevMeas = f.sizeMeasurements[size] || {};
      return {
        ...f,
        sizeMeasurements: {
          ...f.sizeMeasurements,
          [size]: {
            ...prevMeas,
            [field]: value,
          },
        },
      };
    });
  };

  const handleApplySizeTemplate = (templateId: string) => {
    if (!templateId) {
      update("sizeTemplateId", "");
      return;
    }

    const template = sizeTemplates.find((t) => t.id === templateId);
    if (!template) return;

    // 1. Extract sizes from template entries
    const templateSizes = template.entries.map((e) => e.size);
    const newSizesStr = templateSizes.join(", ");

    // 2. Copy measurements onto form state (COPY behavior)
    const copiedMeasurements: Record<string, { chest?: string; length?: string; waist?: string; sleeve?: string }> = {};
    template.entries.forEach((e) => {
      copiedMeasurements[e.size] = {
        chest: e.chest || "",
        length: e.length || "",
        waist: e.waist || "",
        sleeve: e.sleeve || "",
      };
    });

    setForm((f) => ({
      ...f,
      sizeTemplateId: templateId,
      sizes: newSizesStr,
      sizeMeasurements: {
        ...f.sizeMeasurements,
        ...copiedMeasurements,
      },
    }));

    toast.success(`Applied "${template.name}" template!`, {
      description: `${template.entries.length} sizes and measurements copied to product. You can still adjust individual values if needed.`,
    });
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.slug || slugify(form.name);
    if (!slug || !form.name) {
      toast.error("Name is required");
      return;
    }
    const sizes = sizesArray;
    const sizePrices: Record<string, number> = {};
    sizes.forEach((s) => {
      const sp = form.sizePrices[s];
      if (sp !== undefined && sp > 0) sizePrices[s] = sp;
    });

    const firstVal = Object.values(sizePrices)[0] || 0;
    const basePrice = sizes[0] ? (sizePrices[sizes[0]] || firstVal) : firstVal;

    // Resolve exact database IDs from category store
    const mainCatObj = categories.find((c) => c.slug === form.category || (c.id && String(c.id) === form.category));
    const subCatObj = form.subcategory
      ? categories.find((c) => c.slug === form.subcategory || (c.id && String(c.id) === form.subcategory))
      : null;

    // Resolve the first selected offer rule (for cached banner text + min qty hints)
    const selectedOffers = form.offerRuleIds
      .map((id) => quantityOffers.find((o) => o.id === id))
      .filter(Boolean) as NonNullable<typeof quantityOffers[number]>[];
    const selectedOffer = selectedOffers[0] || null;

    const discountNoteFinal = form.discountNote || selectedOffer?.title || undefined;

    const product: Product = {
      slug,
      name: form.name,
      category: form.category,
      subcategory: form.subcategory || undefined,
      categoryId: mainCatObj?.id,
      subcategoryId: subCatObj?.id,
      categoryName: mainCatObj?.name,
      subcategoryName: subCatObj?.name,
      price: basePrice,
      compareAt: Number(form.compareAt) > 0 ? Number(form.compareAt) : undefined,
      mrp: Number(form.compareAt) > 0 ? Number(form.compareAt) : undefined,
      image: form.image || FALLBACK_IMAGE,
      sizes,
      description: form.description || "No description yet.",
      discountNote: discountNoteFinal,
      shortDescription: discountNoteFinal,
      offerRuleIds: form.offerRuleIds.length > 0 ? form.offerRuleIds : undefined,
      offerTitle: selectedOffer?.title || undefined,
      offerType: selectedOffer?.offerType || undefined,
      offerMinQty: selectedOffer?.minQty || undefined,
      offerDiscount: selectedOffer?.discountAmount || undefined,
      badge: form.badge || undefined,
      sizePrices: Object.keys(sizePrices).length > 0 ? sizePrices : undefined,
      sizeMeasurements: Object.keys(form.sizeMeasurements).length > 0 ? form.sizeMeasurements : undefined,
      sizeTemplateId: form.sizeTemplateId || undefined,
      videoUrl: form.videoUrl || undefined,
      returnPolicy: form.returnPolicy || undefined,
      images: form.images.length > 0 ? form.images : undefined,
      isBundle: form.isBundle,
      bundleProducts: form.isBundle ? form.bundleProducts : undefined,
      isActive: form.isActive,
      acceptPreOrder: form.acceptPreOrder,
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

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      setIsDeleting(true);
      await deleteProduct(productToDelete.slug);
      toast.success("Product deleted", {
        description: productToDelete.name,
      });
      setProductToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete product";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
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

              // Calculate total stock
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
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }}
                      />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      // 1. Direct ID & Name matching from DB
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

                      // 2. Fallback matching via slug or string
                      if (!displayParent) {
                        const cleanCat = (p.category || "").trim().toLowerCase();
                        const parentCat = categories.find(
                          (c) =>
                            c.slug.toLowerCase() === cleanCat ||
                            c.name.toLowerCase() === cleanCat ||
                            (c.id && String(c.id) === p.category)
                        );
                        displayParent = parentCat?.parentName || (parentCat?.parentSlug ? categories.find(c => c.slug === parentCat.parentSlug)?.name : null) || parentCat?.name || p.category || "Unassigned";
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
                            (c.id && String(c.id) === p.subcategory)
                        );
                        displaySub = subCat?.name || p.subcategory;
                      }

                      // Avoid duplicate display if parent and sub are same
                      if (displaySub && displayParent && displaySub.toLowerCase() === displayParent.toLowerCase()) {
                        displaySub = undefined;
                      }

                      return (
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-xs">{displayParent || "Unassigned"}</span>
                          {displaySub && (
                            <span className="text-[10px] text-muted-foreground">↳ {displaySub}</span>
                          )}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {priceRange}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {p.sizes.join(", ")}
                  </TableCell>
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
                      {/* Custom Landing Page Designer */}
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
              আপনি কি নিশ্চিত যে আপনি <span className="font-bold text-foreground">"{productToDelete?.name}"</span> প্রোডাক্টটি ডিলিট করতে চান?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg border border-destructive/20 space-y-1">
            <p className="font-bold">সতর্কবার্তা:</p>
            <p>এই প্রোডাক্টটির সাথে যদি কোনো কাস্টমার বা অ্যাডমিন অর্ডার হিস্টোরি থাকে, তাহলে ডাটাবেজ ইন্টিগ্রিটি রক্ষার স্বার্থে এটি ডিলিট করা যাবে না।</p>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSlug ? "Edit product" : "Create product"}</DialogTitle>
            <DialogDescription>
              Set a selling price for each size.
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
                                <img src={getImageUrl(p.image)} alt={p.name} className="size-6 object-cover rounded bg-muted/20" width={24} height={24} loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }} />
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
                              <img src={getImageUrl(p.image)} alt={p.name} className="size-6 object-cover rounded bg-muted/20" width={24} height={24} loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }} />
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
                <Label htmlFor="category">Category (Main) *</Label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => {
                    update("category", e.target.value);
                    update("subcategory", "");
                  }}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm font-medium"
                >
                  {parentCategories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                  {/* Also allow top-level categories if any */}
                  {categories
                    .filter((c) => !parentCategories.some((p) => p.slug.toLowerCase() === c.slug.toLowerCase()) && !c.parentSlug && !c.parentCategoryId)
                    .map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  {/* If form.category is not among the options, add it as option to prevent defaulting */}
                  {form.category && !parentCategories.some(c => c.slug.toLowerCase() === form.category.toLowerCase()) && !categories.some(c => c.slug.toLowerCase() === form.category.toLowerCase() && !c.parentSlug && !c.parentCategoryId) && (
                    <option value={form.category}>
                      {categories.find(c => c.slug.toLowerCase() === form.category.toLowerCase())?.name || form.category}
                    </option>
                  )}
                </select>
              </div>

              {availableSubCategories.length > 0 ? (
                <div className="space-y-1.5">
                  <Label htmlFor="subcategory">Sub-Category (Optional)</Label>
                  <select
                    id="subcategory"
                    value={form.subcategory || ""}
                    onChange={(e) => update("subcategory", e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm font-medium"
                  >
                    <option value="">-- None / General --</option>
                    {availableSubCategories.map((sc) => (
                      <option key={sc.slug} value={sc.slug}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Sub-Category</Label>
                  <div className="h-10 w-full rounded-md border border-dashed border-border flex items-center px-3 text-xs text-muted-foreground">
                    No sub-categories defined for this category
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <ImageUploader
                label="Featured Image"
                value={form.image}
                onChange={(val) => update("image", val)}
                folder="products"
                sublabel="Upload featured thumbnail. Supported: JPG, PNG, WEBP"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Gallery Images</Label>
              <div className="flex flex-wrap gap-3 items-center">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative size-16 rounded-md border border-border overflow-hidden group">
                    <img src={getImageUrl(img)} alt={`Gallery Preview ${idx + 1}`} className="size-full object-cover" width={64} height={64} loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }} />
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
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      const uploadedUrls: string[] = [];
                      for (const file of files) {
                        try {
                          const res = await apiClient.uploadFile(file, "products");
                          if (res?.url) uploadedUrls.push(res.url);
                        } catch {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            update("images", [...form.images, reader.result as string]);
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                      if (uploadedUrls.length > 0) {
                        update("images", [...form.images, ...uploadedUrls]);
                        toast.success(`${uploadedUrls.length} image(s) uploaded!`);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

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

            {/* Size Template Selector */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Ruler className="size-4 text-primary" />
                  <span>Size Template (সাইজ টেমপ্লেট নির্বাচন করুন)</span>
                </div>
                {form.sizeTemplateId && (
                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded border border-primary/20">
                    Template Applied
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Select a pre-configured size template to instantly auto-fill sizes and exact measurements (Chest, Length). You can still adjust individual size measurements below.
              </p>
              <select
                value={form.sizeTemplateId}
                onChange={(e) => handleApplySizeTemplate(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs font-semibold"
              >
                <option value="">-- No Template / Custom Sizing --</option>
                {sizeTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.category || "General"}) — {tpl.entries.map((e) => e.size).join(", ")}
                  </option>
                ))}
              </select>
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
                <Label htmlFor="badge">Badge (optional)</Label>
                <Input
                  id="badge"
                  value={form.badge}
                  onChange={(e) => update("badge", e.target.value)}
                  placeholder="Best seller"
                />
              </div>
            </div>

            {/* Size-Wise Measurements Table (Chest, Length, Waist) */}
            {sizesArray.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Ruler className="size-3.5 text-primary" />
                      Size-Wise Measurements (Inches &quot;)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Customer will see these exact dimensions when selecting a size on the product page.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                    <div className="col-span-2">Size</div>
                    <div className="col-span-3">Chest (&quot;)</div>
                    <div className="col-span-3">Length (&quot;)</div>
                    <div className="col-span-2">Waist (&quot;)</div>
                    <div className="col-span-2">Sleeve (&quot;)</div>
                  </div>

                  {sizesArray.map((s) => {
                    const meas = form.sizeMeasurements[s] || {};
                    return (
                      <div key={s} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-2 font-mono text-xs font-bold text-foreground">
                          {s}
                        </div>
                        <div className="col-span-3">
                          <Input
                            placeholder='e.g. 40"'
                            value={meas.chest ?? ""}
                            onChange={(e) => setSizeMeasurementField(s, "chest", e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            placeholder='e.g. 28"'
                            value={meas.length ?? ""}
                            onChange={(e) => setSizeMeasurementField(s, "length", e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder='e.g. 32"'
                            value={meas.waist ?? ""}
                            onChange={(e) => setSizeMeasurementField(s, "waist", e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            placeholder='e.g. 8"'
                            value={meas.sleeve ?? ""}
                            onChange={(e) => setSizeMeasurementField(s, "sleeve", e.target.value)}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Accept Pre-Order Toggle */}
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Accept Pre-Order (স্টক না থাকলেও অর্ডার নেওয়া হবে কি?)
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Enable to allow normal customer checkout even when stock is 0. Internally saved as Pre-Order without showing any badges to customers.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => update("acceptPreOrder", false)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      !form.acceptPreOrder
                        ? "bg-muted text-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => update("acceptPreOrder", true)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      form.acceptPreOrder
                        ? "bg-indigo-600 text-white font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>
</div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Full Description (বিস্তারিত বিবরণ)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Product detailed description..."
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

      {/* Stock Management Dialog */}
      <Dialog open={!!stockModalProduct} onOpenChange={(open) => !open && setStockModalProduct(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="size-5 text-primary" />
              <span>Manage Size-Wise Stock</span>
            </DialogTitle>
            <DialogDescription>
              Set exact inventory quantity for each size of {stockModalProduct?.name}.
            </DialogDescription>
          </DialogHeader>

          {stockModalProduct && (
            <div className="space-y-4 py-2">
              {/* Product Info Header */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
                <img
                  src={getImageUrl(stockModalProduct.image)}
                  alt={stockModalProduct.name}
                  className="size-12 rounded-md object-cover border border-border"
                  width={48}
                  height={48}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }}
                />
                <div>
                  <h4 className="font-bold text-sm text-foreground">{stockModalProduct.name}</h4>
                  <p className="text-xs text-muted-foreground capitalize">
                    Category: {stockModalProduct.category}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary/20 p-2">
                <span className="text-xs font-bold text-muted-foreground">Quick Fill:</span>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] cursor-pointer"
                    onClick={() => {
                      const updated: Record<string, number> = {};
                      stockModalProduct.sizes.forEach((s) => (updated[s] = 10));
                      setStockForm(updated);
                    }}
                  >
                    All 10
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] cursor-pointer"
                    onClick={() => {
                      const updated: Record<string, number> = {};
                      stockModalProduct.sizes.forEach((s) => (updated[s] = 50));
                      setStockForm(updated);
                    }}
                  >
                    All 50
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] text-destructive hover:text-destructive cursor-pointer"
                    onClick={() => {
                      const updated: Record<string, number> = {};
                      stockModalProduct.sizes.forEach((s) => (updated[s] = 0));
                      setStockForm(updated);
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Size Wise Stock Inputs */}
              <div className="space-y-3">
                {stockModalProduct.sizes.map((s) => {
                  const qty = stockForm[s] ?? 0;
                  return (
                    <div
                      key={s}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 font-bold text-xs text-primary">
                          {s}
                        </span>
                        <div>
                          <span className="font-semibold text-xs text-foreground">Size {s}</span>
                          <div className="flex items-center gap-1">
                            <span
                              className={`inline-block size-2 rounded-full ${
                                qty > 5
                                  ? "bg-emerald-500"
                                  : qty > 0
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                            />
                            <span className="text-[11px] text-muted-foreground">
                              {qty > 5 ? "In Stock" : qty > 0 ? "Low Stock" : "Out of Stock"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setStockForm((prev) => ({ ...prev, [s]: val }));
                          }}
                          className="h-9 w-24 text-right font-bold text-xs"
                        />
                        <span className="text-xs text-muted-foreground">pcs</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Stock Summary */}
              <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
                <span className="font-bold text-foreground">Total Product Stock:</span>
                <span className="font-bold text-sm text-primary">
                  {Object.values(stockForm).reduce((a, b) => a + b, 0)} units available
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStockModalProduct(null)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="button" onClick={saveStock} className="cursor-pointer gap-1.5">
                  <PackageCheck className="size-4" />
                  Save Inventory
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
