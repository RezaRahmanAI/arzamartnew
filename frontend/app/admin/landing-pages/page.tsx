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
import { OptImage } from "@/components/opt-image";

/* ─── Types ─── */

type IconType = "checkmark" | "bullet" | "star" | "number";

type LandingSection = {
  id: string;
  title: string;
  iconType: IconType;
  items: string[];
};

type ReviewItem = {
  name: string;
  rating: number;
  comment: string;
  date?: string;
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
  const [deliveryCharge, setDeliveryCharge] = useState(60);
  const [callButtonText, setCallButtonText] = useState("অর্ডার করুন");
  const [isActive, setIsActive] = useState(true);

  // Dynamic Sections
  const [sections, setSections] = useState<LandingSection[]>([]);

  // Reviews
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [newRevName, setNewRevName] = useState("");
  const [newRevComment, setNewRevComment] = useState("");

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

  const autoFillFromProduct = (pSlug: string) => {
    const p = products.find((prod) => prod.slug === pSlug);
    if (!p) return;
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
    const defaultProduct = products[0];
    setProductId(defaultProduct?.slug || "");

    if (defaultProduct) {
      autoFillFromProduct(defaultProduct.slug);
    } else {
      setTitle("New Landing Page");
      setSubtitle("");
      setSlug(`offer-${Date.now()}`);
      setHeroTitle("");
      setHeroSubtitle("");
      setHeroImageUrl("");
    }

    setVideoUrl("");
    setSpecialPrice(0);
    setOldPrice(0);
    setDeliveryCharge(60);
    setCallButtonText("অর্ডার করুন");
    setIsActive(true);

    setSections([
      {
        id: "sec-1",
        title: "পণ্যটির বিশেষত্বসমূহ",
        iconType: "checkmark",
        items: [
          "100% Premium Quality Material",
          "Color Guarantee — Wash after Wash",
          "সারাদেশে ক্যাশ অন ডেলিভারি",
        ],
      },
    ]);

    setReviews([
      { name: "তানভীর হোসেন", rating: 5, comment: "অনেক ভালো কোয়ালিটি, ছবির মতোই পেয়েছি!", date: "সাম্প্রতিক" },
    ]);

    setIsModalOpen(true);
  };

  const openEditModal = (item: LandingPageItem) => {
    setEditingId(item.id);
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
    setDeliveryCharge(item.deliveryCharge || 60);
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

    // Parse Reviews
    try {
      setReviews(item.reviewsJson ? JSON.parse(item.reviewsJson) : []);
    } catch {
      setReviews([]);
    }

    setIsModalOpen(true);
  };

  /* ─── Section Management ─── */

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        id: `sec-${Date.now()}`,
        title: `নতুন সেকশন ${prev.length + 1}`,
        iconType: "checkmark",
        items: ["নতুন পয়েন্ট লিখুন..."],
      },
    ]);
  };

  const updateSectionTitle = (secId: string, newTitle: string) => {
    setSections((prev) => prev.map((s) => (s.id === secId ? { ...s, title: newTitle } : s)));
  };

  const updateSectionIcon = (secId: string, iconType: IconType) => {
    setSections((prev) => prev.map((s) => (s.id === secId ? { ...s, iconType } : s)));
  };

  const addSectionItem = (secId: string, text: string) => {
    if (!text.trim()) return;
    setSections((prev) =>
      prev.map((s) => (s.id === secId ? { ...s, items: [...s.items, text.trim()] } : s))
    );
  };

  const removeSectionItem = (secId: string, itemIndex: number) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === secId ? { ...s, items: s.items.filter((_, idx) => idx !== itemIndex) } : s
      )
    );
  };

  const deleteSection = (secId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== secId));
  };

  /* ─── Submit ─── */

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug) return;
    setSaving(true);

    const firstSectionItems = sections.length > 0 ? sections[0].items : [];

    const payload: Partial<LandingPageItem> = {
      ...(editingId ? { id: editingId } : {}),
      title,
      subtitle,
      slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
      productId,
      heroTitle,
      heroSubtitle,
      heroImageUrl,
      videoUrl,
      contentJson: JSON.stringify({ highlights: firstSectionItems, videoUrl }),
      sectionsJson: JSON.stringify(sections),
      reviewsJson: JSON.stringify(reviews),
      specialPrice: Number(specialPrice) || 0,
      oldPrice: Number(oldPrice) || 0,
      deliveryCharge: Number(deliveryCharge),
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

  /* ─── Render ─── */

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Product Landing Page Builder
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            কাস্টম সেকশন, রিভিউ, ভিডিও সহ প্রতিটি প্রোডাক্টের জন্য আকর্ষণীয় ল্যান্ডিং পেজ তৈরি করুন।
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
                const linkedProduct = products.find((p) => p.slug === page.productId);
                return (
                  <tr
                    key={page.id}
                    className="transition hover:bg-gray-50/50 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {page.heroImageUrl && (
                          <OptImage
                            src={page.heroImageUrl}
                            alt={page.title}
                            className="h-10 w-10 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                            width={40}
                            height={40}
                            sizes="40px"
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
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {linkedProduct.name}
                        </span>
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
              {/* ── Product Selector with Auto-Fill ── */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2 dark:bg-amber-950/20 dark:border-amber-900/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    ১. প্রোডাক্ট নির্বাচন করুন *
                  </label>
                  <button
                    type="button"
                    onClick={() => autoFillFromProduct(productId)}
                    className="text-xs font-bold text-amber-700 hover:underline dark:text-amber-400"
                  >
                    ⚡ প্রোডাক্ট তথ্য দিয়ে অটো-ফিল করুন
                  </button>
                </div>
                <select
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    autoFillFromProduct(e.target.value);
                  }}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-semibold outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white dark:focus:border-white"
                >
                  <option value="">Select Product...</option>
                  {products.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} — ৳{p.discountPrice || p.basePrice || 0}
                      {p.variants && p.variants.length > 0
                        ? ` (${p.variants.map((v) => v.name.replace("Size: ", "")).join(", ")})`
                        : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  💡 প্রোডাক্ট সিলেক্ট করলে <strong>নাম</strong>, <strong>বিবরণ</strong>,{" "}
                  <strong>ছবি</strong> অটো-ফিল হবে। <strong>দাম Size/Variant অনুযায়ী</strong> প্রোডাক্ট
                  থেকে আসবে।
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

              {/* ── Media ── */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    হিরো ব্যানার ছবি URL
                  </label>
                  <input
                    value={heroImageUrl}
                    onChange={(e) => setHeroImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    ইউটিউব ভিডিও Embed URL
                  </label>
                  <input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/embed/..."
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs outline-none focus:border-black dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              {/* ── Delivery Charge & CTA ── */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    ডেলিভারি চার্জ (৳ 0 = Default Zone-based)
                  </label>
                  <input
                    type="number"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold outline-none dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                  />
                </div>
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
              </div>

              {/* ── Pricing Editor (Special / Old Price) ── */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">
                  💰 প্রাইসিং (অফার / নিয়মিত দাম)
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                      স্পেশাল / অফার প্রাইস (৳)
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
                      ওল্ড / নিয়মিত প্রাইস (৳) — স্ট্রাইকথ্রু দেখাবে
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
                {Number(specialPrice) > 0 && Number(oldPrice) > Number(specialPrice) && (
                  <p className="mt-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    ✓ কাস্টমার দেখবে: ৳{Number(oldPrice)} <s>৳{Number(oldPrice)}</s> → ৳{Number(specialPrice)} (৳{Number(oldPrice) - Number(specialPrice)} ছাড়)
                  </p>
                )}
              </div>

              {/* ═══ Dynamic Section Builder ═══ */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4 dark:border-gray-800 dark:bg-gray-800/30">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      কাস্টম সেকশন বিল্ডার
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addSection}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                  >
                    <Plus className="h-3.5 w-3.5" /> + নতুন সেকশন
                  </button>
                </div>

                {sections.map((sec, secIdx) => (
                  <SectionItemEditor
                    key={sec.id}
                    section={sec}
                    index={secIdx}
                    onUpdateTitle={(t) => updateSectionTitle(sec.id, t)}
                    onUpdateIcon={(i) => updateSectionIcon(sec.id, i)}
                    onAddItem={(txt) => addSectionItem(sec.id, txt)}
                    onRemoveItem={(itemIdx) => removeSectionItem(sec.id, itemIdx)}
                    onDeleteSection={() => deleteSection(sec.id)}
                  />
                ))}

                {sections.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-4">
                    কোনো সেকশন নেই। উপরের বাটনে ক্লিক করে সেকশন যোগ করুন।
                  </p>
                )}
              </div>

              {/* ═══ Customer Reviews Builder ═══ */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  কাস্টমার রিভিউ (Customer Reviews & Testimonials)
                </label>
                <div className="grid gap-2 md:grid-cols-2 mb-3">
                  <input
                    value={newRevName}
                    onChange={(e) => setNewRevName(e.target.value)}
                    placeholder="কাস্টমারের নাম (যেমন: রাশেদ খান)"
                    className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <input
                      value={newRevComment}
                      onChange={(e) => setNewRevComment(e.target.value)}
                      placeholder="রিভিউ মন্তব্য..."
                      className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-xs outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newRevName.trim() || !newRevComment.trim()) return;
                        setReviews((prev) => [
                          ...prev,
                          {
                            name: newRevName.trim(),
                            rating: 5,
                            comment: newRevComment.trim(),
                            date: "সাম্প্রতিক",
                          },
                        ]);
                        setNewRevName("");
                        setNewRevComment("");
                      }}
                      className="h-9 rounded-lg bg-black px-4 text-xs font-bold text-white shrink-0 dark:bg-white dark:text-black"
                    >
                      + রিভিউ
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {reviews.map((rev, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-gray-200 text-xs dark:bg-gray-800 dark:border-gray-700"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">{rev.name}</span>
                          <span className="flex text-amber-400">{"★".repeat(rev.rating)}</span>
                        </div>
                        <p className="text-gray-500 mt-0.5 dark:text-gray-400">{rev.comment}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviews((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
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
  onUpdateTitle,
  onUpdateIcon,
  onAddItem,
  onRemoveItem,
  onDeleteSection,
}: {
  section: LandingSection;
  index: number;
  onUpdateTitle: (t: string) => void;
  onUpdateIcon: (i: IconType) => void;
  onAddItem: (txt: string) => void;
  onRemoveItem: (idx: number) => void;
  onDeleteSection: () => void;
}) {
  const [itemText, setItemText] = useState("");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 dark:border-gray-700">
        <span className="text-xs font-bold text-amber-700 uppercase dark:text-amber-400">
          সেকশন #{index + 1}
        </span>
        <button
          type="button"
          onClick={onDeleteSection}
          className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-3.5 w-3.5" /> মুছুন
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_200px]">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">
            সেকশন টাইটেল
          </label>
          <input
            value={section.title}
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
            value={section.iconType}
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
        {section.items.map((item, idx) => (
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
    </div>
  );
}
