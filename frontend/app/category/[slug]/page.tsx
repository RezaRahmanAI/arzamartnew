"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { type Product } from "@/lib/shop-data";
import { useProducts } from "@/lib/products-store";
import { useCategories } from "@/lib/categories-store";

export default function CategoryPage() {
  const params = useParams();
  const slug = (params.slug as string)?.toLowerCase();
  const { products } = useProducts();
  const { categories } = useCategories();
  const [selectedSubCat, setSelectedSubCat] = useState<string>("ALL");

  const category = useMemo(() => {
    return categories.find((c) => c.slug.toLowerCase() === slug);
  }, [categories, slug]);

  // Find sub-categories under this category (if it is a parent)
  const childCategories = useMemo(() => {
    if (!category) return [];
    return categories.filter(
      (c) => c.parentSlug === category.slug || (category.id && c.parentCategoryId === category.id)
    );
  }, [categories, category]);

  const items = useMemo(() => {
    return products.filter((p) => {
      if (p.isActive === false) return false;
      const matchesMain = p.category?.toLowerCase() === slug;
      const matchesSub = p.subcategory?.toLowerCase() === slug;
      if (!matchesMain && !matchesSub) return false;

      if (selectedSubCat !== "ALL") {
        return p.subcategory?.toLowerCase() === selectedSubCat.toLowerCase();
      }
      return true;
    });
  }, [products, slug, selectedSubCat]);

  if (!category && categories.length > 0) {
    notFound();
  }

  const categoryName = category?.name || slug;
  const categoryBlurb = category?.blurb || `Explore our ${categoryName} collection`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        {category?.parentSlug && (
          <>
            <Link href={`/category/${category.parentSlug}`} className="hover:text-primary capitalize">
              {category.parentName || category.parentSlug}
            </Link>
            <span className="mx-1.5">/</span>
          </>
        )}
        <span className="text-foreground">{categoryName}</span>
      </nav>

      <div className="mt-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="section-title border-l-4 border-primary">{categoryName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {categoryBlurb} · {items.length} product{items.length === 1 ? "" : "s"}
          </p>
        </div>

        {childCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubCat("ALL")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                selectedSubCat === "ALL"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              All {categoryName}
            </button>
            {childCategories.map((sub) => (
              <button
                key={sub.slug}
                onClick={() => setSelectedSubCat(sub.slug)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  selectedSubCat === sub.slug
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-12 text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-sm font-medium text-foreground">No products found in this category.</p>
          <p className="text-xs text-muted-foreground mt-1">Check back soon for new arrivals.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(items as Product[]).map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
