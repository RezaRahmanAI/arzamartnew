"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { getCategory, type Product } from "@/lib/shop-data";
import { useProducts } from "@/lib/products-store";


export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { products } = useProducts();
  const category = getCategory(slug);

  if (!category) {
    notFound();
  }

  const items = products.filter((p) => p.category === slug && p.isActive !== false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{category.name}</span>
      </nav>

      <h1 className="section-title mt-4 border-l-4 border-primary">{category.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {category.blurb} · {items.length} product{items.length === 1 ? "" : "s"}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {(items as Product[]).map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}
