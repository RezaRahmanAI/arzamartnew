"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit3, Trash2, ExternalLink, Globe, CheckCircle2, XCircle, Search, Layers } from "lucide-react";
import { landingPagesService, type LandingPageItem } from "@/lib/api/services/landing-pages.service";
import { productsService } from "@/lib/api/services/products.service";
import type { Product } from "@/lib/shop-data";

export default function AdminLandingPagesPage() {
  const [pages, setPages] = useState<LandingPageItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<LandingPageItem> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [landingRes, productsRes] = await Promise.all([
        landingPagesService.getAll(),
        productsService.getAll(),
      ]);
      setPages(landingRes || []);
      setProducts((productsRes || []) as unknown as Product[]);
    } catch (err) {
      console.error("Failed to load landing pages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem({
      title: "",
      slug: "",
      heroTitle: "",
      heroSubtitle: "",
      heroImageUrl: "",
      contentJson: JSON.stringify(
        {
          highlights: [
            "100% Premium Combed Cotton Fabric",
            "Super Soft & Breathable for Summer Heat",
            "Color Guarantee Wash after Wash",
            "Fast 24-48 Hours Express Delivery Across Bangladesh",
          ],
          urgencyMessage: "🔥 Eid Special Offer: Buy 2 Get Free Express Delivery!",
          videoUrl: "",
        },
        null,
        2
      ),
      isActive: true,
      productId: products[0]?.slug || "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: LandingPageItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title) return;
    setSaving(true);
    try {
      await landingPagesService.upsert(editingItem);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save landing page.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this landing page?")) return;
    try {
      await landingPagesService.delete(id);
      fetchData();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete landing page.");
    }
  };

  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Custom Landing Pages</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create high-converting, custom product landing pages with instant checkout forms.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          <Plus className="h-4 w-4" /> Create New Landing Page
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search landing pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-black dark:border-gray-800 dark:bg-gray-900 dark:focus:border-white"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
            <tr>
              <th className="px-6 py-4">Title & Slug</th>
              <th className="px-6 py-4">Linked Product</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                  Loading landing pages...
                </td>
              </tr>
            ) : filteredPages.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                  No landing pages found. Create your first custom landing page!
                </td>
              </tr>
            ) : (
              filteredPages.map((page) => {
                const linkedProduct = products.find((p) => p.slug === page.productId);
                return (
                  <tr key={page.id} className="transition hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{page.title}</div>
                      <div className="text-xs text-gray-400">/landing/{page.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      {linkedProduct ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{linkedProduct.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not linked</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {page.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          <XCircle className="size-3.5" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/landing/${page.slug}`}
                          target="_blank"
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                          title="Preview"
                        >
                          <ExternalLink className="size-4" />
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(page)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                          title="Edit"
                        >
                          <Edit3 className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(page.id)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              {editingItem.id ? "Edit Landing Page" : "Create Landing Page"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Landing Page Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.title || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    placeholder="royal-panjabi-eid (Auto generated if empty)"
                    value={editingItem.slug || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, slug: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Linked Product *
                  </label>
                  <select
                    value={editingItem.productId || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, productId: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select Linked Product...</option>
                    {products.map((p: Product) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name} (৳{p.price || 0})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Hero Headline Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Experience Ultimate Elegance & Comfort"
                  value={editingItem.heroTitle || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, heroTitle: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Hero Subtitle / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Short engaging description for customers..."
                  value={editingItem.heroSubtitle || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, heroSubtitle: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Custom Hero Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={editingItem.heroImageUrl || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, heroImageUrl: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Custom Content & Highlights (JSON Format)
                </label>
                <textarea
                  rows={5}
                  value={editingItem.contentJson || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, contentJson: e.target.value })}
                  className="w-full font-mono text-xs rounded-xl border border-gray-200 p-3 outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingItem.isActive ?? true}
                  onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active & Publicly Accessible
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  {saving ? "Saving..." : "Save Landing Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
