"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Ruler, RotateCcw, Save, Upload, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ImageUploader, getImageUrl, FALLBACK_IMAGE } from "@/components/image-uploader";
import { useProducts } from "@/lib/products-store";
import { useCategories } from "@/lib/categories-store";
import { useSettings } from "@/context/settings-context";
import { apiClient } from "@/lib/api/client";
import {
  getSizeTemplatesAction,
  SizeTemplateColumnDto,
  SizeTemplateDto,
} from "@/actions/size-templates.actions";
import { isBottomwearCategory } from "@/components/admin/settings/size-templates-tab";
import type { Product } from "@/lib/shop-data";

export type ProductFormState = {
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
  sizeMeasurements: Record<
    string,
    { chest?: string; length?: string; waist?: string; sleeve?: string; extras?: Record<string, string> }
  >;
  sizeTemplateId: string;
  videoUrl: string;
  returnPolicy: string;
  images: string[];
  isBundle: boolean;
  bundleProducts: string[];
  isActive: boolean;
  acceptPreOrder: boolean;
};

export const emptyProductForm: ProductFormState = {
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

// Map a template entry (measurements keyed by column id) to the form-shape.
export function mapTemplateMeasurementsToForm(
  measurements: Record<string, string>,
  columns: SizeTemplateColumnDto[]
): { chest: string; length: string; waist: string; sleeve: string; extras: Record<string, string> } {
  const result: { chest: string; length: string; waist: string; sleeve: string; extras: Record<string, string> } = {
    chest: "",
    length: "",
    waist: "",
    sleeve: "",
    extras: {},
  };
  const knownSlots: Record<string, keyof typeof result> = {
    chest: "chest",
    length: "length",
    waist: "waist",
    sleeve: "sleeve",
  };
  for (const col of columns) {
    if (!col.id) continue;
    const value = measurements[col.id];
    if (!value) continue;
    const key = col.name.trim().toLowerCase();
    if (key in knownSlots) {
      (result as Record<string, unknown>)[knownSlots[key]] = value;
    } else {
      result.extras[col.name] = value;
    }
  }
  return result;
}

export interface ProductFormProps {
  initialProduct?: Product | null;
  backHref?: string;
}

export function ProductForm({ initialProduct = null, backHref = "/admin/products" }: ProductFormProps) {
  const router = useRouter();
  const { addProduct, updateProduct } = useProducts();
  const { categories } = useCategories();
  const { settings } = useSettings();
  const quantityOffers = useMemo(
    () => (settings?.shipping?.quantityOffers || []).filter((o) => o.active),
    [settings?.shipping?.quantityOffers],
  );

  const editingSlug = initialProduct?.slug || null;
  const editing = Boolean(editingSlug);

  // Form state initialised from the product (edit) or default (create).
  const [form, setForm] = useState<ProductFormState>(() => buildInitialFormState(initialProduct));

  // If the product prop changes after async loading, sync the form once.
  useEffect(() => {
    if (initialProduct) {
      setForm(buildInitialFormState(initialProduct));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProduct?.slug]);

  const [sizeTemplates, setSizeTemplates] = useState<SizeTemplateDto[]>([]);
  useEffect(() => {
    getSizeTemplatesAction()
      .then((data) => setSizeTemplates(data))
      .catch((err) => console.error("Failed to load size templates:", err));
  }, []);

  // Derive parent + sub-categories for the form selects
  const parentCategories = useMemo(
    () => categories.filter((c) => !c.parentCategoryId && !c.parentSlug),
    [categories],
  );
  const availableSubCategories = useMemo(() => {
    if (!form.category) return [];
    const targetSlug = form.category.trim().toLowerCase();
    const parent = categories.find(
      (c) =>
        c.slug.toLowerCase() === targetSlug ||
        c.name.toLowerCase() === targetSlug ||
        (c.id && String(c.id) === form.category),
    );
    if (!parent) return [];
    return categories.filter(
      (c) =>
        (c.parentSlug && c.parentSlug.toLowerCase() === parent.slug.toLowerCase()) ||
        (parent.id && c.parentCategoryId === parent.id),
    );
  }, [categories, form.category]);

  const sizesArray = form.sizes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const update = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) =>
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
          [size]: { ...prevMeas, [field]: value },
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
    if (!template) {
      update("sizeTemplateId", templateId);
      return;
    }
    const templateSizes = template.entries.map((e) => e.size);
    const newSizesStr = templateSizes.join(", ");
    const copiedMeasurements: Record<
      string,
      { chest?: string; length?: string; waist?: string; sleeve?: string; extras?: Record<string, string> }
    > = {};
    template.entries.forEach((e) => {
      copiedMeasurements[e.size] = mapTemplateMeasurementsToForm(e.measurements || {}, template.columns);
    });
    setForm((f) => ({
      ...f,
      sizeTemplateId: templateId,
      sizes: newSizesStr,
      sizeMeasurements: { ...f.sizeMeasurements, ...copiedMeasurements },
    }));
    toast.success(`Applied "${template.name}" template!`, {
      description: `${template.entries.length} sizes and measurements copied to product. You can still adjust individual values if needed.`,
    });
  };

  const addBundleProduct = (slug: string) =>
    setForm((prev) => ({ ...prev, bundleProducts: [...prev.bundleProducts, slug] }));

  const removeBundleProductAtIndex = (index: number) =>
    setForm((prev) => ({ ...prev, bundleProducts: prev.bundleProducts.filter((_, i) => i !== index) }));

  const save = async (e: React.FormEvent) => {
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

    const formSellingPrice = Number(form.price) || 0;
    const firstVal = Object.values(sizePrices)[0] || formSellingPrice;
    const basePrice = sizes[0] && sizePrices[sizes[0]] ? sizePrices[sizes[0]] : firstVal;

    const mainCatObj = categories.find(
      (c) => c.slug === form.category || (c.id && String(c.id) === form.category),
    );
    const subCatObj = form.subcategory
      ? categories.find((c) => c.slug === form.subcategory || (c.id && String(c.id) === form.subcategory))
      : null;

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
      price: basePrice || formSellingPrice,
      compareAt: Number(form.compareAt) > 0 ? Number(form.compareAt) : undefined,
      mrp: Number(form.compareAt) > 0 ? Number(form.compareAt) : 0,
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

    try {
      if (editingSlug) {
        await updateProduct(editingSlug, product);
      } else {
        await addProduct(product);
      }
      toast.success(editingSlug ? "Product updated" : "Product created", {
        description: product.name,
      });
      router.push(backHref);
      router.refresh();
    } catch (error) {
      console.error("Product save failed:", error);
    }
  };

  // For the bundle product picker
  const { products } = useProducts();

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push(backHref)} className="text-xs">
          <ArrowLeft className="mr-1 size-3.5" /> Back to products
        </Button>
      </div>

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
            <div>
              <Label className="text-xs font-bold text-foreground">
                Selected Bundle Items ({form.bundleProducts.length})
              </Label>
              {form.bundleProducts.length === 0 ? (
                <p className="text-[11px] text-muted-foreground mt-1">No products added to combo yet.</p>
              ) : (
                <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {form.bundleProducts.map((slug, idx) => {
                    const p = products.find((prod) => prod.slug === slug);
                    if (!p) return null;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-card p-1.5 rounded border border-border text-xs justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={getImageUrl(p.image)}
                            alt={p.name}
                            className="size-6 object-cover rounded bg-muted/20"
                            width={24}
                            height={24}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src =
                                "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";
                            }}
                          />
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
                        <img
                          src={getImageUrl(p.image)}
                          alt={p.name}
                          className="size-6 object-cover rounded bg-muted/20"
                          width={24}
                          height={24}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";
                          }}
                        />
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
            {categories
              .filter(
                (c) =>
                  !parentCategories.some((p) => p.slug.toLowerCase() === c.slug.toLowerCase()) &&
                  !c.parentSlug &&
                  !c.parentCategoryId,
              )
              .map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            {form.category &&
              !parentCategories.some((c) => c.slug.toLowerCase() === form.category.toLowerCase()) &&
              !categories.some(
                (c) => c.slug.toLowerCase() === form.category.toLowerCase() && !c.parentSlug && !c.parentCategoryId,
              ) && (
                <option value={form.category}>
                  {categories.find((c) => c.slug.toLowerCase() === form.category.toLowerCase())?.name || form.category}
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
              <img
                src={getImageUrl(img)}
                alt={`Gallery Preview ${idx + 1}`}
                className="size-full object-cover"
                width={64}
                height={64}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";
                }}
              />
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="price">Selling Price / Regular Price (৳) *</Label>
          <Input
            id="price"
            type="number"
            min="0"
            value={form.price || ""}
            onChange={(e) => update("price", Number(e.target.value))}
            placeholder="790"
            required
          />
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
      </div>

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
          Select a pre-configured size template to instantly auto-fill sizes and exact measurements (Chest, Length). You can
          still adjust individual size measurements below.
        </p>
        <select
          key={`size-template-${sizeTemplates.length}`}
          value={form.sizeTemplateId || ""}
          onChange={(e) => handleApplySizeTemplate(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs font-semibold"
        >
          <option value="">-- No Template / Custom Sizing --</option>
          {sizeTemplates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name} — {tpl.entries.map((e) => e.size).join(", ")}
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

      {sizesArray.length > 0 &&
        (() => {
          const currentTpl = sizeTemplates.find((t) => t.id === form.sizeTemplateId);
          const isBottomwear =
            isBottomwearCategory(form.category) ||
            isBottomwearCategory(currentTpl?.name) ||
            isBottomwearCategory(form.name);

          return (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Ruler className="size-3.5 text-primary" />
                    {isBottomwear
                      ? "Pants / Bottomwear Measurements (Inches \")"
                      : "Size-Wise Measurements (Inches \")"}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {isBottomwear
                      ? "Enter Waist, Length, Hip/Thigh, and Inseam for pants."
                      : "Customer will see these exact dimensions when selecting a size on the product page."}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                  <div className="col-span-2">Size</div>
                  {isBottomwear ? (
                    <>
                      <div className="col-span-3">Waist (&quot;)</div>
                      <div className="col-span-3">Length (&quot;)</div>
                      <div className="col-span-2">Hip/Thigh (&quot;)</div>
                      <div className="col-span-2">Inseam (&quot;)</div>
                    </>
                  ) : (
                    <>
                      <div className="col-span-3">Chest (&quot;)</div>
                      <div className="col-span-3">Length (&quot;)</div>
                      <div className="col-span-2">Waist (&quot;)</div>
                      <div className="col-span-2">Sleeve (&quot;)</div>
                    </>
                  )}
                </div>

                {sizesArray.map((s) => {
                  const meas = form.sizeMeasurements[s] || {};
                  return (
                    <div key={s} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2 font-mono text-xs font-bold text-foreground">{s}</div>
                      {isBottomwear ? (
                        <>
                          <div className="col-span-3">
                            <Input
                              placeholder='e.g. 32"'
                              value={meas.waist ?? ""}
                              onChange={(e) => setSizeMeasurementField(s, "waist", e.target.value)}
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              placeholder='e.g. 40"'
                              value={meas.length ?? ""}
                              onChange={(e) => setSizeMeasurementField(s, "length", e.target.value)}
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              placeholder='e.g. 40"'
                              value={meas.chest ?? ""}
                              onChange={(e) => setSizeMeasurementField(s, "chest", e.target.value)}
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              placeholder='e.g. 14"'
                              value={meas.sleeve ?? ""}
                              onChange={(e) => setSizeMeasurementField(s, "sleeve", e.target.value)}
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      <div className="rounded-xl border border-border/60 bg-secondary/20 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
              Accept Pre-Order (স্টক না থাকলেও অর্ডার নেওয়া হবে কি?)
            </Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Enable to allow normal customer checkout even when stock is 0. Internally saved as Pre-Order without showing
              any badges to customers.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg p-1 shrink-0">
            <button
              type="button"
              onClick={() => update("acceptPreOrder", false)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                !form.acceptPreOrder ? "bg-muted text-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
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
          <div className="flex items-center justify-between">
            <Label>Size-wise selling prices (৳)</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary hover:text-primary"
              onClick={() => {
                setForm((f) => ({ ...f, sizePrices: {} }));
                toast.info("Size overrides cleared. All sizes will sell at the base price.");
              }}
            >
              <RotateCcw className="mr-1 size-3" />
              Reset to base price
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave blank to sell each size at the base price (৳{Number(form.price) || 0}). Enter a value here to override per
            size.
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
                  placeholder={String(Number(form.price) || 0)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t mt-2">
        <Button type="button" variant="outline" onClick={() => router.push(backHref)}>
          <X className="mr-1 size-4" />
          Cancel
        </Button>
        <Button type="submit">
          {editing ? (
            <>
              <Save className="mr-1 size-4" /> Save changes
            </>
          ) : (
            <>
              <Plus className="mr-1 size-4" /> Create product
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function buildInitialFormState(p: Product | null): ProductFormState {
  if (!p) {
    return { ...emptyProductForm };
  }

  // Best-effort category resolution (matches the old openEdit logic)
  let selectedMainCat = "";
  let selectedSubCat = "";
  // Note: parent category derivation needs the categories list. We only set raw slugs/names here.
  if (p.category) selectedMainCat = p.category;
  if (p.subcategory) selectedSubCat = p.subcategory;

  const sizeMeasurements: ProductFormState["sizeMeasurements"] = {};
  if (p.sizeMeasurements) {
    for (const [s, m] of Object.entries(p.sizeMeasurements)) {
      sizeMeasurements[s] = {
        chest: m.chest || "",
        length: m.length || "",
        waist: m.waist || "",
        sleeve: m.sleeve || "",
        extras: m.extras || {},
      };
    }
  }

  return {
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
    sizeMeasurements,
    sizeTemplateId: p.sizeTemplateId || "",
    videoUrl: p.videoUrl ?? "",
    returnPolicy: p.returnPolicy ?? "",
    images: p.images ?? [],
    isBundle: p.isBundle ?? false,
    bundleProducts: p.bundleProducts ?? [],
    isActive: p.isActive !== false,
    acceptPreOrder: p.acceptPreOrder ?? (p.badge?.includes("PREORDER_ENABLED") ?? false),
  };
}
