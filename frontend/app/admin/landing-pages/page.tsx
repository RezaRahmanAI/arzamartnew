"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Search,
  Layers,
  X,
  Check,
  Star,
  Disc,
  Copy,
} from "lucide-react";
import { landingPagesService, type LandingPageItem } from "@/lib/api/services/landing-pages.service";
import { productsService, type RawApiProduct } from "@/lib/api/services/products.service";
import { apiClient } from "@/lib/api/client";


/* ─── Types ─── */

type IconType = "checkmark" | "bullet" | "star" | "number";

export type LandingSection = {
  id: string;
  type?: "features" | "banner";
  title?: string;
  iconType?: IconType;
  items?: string[];
  bannerImageUrl?: string;
  bannerAlt?: string;
  bannerLinkUrl?: string;
};

/* ─── Helpers ─── */

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/* ─── Main Component ─── */

export default function AdminLandingPagesPage() {
  const [pages, setPages] = useState<LandingPageItem[]>([]);
  const [products, setProducts] = useState<RawApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [slug, setSlug] = useState("");
  const [productId, setProductId] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [specialPrice, setSpecialPrice] = useState(0);
  const [oldPrice, setOldPrice] = useState(0);
  const [callButtonText, setCallButtonText] = useState("অর্ডার করুন");
  const [isActive, setIsActive] = useState(true);

  // Dynamic Sections (Feature blocks + Banner blocks)
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [landingRes, productsRes] = await Promise.all([
        landingPagesService.getAll(),
        apiClient.get<RawApiProduct[] | { value?: { items?: RawApiProduct[] }; items?: RawApiProduct[] }>("/products?pageIndex=1&pageSize=200"),
      ]);
      setPages(landingRes || []);

      let items: RawApiProduct[] = [];
      if (Array.isArray(productsRes)) {
        items = productsRes;
      } else if (productsRes?.value && Array.isArray(productsRes.value.items)) {
        items = productsRes.value.items;
      } else if (productsRes && Array.isArray(productsRes.items)) {
        items = productsRes.items;
      }
      setProducts(items);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ─── Auto Fill from Product ─── */

  const autoFillFromProduct = (pSlugOrId: string) => {
    const p = products.find((prod) => prod.id === pSlugOrId || prod.slug === pSlugOrId);
    if (!p) return;
    setProductId(p.id || p.slug);
    setTitle(p.name);
    setSubtitle(p.shortDescription || `${p.name} — প্রিমিয়াম কোয়ালিটি, সেরা দামে`);
    setHeroTitle(p.name);
    setHeroSubtitle(p.shortDescription || "");
    setHeroImageUrl(p.mainImageUrl || p.images?.[0] || "");
    setSlug(generateSlug(p.name) + "-offer");
    const sell = p.discountPrice || p.basePrice || 0;
    const mrp = p.basePrice || (sell > 0 ? Math.round(sell * 1.35) : 0);
    setSpecialPrice(sell);
    setOldPrice(mrp > sell ? mrp : sell);
  };

  /* ─── Modal Openers ─── */

  const openCreateModal = () => {
    setEditingId(null);
    setProductDropdownOpen(false);
    const defaultProduct = products[0];
    setProductId(defaultProduct?.id || defaultProduct?.slug || "");

    if (defaultProduct) {
      autoFillFromProduct(defaultProduct.id || defaultProduct.slug);
    } else {
      setTitle("New Landing Page");
      setSubtitle("");
      setSlug(`offer-${Date.now()}`);
      setHeroTitle("");
      setHeroSubtitle("");
      setHeroImageUrl("");
      setSpecialPrice(0);
      setOldPrice(0);
    }

    setVideoUrl("");
    setCallButtonText("অর্ডার করুন");
    setIsActive(true);

    setSections([
      {
        id: "sec-1",
        type: "features",
        title: "পণ্যটির বিশেষত্বসমূহ",
        iconType: "checkmark",
        items: [
          "100% Premium Quality Material",
          "Color Guarantee — Wash after Wash",
          "সারাদেশে ক্যাশ অন ডেলিভারি",
        ],
      },
    ]);

    setIsModalOpen(true);
  };

  const openEditModal = (item: LandingPageItem) => {
    setEditingId(item.id);
    setProductDropdownOpen(false);
    setTitle(item.title);
    setSubtitle(item.subtitle || "");
    setSlug(item.slug);
    setProductId(item.productId || "");
    setHeroTitle(item.heroTitle);
    setHeroSubtitle(item.heroSubtitle);
    setHeroImageUrl(item.heroImageUrl);
    setVideoUrl(item.videoUrl || "");
    setSpecialPrice(item.specialPrice || 0);
    setOldPrice(item.oldPrice || 0);
    setCallButtonText(item.callButtonText || "অর্ডার করুন");
    setIsActive(item.isActive);

    // Parse Sections
    try {
      if (item.sectionsJson) {
        setSections(JSON.parse(item.sectionsJson));
      } else if (item.contentJson) {
        const content = JSON.parse(item.contentJson);
        if (content.highlights?.length > 0) {
          setSections([
            {
              id: "sec-1",
              type: "features",
              title: "পণ্যটির বিশেষত্বসমূহ",
              iconType: "checkmark",
              items: content.highlights,
            },
          ]);
        } else {
          setSections([]);
        }
      } else {
        setSections([]);
      }
    } catch {
      setSections([]);
    }

    setIsModalOpen(true);
  };

  /* ─── Section Management ─── */

  const addFeatureSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: `sec-${Date.now()}`,
        type: "features",
        title: `নতুন ফিচার সেকশন ${prev.length + 1}`,
        iconType: "checkmark",
        items: ["নতুন পয়েন্ট লিখুন..."],
      },
    ]);
  };

  const addBannerSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: `sec-${Date.now()}`,
        type: "banner",
        bannerImageUrl: "",
        bannerAlt: "Offer Banner",
        bannerLinkUrl: "#order-form",
      },
    ]);
  };

  const updateSectionTitle = (secId: string, newTitle: string) => {
    setSections((prev) => prev.map((s) => (s.id === secId ? { ...s, title: newTitle } : s)));
  };

  const updateSectionIcon = (secId: string, iconType: IconType) => {
    setSections((prev) => prev.map((s) => (s.id === secId ? { ...s, iconType } : s)));
  };

  const updateBannerSection = (secId: string, field: "bannerImageUrl" | "bannerAlt" | "bannerLinkUrl", val: string) => {
    setSections((prev) => prev.map((s) => (s.id === secId ? { ...s, [field]: val } : s)));
  };

  const addSectionItem = (secId: string, text: string) => {
    if (!text.trim()) return;
    setSections((prev) =>
      prev.map((s) => (s.id === secId ? { ...s, items: [...(s.items || []), text.trim()] } : s))
    );
  };

  const removeSectionItem = (secId: string, itemIndex: number) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId ? { ...s, items: (s.items || []).filter((_, idx) => idx !== itemIndex) } : s
      )
    );
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    setSections((prev) => {
      const next = [...prev];
      const targetIdx = direction === "up" ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const deleteSection = (secId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== secId));
  };

  /* ─── Submit ─── */

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug) return;
    setSaving(true);

    const firstFeatureSection = sections.find((s) => s.type !== "banner");
    const firstSectionItems = firstFeatureSection?.items || [];

    const payload: Partial<LandingPageItem> = {
      ...(editingId ? { id: editingId } : {}),
      title,
      subtitle,
      slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
      productId: productId || undefined,
      heroTitle,
      heroSubtitle,
      heroImageUrl,
      videoUrl,
      contentJson: JSON.stringify({ highlights: firstSectionItems, videoUrl }),
      sectionsJson: JSON.stringify(sections),
      specialPrice: Number(specialPrice) || 0,
      oldPrice: Number(oldPrice) || 0,
      deliveryCharge: 0,
      callButtonText,
      isActive,
    };

    try {
      await landingPagesService.upsert(payload);
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

  const copyShareLink = (slugName: string) => {
    const url = `${window.location.origin}/landing/${slugName}`;
    navigator.clipboard.writeText(url);
    alert(`লিংক কপি হয়েছে: ${url}`);
  };

  const filteredPages = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProductObj = products.find((p) => p.id === productId || p.slug === productId);

  /* ─── Render ─── */

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Product Landing Page Builder
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            স্মার্ট প্রোডাক্ট সিলেকশন, কাস্টম ব্যানার ও ফিচার সেকশন সহ প্রতিটি প্রোডাক্টের জন্য আকর্ষণীয় ল্যান্ডিং পেজ তৈরি করুন।
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          <Plus className="h-4 w-4" /> নতুন ল্যান্ডিং পেজ তৈরি করুন
        </button>
      </div>

      {/* Search */}
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
                const linkedProduct = products.find((p) => p.id === page.productId || p.slug === page.productId);
                return (
                  <tr
                    key={page.id}
                    className="transition hover:bg-gray-50/50 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {page.heroImageUrl && (
                          <img
                            src={page.heroImageUrl}
                            alt={page.title}
                            className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                            width={40}
                            height={40}
                            loading="lazy"
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }}
                          />
                        )}
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {page.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                              /landing/{page.slug}
                            </span>
                            <button
                              onClick={() => copyShareLink(page.slug)}
                              className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                              title="Copy Link"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {linkedProduct ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={linkedProduct.mainImageUrl || linkedProduct.images?.[0] || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"}
                            alt={linkedProduct.name}
                            className="h-7 w-7 rounded-md object-cover border border-gray-200 dark:border-gray-700"
                          />
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {linkedProduct.name}
                          </span>
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
                          onClick={() => openEditModal(page)}
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

      {/* ═══════════════════ Builder Modal ═══════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? "ল্যান্ডিং পেজ এডিট করুন" : "নতুন ল্যান্ডিং পেজ তৈরি করুন"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-5">
              {/* ── 1. Smart Product Selector Dropdown with Image + Name Only ── */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3 dark:bg-amber-950/20 dark:border-amber-900/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    ১. প্রোডাক্ট নির্বাচন করুন *
                  </label>
                  {productId && (
                    <button
                      type="button"
                      onClick={() => autoFillFromProduct(productId)}
                      className="text-xs font-bold text-amber-700 hover:underline dark:text-amber-400"
                    >
                      ⚡ প্রোডাক্ট তথ্য দিয়ে অটো-ফিল করুন
                    </button>
                  )}
                </div>

                {/* Custom Visual Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                    className="flex h-12 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-semibold outline-none transition hover:border-gray-400 focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white dark:focus:border-white"
                  >
                    {selectedProductObj ? (
                      <div className="flex items-center gap-3 truncate">
                        <img
                          src={selectedProductObj.mainImageUrl || selectedProductObj.images?.[0] || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"}
                          alt={selectedProductObj.name}
                          className="h-8 w-8 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }}
                        />
                        <span className="truncate font-bold text-gray-900 dark:text-white">
                          {selectedProductObj.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">একটি প্রোডাক্ট সিলেক্ট করুন...</span>
                    )}
                    <span className="ml-2 text-xs text-gray-400">▼</span>
                  </button>

                  {productDropdownOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                      {products.map((p) => {
                        const isSelected = p.id === productId || p.slug === productId;
                        const pImg = p.mainImageUrl || p.images?.[0] || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";
                        return (
                          <div
                            key={p.slug || p.id}
                            onClick={() => {
                              setProductId(p.id || p.slug);
                              autoFillFromProduct(p.id || p.slug);
                              setProductDropdownOpen(false);
                            }}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition ${
                              isSelected
                                ? "bg-amber-500/10 font-bold text-amber-700 dark:text-amber-400"
                                : "hover:bg-gray-100 text-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/60"
                            }`}
                          >
                            <img
                              src={pImg}
                              alt={p.name}
                              className="h-8 w-8 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }}
                            />
                            <span className="truncate flex-1">{p.name}</span>
                            {isSelected && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  💡 প্রোডাক্ট সিলেক্ট করলে এর <strong>নাম</strong>, <strong>বিবরণ</strong>,{" "}
                  <strong>ছবি</strong> ও <strong>সাইজ অনুযায়ী দাম</strong> স্বয়ংক্রিয়ভাবে সেট হয়ে যাবে।
                </p>
              </div>

              {/* ── Main Headline ── */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  প্রধান হেডিং (Main Headline) *
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="যেমন: Premium Cotton T-Shirt — ঈদ স্পেশাল অফার!"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-semibold outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* ── Subtitle ── */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  সাব-হেডিং / বিবরণ
                </label>
                <textarea
                  rows={2}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="প্রোডাক্টের সংক্ষিপ্ত বিবরণ..."
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* ── Hero Title & Subtitle (visible on page) ── */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Hero Title
                  </label>
                  <input
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="Hero section title"
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Hero Subtitle
                  </label>
                  <input
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    placeholder="Hero section subtitle"
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              {/* ── Slug ── */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  ইউনিক শেয়ারেবল লিংক (Slug) *
                </label>
                <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 dark:border-gray-800 dark:bg-gray-800">
                  <span className="text-xs text-gray-400 font-mono">/landing/</span>
                  <input
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="premium-tshirt-offer"
                    className="h-10 w-full bg-transparent font-mono text-xs font-bold text-gray-900 outline-none dark:text-white"
                  />
                </div>
              </div>

              {/* ── Hero Image with Preview & Video URL ── */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    হিরো ব্যানার ছবি
                  </label>
                  <div className="flex gap-3 items-center">
                    <div className="h-14 w-14 rounded-xl border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center shrink-0 dark:border-gray-700 dark:bg-gray-800">
                      {heroImageUrl ? (
                        <img
                          src={heroImageUrl}
                          alt="Hero Preview"
                          className="h-full w-full object-cover"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }}
                        />
                      ) : (
                        <span className="text-[10px] text-gray-400">No Image</span>
                      )}
                    </div>
                    <input
                      value={heroImageUrl}
                      onChange={(e) => setHeroImageUrl(e.target.value)}
                      placeholder="ইমেজ লিংক (https://...)"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    ইউটিউব ভিডিও Embed URL (ঐচ্ছিক)
                  </label>
                  <input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/embed/..."
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              {/* ── Pricing & Variant Breakdown ── */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                    💰 প্রাইসিং ও ভ্যারিয়েন্ট প্রিভিউ (Size & Color Default Setting)
                  </label>
                  {selectedProductObj && (
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">
                      প্রোডাক্ট লিঙ্কড ✓
                    </span>
                  )}
                </div>

                {/* Size-wise Price & Stock Preview from selected product */}
                {selectedProductObj?.variants && selectedProductObj.variants.length > 0 && (
                  <div className="rounded-lg bg-white p-3 border border-emerald-100 dark:bg-gray-900 dark:border-gray-800 space-y-2">
                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 block">
                      📏 প্রোডাক্টের সাইজ ও সাইজ অনুযায়ী স্বয়ংক্রিয় নির্ধারিত মূল্য (Size-wise Prices):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedProductObj.variants.map((v, i) => {
                        const price = v.priceOverride && v.priceOverride > 0
                          ? v.priceOverride
                          : (selectedProductObj.discountPrice || selectedProductObj.basePrice || 0);
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                          >
                            <span className="font-extrabold text-gray-800 dark:text-gray-200">
                              {v.name.replace("Size: ", "")}:
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              ৳{price}
                            </span>
                            {v.stockQuantity !== undefined && (
                              <span className="text-[10px] text-gray-400">
                                ({v.stockQuantity} pcs)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                      মূল / ডিফল্ট অফার প্রাইস (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={specialPrice}
                      onChange={(e) => setSpecialPrice(Number(e.target.value))}
                      placeholder="যেমন: 499"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-600 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                      রেগুলার / MRP প্রাইস (৳) — স্ট্রাইকথ্রু
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={oldPrice}
                      onChange={(e) => setOldPrice(Number(e.target.value))}
                      placeholder="যেমন: 990"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-600 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  💡 ল্যান্ডিং পেজে কাস্টমার যখন নির্দিষ্ট সাইজ সিলেক্ট করবে, তখন প্রোডাক্টের ওই সাইজের দাম সরাসরি একটিভ হবে। কালারও স্বয়ংক্রিয়ভাবে ডিফল্ট সেট থাকবে।
                </p>
              </div>

              {/* ── CTA Button Text ── */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  CTA বাটন টেক্সট
                </label>
                <input
                  value={callButtonText}
                  onChange={(e) => setCallButtonText(e.target.value)}
                  placeholder="অর্ডার করুন"
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold outline-none dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* ═══ Dynamic Section & Banner Builder ═══ */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4 dark:border-gray-800 dark:bg-gray-800/30">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      কাস্টম সেকশন ও ব্যানার বিল্ডার
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={addFeatureSection}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                    >
                      <Plus className="h-3.5 w-3.5" /> + ফিচার সেকশন
                    </button>
                    <button
                      type="button"
                      onClick={addBannerSection}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      <Plus className="h-3.5 w-3.5" /> + ব্যানার যোগ করুন
                    </button>
                  </div>
                </div>

                {sections.map((sec, secIdx) => (
                  <SectionItemEditor
                    key={sec.id}
                    section={sec}
                    index={secIdx}
                    totalSections={sections.length}
                    onMoveUp={() => moveSection(secIdx, "up")}
                    onMoveDown={() => moveSection(secIdx, "down")}
                    onUpdateTitle={(t) => updateSectionTitle(sec.id, t)}
                    onUpdateIcon={(i) => updateSectionIcon(sec.id, i)}
                    onUpdateBanner={(field, val) => updateBannerSection(sec.id, field, val)}
                    onAddItem={(txt) => addSectionItem(sec.id, txt)}
                    onRemoveItem={(itemIdx) => removeSectionItem(sec.id, itemIdx)}
                    onDeleteSection={() => deleteSection(sec.id)}
                  />
                ))}

                {sections.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-4">
                    কোনো সেকশন বা ব্যানার নেই। উপরের বাটনে ক্লিক করে যোগ করুন।
                  </p>
                )}
              </div>

              {/* ── Active Toggle ── */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveLp"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <label
                  htmlFor="isActiveLp"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Active & Publicly Accessible
                </label>
              </div>

              {/* ── Submit ── */}
              {/* ── Submit ── */}
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

/* ═══ Section Item Editor Sub-Component ═══ */

function SectionItemEditor({
  section,
  index,
  totalSections,
  onMoveUp,
  onMoveDown,
  onUpdateTitle,
  onUpdateIcon,
  onUpdateBanner,
  onAddItem,
  onRemoveItem,
  onDeleteSection,
}: {
  section: LandingSection;
  index: number;
  totalSections: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdateTitle: (t: string) => void;
  onUpdateIcon: (i: IconType) => void;
  onUpdateBanner: (field: "bannerImageUrl" | "bannerAlt" | "bannerLinkUrl", val: string) => void;
  onAddItem: (txt: string) => void;
  onRemoveItem: (idx: number) => void;
  onDeleteSection: () => void;
}) {
  const [itemText, setItemText] = useState("");
  const isBanner = section.type === "banner";

  return (
    <div className={`rounded-xl border p-4 shadow-sm space-y-3 ${
      isBanner
        ? "border-amber-300 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20"
        : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700"
    }`}>
      {/* Header with Title and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase ${isBanner ? "text-amber-700 dark:text-amber-400" : "text-gray-700 dark:text-gray-300"}`}>
            #{index + 1} {isBanner ? "🎨 ব্যানার মডিউল (Banner Section)" : "✨ ফিচার সেকশন (Feature Section)"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="rounded p-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
            title="Move Up"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={index === totalSections - 1}
            onClick={onMoveDown}
            className="rounded p-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
            title="Move Down"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={onDeleteSection}
            className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 ml-2"
          >
            <Trash2 className="h-3.5 w-3.5" /> মুছুন
          </button>
        </div>
      </div>

      {isBanner ? (
        /* ─── Banner Module Editor ─── */
        <div className="space-y-3">
          <div className="flex gap-3 items-center">
            <div className="h-16 w-28 rounded-lg border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center shrink-0 dark:border-gray-700 dark:bg-gray-900">
              {section.bannerImageUrl ? (
                <img
                  src={section.bannerImageUrl}
                  alt={section.bannerAlt || "Banner"}
                  className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"; }}
                />
              ) : (
                <span className="text-[10px] text-gray-400 text-center px-1">ব্যানার ইমেজ নেই</span>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300">
                ব্যানার ইমেজ লিংক (Image URL) *
              </label>
              <input
                value={section.bannerImageUrl || ""}
                onChange={(e) => onUpdateBanner("bannerImageUrl", e.target.value)}
                placeholder="https://images.unsplash.com/... বা ইমেজ URL"
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs outline-none focus:border-black dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                ব্যানার অল্ট/টাইটেল (Alt Text)
              </label>
              <input
                value={section.bannerAlt || ""}
                onChange={(e) => onUpdateBanner("bannerAlt", e.target.value)}
                placeholder="যেমন: ৫০% স্পেশাল ছাড় ব্যানার"
                className="h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                ক্লিক লিংক / অ্যাকশন URL
              </label>
              <input
                value={section.bannerLinkUrl || ""}
                onChange={(e) => onUpdateBanner("bannerLinkUrl", e.target.value)}
                placeholder="#order-form (অর্ডার ফর্মে যাবে)"
                className="h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      ) : (
        /* ─── Feature Points Module Editor ─── */
        <>
          <div className="grid gap-3 md:grid-cols-[1fr_200px]">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                সেকশন টাইটেল
              </label>
              <input
                value={section.title || ""}
                onChange={(e) => onUpdateTitle(e.target.value)}
                placeholder="যেমন: পণ্যটির বিশেষত্বসমূহ"
                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-bold outline-none focus:border-black dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                আইকন স্টাইল
              </label>
              <select
                value={section.iconType || "checkmark"}
                onChange={(e) => onUpdateIcon(e.target.value as IconType)}
                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-bold outline-none focus:border-black dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="checkmark">✓ Checkmark</option>
                <option value="bullet">• Bullet</option>
                <option value="star">★ Star</option>
                <option value="number">1, 2, 3 Number</option>
              </select>
            </div>
          </div>

          {/* Add point */}
          <div className="flex gap-2">
            <input
              value={itemText}
              onChange={(e) => setItemText(e.target.value)}
              placeholder="নতুন পয়েন্ট লিখুন..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (itemText.trim()) {
                    onAddItem(itemText);
                    setItemText("");
                  }
                }
              }}
              className="h-8 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs outline-none focus:border-black dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => {
                if (!itemText.trim()) return;
                onAddItem(itemText);
                setItemText("");
              }}
              className="h-8 rounded-lg bg-black px-3 text-xs font-bold text-white hover:bg-gray-800 dark:bg-white dark:text-black"
            >
              + যোগ করুন
            </button>
          </div>

          {/* Points list */}
          <ul className="space-y-1.5 text-xs">
            {(section.items || []).map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-2 border border-gray-100 dark:bg-gray-900 dark:border-gray-700"
              >
                <span className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                  {section.iconType === "checkmark" && (
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  )}
                  {section.iconType === "bullet" && (
                    <Disc className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  )}
                  {section.iconType === "star" && (
                    <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                  )}
                  {section.iconType === "number" && (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-800 text-[10px] font-bold text-white dark:bg-gray-200 dark:text-gray-900">
                      {idx + 1}
                    </span>
                  )}
                  <span>{item}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveItem(idx)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
