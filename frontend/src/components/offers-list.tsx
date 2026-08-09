"use client";

import { useProducts } from "@/lib/products-store";
import { ProductCard } from "@/components/product-card";

export function OffersList() {
  const { products } = useProducts();

  // Filter for bundle products
  const bundles = products.filter((p) => p.isBundle && p.isActive !== false);

  if (bundles.length === 0) {
    return (
      <div className="mt-12 text-center py-12 border border-dashed border-border rounded-2xl bg-secondary/20">
        <p className="text-muted-foreground text-sm">No exclusive bundles available right now. Check back later!</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="section-title border-l-4 border-primary">Exclusive Bundles</h2>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {bundles.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
