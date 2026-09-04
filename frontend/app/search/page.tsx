"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ProductCard } from "@/components/product-card";
import { useProducts } from "@/lib/products-store";
import { products as fallbackProducts } from "@/lib/shop-data";

function SearchContent() {
  const { products, isLoading } = useProducts();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const term = q.trim().toLowerCase();

  const sourceProducts = products && products.length > 0 ? products : fallbackProducts;

  const results = term
    ? sourceProducts.filter(
        (p) =>
          p.isActive !== false &&
          (p.name.toLowerCase().includes(term) ||
            (p.category && p.category.toLowerCase().includes(term)) ||
            (p.subcategory && p.subcategory.toLowerCase().includes(term)) ||
            (p.description && p.description.toLowerCase().includes(term)) ||
            (p.badge && p.badge.toLowerCase().includes(term)))
      )
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="section-title border-l-4 border-primary">
        {term ? `Results for “${q}”` : "Search"}
      </h1>
      {term && (
        <p className="mt-2 text-sm text-muted-foreground">
          {results.length} product{results.length === 1 ? "" : "s"} found
        </p>
      )}

      {results.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <p className="text-sm text-muted-foreground">
            {term ? "No products matched that search." : "Type something in the search bar above."}
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Back to home
          </Link>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8 text-sm">Loading search results...</div>}>
      <SearchContent />
    </Suspense>
  );
}
