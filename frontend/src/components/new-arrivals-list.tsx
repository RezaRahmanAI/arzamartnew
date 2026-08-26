"use client";

import { useProducts } from "@/lib/products-store";
import { ProductCard } from "@/components/product-card";
import { Sparkles } from "lucide-react";

export function NewArrivalsList() {
  const { products, isLoading } = useProducts();

  // Filter for active latest products
  const arrivals = products.filter((p) => p.isActive !== false);

  if (isLoading) {
    return (
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-72 rounded-2xl bg-secondary/40 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (arrivals.length === 0) {
    return (
      <div className="mt-12 text-center py-12 border border-dashed border-border rounded-2xl bg-secondary/20">
        <Sparkles className="mx-auto size-8 text-muted-foreground opacity-50 mb-2" />
        <p className="text-muted-foreground text-sm font-medium">
          No new arrival products found. Stay tuned for our upcoming collections!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="section-title border-l-4 border-primary">Fresh Collections</h2>
        <span className="text-xs font-semibold text-muted-foreground">
          Showing {arrivals.length} {arrivals.length === 1 ? "product" : "products"}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {arrivals.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
