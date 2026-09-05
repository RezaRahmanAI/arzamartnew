"use client";

import { Plus, Package } from "lucide-react";
import { ProductForm } from "@/components/admin/products/product-form";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
          <Package className="size-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Create Product</h3>
          <p className="text-xs text-muted-foreground">
            Add a new product to your store. Fill in the details below and save.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <ProductForm initialProduct={null} />
      </div>
    </div>
  );
}
