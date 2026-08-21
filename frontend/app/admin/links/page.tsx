"use client";

import { Check, Copy, ExternalLink, Link as LinkIcon, Package, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { comboOffers, formatBDT } from "@/lib/shop-data";
import { useProducts } from "@/lib/products-store";
import { getImageUrl, handleImageError } from "@/lib/utils";

export default function AdminLinks() {
  const { products, isLoading } = useProducts();
  const [origin, setOrigin] = useState("");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const copy = async (path: string, label: string) => {
    const url = `${origin || "https://arzamart.com"}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPath(path);
      toast.success("Link copied to clipboard", { description: label });
      setTimeout(() => setCopiedPath((prev) => (prev === path ? null : prev)), 2000);
    } catch {
      toast.error("Couldn't copy — please select the link text manually.");
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <LinkIcon className="size-5 text-primary" />
            <span>Shareable Links & Landing Pages</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            প্রচার ও বিজ্ঞাপনের জন্য পণ্যের সরাসরি শেয়ারেবল ও ল্যান্ডিং পেজ লিংক কপি করুন
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="পণ্য বা স্লাগ খুঁজুন..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">ছবি</TableHead>
              <TableHead>পণ্য ও বিবরণ</TableHead>
              <TableHead>মূল্য</TableHead>
              <TableHead>শেয়ারেবল লিংকসমূহ</TableHead>
              <TableHead className="text-right">একশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                  পণ্য তালিকা লোড হচ্ছে...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                  কোনো পণ্য পাওয়া যায়নি।
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((p) => {
                const imgSource = (p as { imageUrl?: string; image?: string }).imageUrl || p.image;
                const clpPath = `/clp/${p.slug}`;
                const promoPath = `/promotion/${p.slug}`;
                const isClpCopied = copiedPath === clpPath;
                const isPromoCopied = copiedPath === promoPath;

                return (
                  <TableRow key={p.slug} className="hover:bg-muted/30 transition-colors">
                    {/* Product Image Thumbnail */}
                    <TableCell className="align-middle">
                      <div className="size-12 rounded-lg border border-border bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center">
                        {imgSource ? (
                          <img
                            src={getImageUrl(imgSource, "thumb")}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        ) : (
                          <Package className="size-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>

                    {/* Product Info */}
                    <TableCell className="align-middle">
                      <div className="space-y-1">
                        <p className="font-bold text-xs sm:text-sm text-foreground leading-tight">
                          {p.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                          <span>/{p.slug}</span>
                          {p.category && (
                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold">
                              {p.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="align-middle text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
                      {formatBDT(p.price)}
                    </TableCell>

                    {/* Links */}
                    <TableCell className="align-middle">
                      <div className="space-y-1.5 max-w-xs sm:max-w-md">
                        {/* Custom Landing Page (CLP) */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                            CLP Landing
                          </span>
                          <span className="font-mono text-xs text-muted-foreground truncate flex-1">
                            {clpPath}
                          </span>
                        </div>

                        {/* Promotion Page */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase bg-blue-500/10 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 shrink-0">
                            Promo Page
                          </span>
                          <span className="font-mono text-xs text-muted-foreground truncate flex-1">
                            {promoPath}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="align-middle text-right whitespace-nowrap">
                      <div className="inline-flex flex-col sm:flex-row items-end sm:items-center gap-1.5">
                        {/* Copy CLP Button */}
                        <button
                          type="button"
                          onClick={() => copy(clpPath, `CLP Link: ${p.name}`)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                            isClpCopied
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "border-border bg-background hover:border-emerald-600 hover:text-emerald-600"
                          }`}
                          title="Copy CLP Landing Page Link"
                        >
                          {isClpCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                          <span>CLP Link</span>
                        </button>

                        {/* Copy Promo Button */}
                        <button
                          type="button"
                          onClick={() => copy(promoPath, `Promo Link: ${p.name}`)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                            isPromoCopied
                              ? "bg-primary text-white border-primary"
                              : "border-border bg-background hover:border-primary hover:text-primary"
                          }`}
                          title="Copy Promotion Page Link"
                        >
                          {isPromoCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                          <span>Promo</span>
                        </button>

                        {/* Open in new tab */}
                        <a
                          href={clpPath}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Open CLP in new tab"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Combo Offer Links */}
      {comboOffers && comboOffers.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 bg-muted/20">
            <LinkIcon className="size-4 text-primary" />
            <p className="text-sm font-bold text-foreground">Combo Offer Links</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">ছবি</TableHead>
                <TableHead>বান্ডেল প্যাকেজ</TableHead>
                <TableHead>মূল্য</TableHead>
                <TableHead>অফার লিংক</TableHead>
                <TableHead className="text-right">একশন</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comboOffers.map((c) => {
                const offerPath = `/offer/${c.slug}`;
                const isOfferCopied = copiedPath === offerPath;

                return (
                  <TableRow key={c.slug} className="hover:bg-muted/30 transition-colors">
                    {/* Bundle Image */}
                    <TableCell className="align-middle">
                      <div className="size-12 rounded-lg border border-border bg-muted/40 overflow-hidden shrink-0 flex items-center justify-center">
                        {c.image ? (
                          <img
                            src={getImageUrl(c.image, "thumb")}
                            alt={c.title}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        ) : (
                          <Package className="size-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>

                    {/* Bundle Title */}
                    <TableCell className="align-middle">
                      <div className="space-y-0.5">
                        <p className="font-bold text-xs sm:text-sm text-foreground">{c.title}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">/{c.slug}</p>
                      </div>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="align-middle text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
                      {formatBDT(c.price)}
                    </TableCell>

                    {/* Link */}
                    <TableCell className="align-middle font-mono text-xs text-muted-foreground truncate max-w-xs">
                      {offerPath}
                    </TableCell>

                    {/* Action */}
                    <TableCell className="align-middle text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => copy(offerPath, `Combo: ${c.title}`)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                            isOfferCopied
                              ? "bg-primary text-white border-primary"
                              : "border-border bg-background hover:border-primary hover:text-primary"
                          }`}
                        >
                          {isOfferCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                          <span>Copy Link</span>
                        </button>
                        <a
                          href={offerPath}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Open offer in new tab"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
