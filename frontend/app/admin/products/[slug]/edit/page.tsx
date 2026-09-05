"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Package, RefreshCw } from "lucide-react";
import { ProductForm } from "@/components/admin/products/product-form";
import { useProducts } from "@/lib/products-store";
import type { Product } from "@/lib/shop-data";

export default function EditProductPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug;
  const { products, isLoading } = useProducts();
  const [product, setProduct] = useState<Product | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!slug) return;
    const found = products.find((p) => p.slug === slug) || null;
    setProduct(found);
    setChecked(true);
  }, [slug, products, isLoading]);

  if (!checked && isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 shadow-xs text-center text-muted-foreground text-xs">
        <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" /> Loading product...
      </div>
    );
  }

  if (checked && !product) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 shadow-xs text-center text-destructive text-sm">
        Product not found.
        <div className="mt-3">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="text-xs underline"
          >
            Back to products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
          <Package className="size-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Edit Product</h3>
          <p className="text-xs text-muted-foreground">
            Editing &quot;{product?.name}&quot;. Update the details below and save.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        {product ? <ProductForm initialProduct={product} /> : null}
      </div>
    </div>
  );
}
