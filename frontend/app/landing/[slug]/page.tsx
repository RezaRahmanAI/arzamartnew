"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  ShieldCheck,
  Truck,
  Star,
  ArrowRight,
  ShoppingCart,
  Clock,
  PhoneCall,
  RotateCcw,
  PackageCheck,
  ThumbsUp,
  Check,
  Disc,
  MessageCircle,
} from "lucide-react";
import { landingPagesService, type LandingPageResponse } from "@/lib/api/services/landing-pages.service";
import { ordersService } from "@/lib/api/services/orders.service";
import { DEFAULT_CITIES, getAreasForCity } from "@/lib/location-data";
import { settingsService } from "@/lib/api/services/settings.service";
import { DEFAULT_SYSTEM_SETTINGS } from "@/types/settings";
import { getColorHex } from "@/lib/shop-data";

export type LandingSection = {
  id?: string;
  type?: "features" | "banner";
  title?: string;
  iconType?: "checkmark" | "bullet" | "star" | "number";
  items?: string[];
  bannerImageUrl?: string;
  bannerAlt?: string;
  bannerLinkUrl?: string;
};

function useCountdown(targetMinutes: number) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const storageKey = "lp_countdown_target";
    let target = localStorage.getItem(storageKey);
    const now = Date.now();
    if (!target || Number(target) < now) {
      const newTarget = now + targetMinutes * 60 * 1000;
      localStorage.setItem(storageKey, String(newTarget));
      target = String(newTarget);
    }
    const tick = () => {
      const diff = Math.max(0, Number(target) - Date.now());
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMinutes]);

  return timeLeft;
}

export default function PublicLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<LandingPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  const [dhakaCharge, setDhakaCharge] = useState<number>(70);
  const [outsideDhakaCharge, setOutsideDhakaCharge] = useState<number>(130);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [area, setArea] = useState(() => getAreasForCity("Dhaka")[0] || "");
  const [shippingFee, setShippingFee] = useState(70);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  const availableAreas = getAreasForCity(city);
  const timeLeft = useCountdown(120);

  useEffect(() => {
    fetchPageData();
    fetchGlobalShippingSettings();
  }, [resolvedParams.slug]);

  const fetchGlobalShippingSettings = async () => {
    try {
      const settings = await settingsService.get();
      const rules = settings.shipping?.rules || DEFAULT_SYSTEM_SETTINGS.shipping.rules;
      const insideDhaka = rules.find((r) => r.name.toLowerCase().includes("inside dhaka"))?.charge ?? 70;
      const outsideDhaka = rules.find((r) => r.name.toLowerCase().includes("outside dhaka"))?.charge ?? 130;
      setDhakaCharge(insideDhaka);
      setOutsideDhakaCharge(outsideDhaka);
      setShippingFee(city === "Dhaka" ? insideDhaka : outsideDhaka);
    } catch { /* defaults */ }
  };

  const fetchPageData = async () => {
    try {
      const res = await landingPagesService.getBySlug(resolvedParams.slug);
      setData(res);
      if (res?.product?.variants?.length) setSelectedVariant(res.product.variants[0].id);
      setSelectedColor("Black");
      const initialImg =
        res?.product?.images?.find((img) => img.isMain)?.imageUrl ||
        res?.product?.images?.[0]?.imageUrl ||
        res?.landingPage?.heroImageUrl ||
        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800";
      setSelectedImage(initialImg);
    } catch (err) {
      console.error("Failed to load landing page:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const areas = getAreasForCity(newCity);
    setArea(areas[0] || "");
    setShippingFee(newCity === "Dhaka" ? dhakaCharge : outsideDhakaCharge);
  };

  const scrollToOrderForm = () => {
    document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
        <p className="mt-4 text-sm font-medium text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!data?.landingPage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] p-4">
        <h1 className="text-2xl font-extrabold text-gray-900">পেজটি পাওয়া যায়নি</h1>
        <p className="mt-2 text-sm text-gray-500">আপনার কাঙ্ক্ষিত অফার পেজটি মুছে ফেলা হয়েছে।</p>
        <Link href="/" className="mt-6 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:opacity-90 transition">
          হোমপেজে ফিরে যান
        </Link>
      </div>
    );
  }

  const { landingPage, product } = data;
  let customContent: { highlights?: string[]; urgencyMessage?: string; videoUrl?: string } = {};
  try {
    if (landingPage.contentJson) customContent = JSON.parse(landingPage.contentJson);
  } catch {}

  const parsedSections: LandingSection[] = (() => {
    if (landingPage.sectionsJson) {
      try {
        const arr = JSON.parse(landingPage.sectionsJson);
        return Array.isArray(arr) ? arr : [];
      } catch { return []; }
    }
    if (customContent.highlights && customContent.highlights.length > 0) {
      return [{ id: "sec-fallback", type: "features", title: "পণ্যটির বিশেষত্বসমূহ", iconType: "checkmark", items: customContent.highlights }];
    }
    return [];
  })();

  const selectedVariantObj = product?.variants?.find((v) => v.id === selectedVariant);
  const activePrice = selectedVariantObj?.priceOverride && selectedVariantObj.priceOverride > 0
    ? selectedVariantObj.priceOverride
    : (product?.discountPrice || product?.basePrice || 0);
  const basePrice = product?.basePrice || activePrice;
  const discountAmount = basePrice > activePrice ? basePrice - activePrice : 0;
  const videoSrc = landingPage.videoUrl || customContent.videoUrl || "";
  const ctaText = landingPage.callButtonText || "অর্ডার করুন";
  const allImages = product?.images?.map((img) => img.imageUrl) || [landingPage.heroImageUrl].filter(Boolean) as string[];
  const productColors = ["Black", "White", "Navy Blue", "Olive Green", "Maroon"];

  type ParsedReview = { name: string; rating: number; comment: string; date?: string };
  const parsedReviews: ParsedReview[] = (() => {
    if (landingPage.reviewsJson) {
      try {
        const arr = JSON.parse(landingPage.reviewsJson);
        return Array.isArray(arr) ? arr : [];
      } catch { return []; }
    }
    return [];
  })();

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.product || !fullName || !phone || !address) {
      alert("অনুগ্রহ করে আপনার নাম, মোবাইল নম্বর ও ঠিকানা পূরণ করুন।");
      return;
    }
    setSubmitting(true);
    try {
      const selectedVariantName = selectedVariantObj ? selectedVariantObj.name.replace("Size: ", "") : "";
      const variantDetails = [selectedVariantName, selectedColor].filter(Boolean).join(", ");
      const finalProductName = variantDetails ? `${data.product.name} (${variantDetails})` : data.product.name;
      const totalAmount = activePrice * quantity + shippingFee;
      const res = await ordersService.createOrder({
        fullName, phone,
        address: `${address}, ${area}, ${city}`,
        city, area, district: city,
        items: [{ productId: data.product.id, variantId: selectedVariant || undefined, productName: finalProductName, size: selectedVariantName || undefined, color: selectedColor || undefined, quantity, unitPrice: activePrice }],
        shippingFee, totalAmount,
      });
      if (res.orderNumber) setOrderSuccess(res.orderNumber);
      else alert("অর্ডার সাবমিট করা যাচ্ছে না।");
    } catch {
      alert("অর্ডার সাবমিট করতে সমস্যা হয়েছে।");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 antialiased pb-24 md:pb-8">

      {/* ═══ 1. MARQUEE BAR ═══ */}
      <div className="bg-blue-600 py-2.5 text-white text-xs overflow-hidden relative">
        <div className="flex gap-8 whitespace-nowrap animate-[marquee_20s_linear_infinite]">
          {[...Array(6)].map((_, i) => (
            <span key={i} className="shrink-0 font-bold tracking-wide">
              🔥 অফার চলাকালীন ডেলিভারি একদম নিশ্চিত! সীমিত স্টক শেষ হওয়ার আগেই অর্ডার করুন। &nbsp;|&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ═══ 2. COUNTDOWN TIMER ═══ */}
      <div className="sticky top-0 z-[60] w-full bg-red-600 text-white py-3 px-4 shadow-lg">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-3">
          <span className="font-bold text-sm sm:text-base whitespace-pre-line">অফার শেষ হতে বাকি:</span>
          <div className="flex justify-center gap-2">
            {[
              { val: timeLeft.days, label: "দিন" },
              { val: timeLeft.hours, label: "ঘন্টা" },
              { val: timeLeft.minutes, label: "মিনিট" },
              { val: timeLeft.seconds, label: "সেকেন্ড" },
            ].map((u) => (
              <div key={u.label} className="flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-md">
                <span className="text-lg sm:text-xl font-extrabold leading-none">{String(u.val).padStart(2, "0")}</span>
                <span className="text-[10px] mt-0.5 opacity-80">{u.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ 3. HEADER ═══ */}
      <header className="sticky top-[52px] z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight text-gray-900">
            Alzeena<span className="text-blue-600">.</span>
          </Link>
          <button
            onClick={scrollToOrderForm}
            className="rounded-full bg-red-600 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-lg hover:bg-red-700 active:scale-95 transition"
          >
            {ctaText}
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto">

        {/* ═══ 4. HERO SECTION (gradient-purple) ═══ */}
        <section className="text-center text-white py-16 sm:py-20 px-5" style={{ background: "linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed)" }}>
          <div className="max-w-[800px] mx-auto">
            <p className="mb-4 text-3xl">🚀</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-6 whitespace-pre-line leading-tight">
              {landingPage.heroTitle || product?.name || landingPage.title}
            </h1>
            <p className="text-white/90 mb-8 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {landingPage.heroSubtitle || landingPage.subtitle || ""}
            </p>
            <div className="inline-block px-6 py-2 bg-yellow-400 text-gray-900 rounded-xl mb-8 text-sm font-bold">
              স্টক ফুরিয়ে যাওয়ার আগেই সংগ্রহ করুন
            </div>
            <div>
              <button
                onClick={scrollToOrderForm}
                className="rounded-full bg-white text-blue-700 px-8 py-3.5 text-sm sm:text-base font-bold shadow-2xl hover:opacity-90 active:scale-95 transition"
              >
                অর্ডার করুন এখনই
              </button>
            </div>
          </div>
        </section>

        {/* ═══ 5. PRODUCT HERO (gradient-pink split) ═══ */}
        <section className="overflow-hidden" style={{ background: "linear-gradient(135deg, #7c3aed, #db2777, #be185d)" }}>
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2">
            <div className="p-8 md:p-16 flex flex-col justify-center text-white order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl font-black mb-6 leading-snug">
                {product?.name || landingPage.title}
              </h2>
              <p className="text-white/90 mb-8 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {landingPage.heroSubtitle || ""}
              </p>
              <div className="flex items-center gap-4 mb-8">
                <span className="text-3xl font-black">৳{activePrice}</span>
                {basePrice > activePrice && (
                  <span className="text-lg text-white/50 line-through">৳{basePrice}</span>
                )}
                {discountAmount > 0 && (
                  <span className="bg-yellow-400 text-gray-900 px-2 py-0.5 rounded text-xs font-bold">
                    ৳{discountAmount} ছাড়
                  </span>
                )}
              </div>
              <button
                onClick={scrollToOrderForm}
                className="rounded-full bg-white text-pink-700 px-8 py-3.5 text-sm sm:text-base font-bold shadow-xl hover:opacity-90 active:scale-95 transition w-fit"
              >
                অর্ডার করুন এখনই
              </button>
            </div>
            <div className="order-1 lg:order-2 h-[300px] lg:h-auto overflow-hidden bg-white/10">
              <Image
                src={selectedImage || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"}
                alt={product?.name || "Product"}
                width={600}
                height={600}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          </div>
        </section>

        {/* ═══ 6. GALLERY + SIZE/COLOR + PRICE ═══ */}
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-0">
            {/* Left: Image Gallery */}
            <div className="p-6 sm:p-8 space-y-4">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                <Image
                  src={selectedImage || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"}
                  alt={product?.name || "Product"}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                {discountAmount > 0 && (
                  <div className="absolute top-3 left-3 rounded-xl bg-red-600 px-3 py-1 text-xs font-extrabold text-white shadow-lg">
                    ৳{discountAmount} ছাড়!
                  </div>
                )}
              </div>
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(imgUrl)}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                        selectedImage === imgUrl ? "border-blue-600 shadow-md" : "border-gray-200 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image src={imgUrl} alt={`Product ${idx}`} fill sizes="64px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {videoSrc && (
                <div className="aspect-video w-full overflow-hidden rounded-2xl border border-gray-200">
                  <iframe src={videoSrc} title="Product Video" className="h-full w-full" allowFullScreen />
                </div>
              )}
            </div>

            {/* Right: Product Details */}
            <div className="p-6 sm:p-8 space-y-5 border-l border-gray-100">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                <ShieldCheck className="h-3.5 w-3.5" /> অরিজিনাল প্রোডাক্ট
              </div>
              <h1 className="text-xl sm:text-2xl font-black leading-snug">
                {landingPage.heroTitle || product?.name || landingPage.title}
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                {landingPage.heroSubtitle || ""}
              </p>

              {/* Price Box */}
              <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">অফার মূল্য</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-black text-blue-700">৳{activePrice}</span>
                    {basePrice > activePrice && (
                      <span className="text-base text-gray-400 line-through">৳{basePrice}</span>
                    )}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  <ShieldCheck className="h-3.5 w-3.5" /> ক্যাশ অন ডেলিভারি
                </span>
              </div>

              {/* Size Selector */}
              {product?.variants && product.variants.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">সাইজ নির্বাচন করুন</p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariant === v.id;
                      const vPrice = v.priceOverride && v.priceOverride > 0 ? v.priceOverride : (product.discountPrice || product.basePrice);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVariant(v.id)}
                          className={`w-12 h-12 flex items-center justify-center rounded-lg border text-xs font-bold transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white shadow-md"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          {v.name.replace("Size: ", "")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Color Selector */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">কালার</p>
                <div className="flex flex-wrap items-center gap-2">
                  {productColors.map((c) => {
                    const isSelected = selectedColor === c;
                    const hex = getColorHex(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        <span className="h-3.5 w-3.5 rounded-full border border-gray-300 shrink-0" style={{ backgroundColor: hex }} />
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={scrollToOrderForm}
                className="w-full rounded-2xl bg-gradient-to-r from-red-600 to-red-700 py-4 text-base font-extrabold text-white shadow-xl hover:from-red-700 hover:to-red-800 transition active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-5 w-5" /> {ctaText} (৳{activePrice})
              </button>
              <p className="text-center text-xs text-gray-400 font-medium">
                🔒 কোনো অগ্রিম টাকা দেওয়ার প্রয়োজন নেই, ডেলিভারি পাওয়ার পর টাকা দিন।
              </p>
            </div>
          </div>
        </section>

        {/* ═══ 7. DYNAMIC SECTIONS ═══ */}
        {parsedSections.length > 0 && parsedSections.map((section, secIdx) => {
          if (section.type === "banner") {
            return (
              <div key={section.id || secIdx} className="overflow-hidden">
                {section.bannerLinkUrl ? (
                  <a href={section.bannerLinkUrl} className="block">
                    <img src={section.bannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200"} alt={section.bannerAlt || "Banner"} className="w-full h-auto max-h-96 object-cover" />
                  </a>
                ) : (
                  <img src={section.bannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200"} alt={section.bannerAlt || "Banner"} className="w-full h-auto max-h-96 object-cover" />
                )}
              </div>
            );
          }
          const iconType = section.iconType || "checkmark";
          return (
            <section key={section.id || secIdx} className="py-12 sm:py-16 px-5 bg-white border-b border-gray-100">
              <div className="max-w-[1200px] mx-auto">
                {section.title && (
                  <div className="text-center mb-10">
                    <h2 className="text-xl sm:text-2xl font-black">{section.title}</h2>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(section.items || []).map((item: string, idx: number) => (
                    <div key={idx} className="p-5 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-3 hover:border-blue-200 transition-colors">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        {iconType === "checkmark" && <Check className="h-5 w-5 stroke-[3]" />}
                        {iconType === "bullet" && <Disc className="h-5 w-5" />}
                        {iconType === "star" && <Star className="h-5 w-5 fill-current" />}
                        {iconType === "number" && <span className="text-sm font-black">{idx + 1}</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-700 pt-2">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        {/* ═══ 8. TRUST BANNER ═══ */}
        <section className="py-10 px-5 text-white" style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-center gap-8 text-center md:text-left">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-yellow-400 font-bold text-lg">১০০% বিশ্বস্ততা</h3>
                <p className="text-white/60 text-sm">হাজারো গ্রাহকের আস্থার প্রতীক</p>
              </div>
            </div>
            <div className="h-px w-20 bg-white/10 hidden md:block" />
            <p className="max-w-[500px] text-lg italic text-white/90">
              &ldquo;নিশ্চিন্তে অর্ডার করুন, আমরা দিচ্ছি ১০০% অরিজিনাল পণ্যের গ্যারান্টি।&rdquo;
            </p>
          </div>
        </section>

        {/* ═══ 9. FEATURES GRID (default if no sections) ═══ */}
        {parsedSections.length === 0 && (
          <section className="py-12 sm:py-16 px-5 bg-white">
            <div className="max-w-[1200px] mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-xl sm:text-2xl font-black">কেন আমাদের থেকেই অর্ডার করবেন?</h2>
                <p className="text-sm text-gray-500 mt-2">আমরা নিশ্চিত করি সেরা কোয়ালিটি ও বিশ্বস্ত সেবা</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: <Truck className="h-6 w-6" />, title: "দ্রুততম ডেলিভারি", desc: "ঢাকা সিটিতে ২৪-৪৮ ঘণ্টা এবং সারাদেশে ২-৩ দিনে ডেলিভারি।", color: "bg-blue-100 text-blue-600" },
                  { icon: <PackageCheck className="h-6 w-6" />, title: "পণ্য দেখে নেওয়ার সুযোগ", desc: "ডেলিভারিম্যানের সামনে প্যাকেট খুলে চেক করে মূল্য পরিশোধ।", color: "bg-emerald-100 text-emerald-600" },
                  { icon: <RotateCcw className="h-6 w-6" />, title: "সহজ রিটার্ন", desc: "সাইজ বা কোয়ালিটিতে সমস্যা হলে ৭ দিনে সহজ এক্সচেঞ্জ।", color: "bg-rose-100 text-rose-600" },
                  { icon: <ThumbsUp className="h-6 w-6" />, title: "১০০% প্রিমিয়াম কোয়ালিটি", desc: "প্রতিটি পণ্য মেটেরিয়াল চেক করে সর্বোচ্চ কোয়ালিটি নিশ্চিত।", color: "bg-sky-100 text-sky-600" },
                ].map((f, i) => (
                  <div key={i} className="p-5 rounded-xl bg-gray-50 border border-gray-100 text-center space-y-3 hover:shadow-md transition-shadow">
                    <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${f.color}`}>{f.icon}</div>
                    <h3 className="text-sm font-bold">{f.title}</h3>
                    <p className="text-xs text-gray-500">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ 10. REVIEWS ═══ */}
        {parsedReviews.length > 0 && (
          <section className="py-12 sm:py-16 px-5 bg-gray-50 border-t border-gray-100">
            <div className="max-w-[1200px] mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-xl sm:text-2xl font-black">কাস্টমারদের মূল্যবান মতামত</h2>
                <p className="text-sm text-gray-500 mt-2">আমাদের সন্তুষ্ট গ্রাহকদের সত্য মতামত</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {parsedReviews.map((rev, idx) => {
                  const rating = Math.max(1, Math.min(5, Number(rev.rating) || 5));
                  return (
                    <div key={idx} className="p-5 rounded-xl bg-white border border-gray-100 hover:shadow-md transition-shadow space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{rev.name}</span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">Verified</span>
                      </div>
                      <div className="flex text-amber-400">
                        {[...Array(rating)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />)}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">&ldquo;{rev.comment}&rdquo;</p>
                      {rev.date && <p className="text-[10px] text-gray-400">{rev.date}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ═══ 11. ORDER FORM (rounded card, shadow) ═══ */}
        <section id="order-form" className="py-12 sm:py-16 px-5 bg-gray-50 border-t border-gray-100 scroll-mt-20">
          <div className="w-full max-w-[550px] mx-auto bg-white shadow-xl border border-gray-200 rounded-[24px] p-6 md:p-8">
            {orderSuccess ? (
              <div className="py-10 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-black">আপনার অর্ডারটি সফল হয়েছে!</h2>
                <p className="text-sm text-gray-600">অর্ডার রেফারেন্স: <span className="font-mono font-extrabold text-blue-600">{orderSuccess}</span></p>
                <p className="text-xs text-gray-500">আমাদের কাস্টমার প্রতিনিধি শীঘ্রই আপনার নাম্বারে কল করবেন।</p>
                <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition">
                  আরও কেনাকাটা করুন <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-black text-center mb-2">অর্ডার করুন</h2>
                <p className="text-sm text-gray-500 text-center mb-6">অর্ডার করতে নিচের ফর্মে আপনার তথ্য লিখুন</p>

                <form onSubmit={handleOrderSubmit} className="space-y-5">
                  {/* Size Selection */}
                  {product?.variants && product.variants.length > 0 && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 block">সাইজ</label>
                      <div className="flex flex-wrap gap-2">
                        {product.variants.map((v) => {
                          const isSelected = selectedVariant === v.id;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedVariant(v.id)}
                              className={`w-12 h-12 flex items-center justify-center rounded-lg border text-xs font-bold transition ${
                                isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-700 hover:border-gray-400"
                              }`}
                            >
                              {v.name.replace("Size: ", "")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Color Selection */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">কালার</label>
                    <div className="flex flex-wrap gap-2">
                      {productColors.map((c) => {
                        const isSelected = selectedColor === c;
                        const hex = getColorHex(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setSelectedColor(c)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                              isSelected ? "border-blue-600 bg-blue-50 text-blue-900" : "border-gray-200 text-gray-700 hover:border-gray-400"
                            }`}
                          >
                            <span className="h-3.5 w-3.5 rounded-full border border-gray-300 shrink-0" style={{ backgroundColor: hex }} />
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">নাম *</label>
                    <input type="text" required placeholder="আপনার নাম লিখুন" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-blue-600" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">মোবাইল নম্বর *</label>
                    <input type="tel" required placeholder="017XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-12 rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-blue-600" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">সম্পূর্ণ ঠিকানা *</label>
                    <textarea rows={3} required placeholder="বাসা/রোড নম্বর, এলাকা, জেলা" value={address} onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-600 resize-none" />
                  </div>

                  {/* Delivery Area */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-1 block">সিটি *</label>
                      <select value={city} onChange={(e) => handleCityChange(e.target.value)}
                        className="w-full h-12 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-600">
                        {DEFAULT_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-1 block">এরিয়া *</label>
                      <select value={area} onChange={(e) => setArea(e.target.value)}
                        className="w-full h-12 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-600">
                        {availableAreas.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">পরিমাণ</label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden w-32">
                      <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center text-sm font-bold hover:bg-gray-50">-</button>
                      <span className="flex-1 text-center font-extrabold text-sm">{quantity}</span>
                      <button type="button" onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 flex items-center justify-center text-sm font-bold hover:bg-gray-50">+</button>
                    </div>
                  </div>

                  {/* Price Summary */}
                  <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>পণ্যের দাম ({quantity} টি)</span>
                      <span className="font-bold text-gray-900">৳{activePrice * quantity}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>ডেলিভারি ({city === "Dhaka" ? "ঢাকা" : "বাইরে"})</span>
                      <span className="font-bold text-gray-900">৳{shippingFee}</span>
                    </div>
                    <div className="border-t border-gray-200 my-1" />
                    <div className="flex justify-between font-extrabold text-base">
                      <span>মোট</span>
                      <span className="text-blue-700 text-lg">৳{activePrice * quantity + shippingFee}</span>
                    </div>
                  </div>

                  <button type="submit" disabled={submitting}
                    className="w-full h-12 rounded-xl bg-red-600 text-white text-base font-bold shadow-lg hover:bg-red-700 transition active:scale-[0.98] flex items-center justify-center gap-2">
                    {submitting ? "অর্ডার প্রসেস হচ্ছে..." : <>অর্ডার সম্পন্ন করুন (৳{activePrice * quantity + shippingFee})</>}
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* ═══ 12. STICKY BOTTOM BAR (WhatsApp + Order) ═══ */}
      {!orderSuccess && (
        <div className="fixed bottom-0 left-0 right-0 z-[90] px-3 md:px-10 py-3 w-full flex justify-between gap-3">
          <a href="https://wa.me/8801700000000" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 md:gap-3 rounded-full bg-[#25d366] text-white px-4 md:px-8 py-3 md:py-4 text-sm md:text-base font-bold shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95">
            <MessageCircle className="h-5 w-5" />
            <span className="hidden md:inline">WhatsApp</span>
          </a>
          <button onClick={scrollToOrderForm}
            className="flex-1 rounded-full bg-red-600 text-white px-5 md:px-12 py-3 md:py-4 text-sm md:text-base font-bold shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2">
            {ctaText} এখনই
          </button>
        </div>
      )}

      {/* ═══ GLOBAL STYLES ═══ */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
