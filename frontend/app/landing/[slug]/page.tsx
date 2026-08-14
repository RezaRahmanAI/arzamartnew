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
  Sparkles,
  PhoneCall,
  RotateCcw,
  PackageCheck,
  ThumbsUp,
  Check,
  Disc,
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

export default function PublicLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<LandingPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  // Global Shipping Rates
  const [dhakaCharge, setDhakaCharge] = useState<number>(70);
  const [outsideDhakaCharge, setOutsideDhakaCharge] = useState<number>(130);

  // One-Page Checkout Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [area, setArea] = useState(() => getAreasForCity("Dhaka")[0] || "");
  const [shippingFee, setShippingFee] = useState(70);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  const availableAreas = getAreasForCity(city);

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
    } catch {
      // Use defaults
    }
  };

  const fetchPageData = async () => {
    try {
      const res = await landingPagesService.getBySlug(resolvedParams.slug);
      setData(res);
      if (res?.product?.variants?.length) {
        setSelectedVariant(res.product.variants[0].id);
      }
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
    const el = document.getElementById("order-form");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm font-semibold text-gray-600 dark:text-gray-400">লোডিং হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
        </div>
      </div>
    );
  }

  if (!data?.landingPage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">পেজটি পাওয়া যায়নি</h1>
        <p className="mt-2 text-sm text-gray-500">আপনার কাঙ্ক্ষিত অফার পেজটি মুছে ফেলা হয়েছে অথবা মেয়াদ শেষ হয়ে গেছে।</p>
        <Link href="/" className="mt-6 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700">
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
      } catch {
        return [];
      }
    }
    // Backward-compatible fallback to ContentJson highlights
    if (customContent.highlights && customContent.highlights.length > 0) {
      return [
        {
          id: "sec-fallback",
          type: "features",
          title: "পণ্যটির বিশেষত্বসমূহ",
          iconType: "checkmark",
          items: customContent.highlights,
        },
      ];
    }
    return [];
  })();

  // Size/Variant pricing calculations
  const selectedVariantObj = product?.variants?.find((v) => v.id === selectedVariant);
  const selectedSizePrice = selectedVariantObj?.priceOverride && selectedVariantObj.priceOverride > 0
    ? selectedVariantObj.priceOverride
    : (product?.discountPrice || product?.basePrice || 0);

  const useLandingPricing = Number(landingPage.specialPrice) > 0;
  const activePrice = selectedVariantObj?.priceOverride && selectedVariantObj.priceOverride > 0
    ? selectedVariantObj.priceOverride
    : useLandingPricing
      ? Number(landingPage.specialPrice)
      : (product?.discountPrice || product?.basePrice || 0);

  const basePrice = useLandingPricing
    ? Math.max(Number(landingPage.oldPrice), activePrice)
    : product?.basePrice || activePrice;

  const discountAmount = basePrice > activePrice ? basePrice - activePrice : 0;
  const videoSrc = landingPage.videoUrl || customContent.videoUrl || "";
  const ctaText = landingPage.callButtonText || "অর্ডার করুন";
  const allImages = product?.images?.map((img) => img.imageUrl) || [landingPage.heroImageUrl].filter(Boolean) as string[];

  // Available colors (sample default apparel colors or extracted)
  const productColors = ["Black", "White", "Navy Blue", "Olive Green", "Maroon"];

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.product || !fullName || !phone || !address) {
      alert("অনুগ্রহ করে আপনার নাম, সঠিক মোবাইল নম্বর ও ডেলিভারি ঠিকানা পূরণ করুন।");
      return;
    }

    setSubmitting(true);
    try {
      const selectedVariantName = selectedVariantObj ? selectedVariantObj.name.replace("Size: ", "") : "";
      const variantDetails = [selectedVariantName, selectedColor].filter(Boolean).join(", ");
      const finalProductName = variantDetails ? `${data.product.name} (${variantDetails})` : data.product.name;

      const totalAmount = activePrice * quantity + shippingFee;

      const orderPayload = {
        fullName,
        phone,
        address: `${address}, ${area}, ${city}`,
        city,
        area,
        district: city,
        items: [
          {
            productId: data.product.id,
            variantId: selectedVariant || undefined,
            productName: finalProductName,
            size: selectedVariantName || undefined,
            color: selectedColor || undefined,
            quantity,
            unitPrice: activePrice,
          },
        ],
        shippingFee,
        totalAmount,
      };

      const res = await ordersService.createOrder(orderPayload);
      if (res.orderNumber) {
        setOrderSuccess(res.orderNumber);
      } else {
        alert("অর্ডার সাবমিট করা যাচ্ছে না। অনুগ্রহ করে আবার চেষ্টা করুন।");
        return;
      }
    } catch (err) {
      console.error("Order submission failed:", err);
      alert("অর্ডার সাবমিট করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100 pb-20 md:pb-8">
      {/* 1. Urgency Top Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 px-4 py-2.5 text-center text-xs font-bold text-white shadow-md sm:text-sm tracking-wide">
        <span className="inline-flex items-center justify-center gap-2 flex-wrap">
          <Clock className="h-4 w-4 animate-pulse" />
          {customContent.urgencyMessage || "🔥 অফার চলাকালীন ডেলিভারি একদম নিশ্চিত! সীমিত স্টক শেষ হওয়ার আগেই অর্ডার করুন।"}
        </span>
      </div>

      {/* 2. Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 dark:bg-slate-900/90 dark:border-slate-800">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 flex items-center justify-between">
          <Link href="/" className="font-display text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Alzeena<span className="text-amber-600">.</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <a
              href="tel:01700000000"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-full hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
            >
              <PhoneCall className="h-3.5 w-3.5" /> হেল্পলাইন: 01700-000000
            </a>
            <button
              onClick={scrollToOrderForm}
              className="rounded-full bg-amber-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-amber-700 transition active:scale-95"
            >
              {ctaText}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-10">
        {/* 3. Hero Section */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          {/* Media Column (Left) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner dark:border-slate-800 dark:bg-slate-800">
              <Image
                src={selectedImage || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"}
                alt={product?.name || landingPage.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-300 hover:scale-105"
              />
              {discountAmount > 0 && (
                <div className="absolute top-3 left-3 rounded-xl bg-rose-600 px-3 py-1 text-xs font-extrabold text-white shadow-lg">
                  ৳{discountAmount} ছাড়!
                </div>
              )}
            </div>

            {/* Thumbnail selector */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      selectedImage === imgUrl ? "border-amber-600 shadow-md scale-95" : "border-slate-200 opacity-70 hover:opacity-100 dark:border-slate-800"
                    }`}
                  >
                    <Image src={imgUrl} alt={`Product ${idx}`} fill sizes="64px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Video Player if videoUrl exists */}
            {videoSrc && (
              <div className="pt-2">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">ভিডিও রিভিউ দেখুন:</p>
                <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  <iframe
                    src={videoSrc}
                    title="Product Video"
                    className="h-full w-full"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>

          {/* Details Column (Right) */}
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5" /> বিশেষ প্রিমিয়াম কালেকশন
            </div>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl leading-snug">
              {landingPage.heroTitle || product?.name || landingPage.title}
            </h1>

            {landingPage.heroSubtitle && (
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {landingPage.heroSubtitle}
              </p>
            )}

            {/* Price Box */}
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-4 dark:bg-amber-950/20 dark:border-amber-900/50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">অফার মূল্য</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-amber-700 dark:text-amber-400">৳{activePrice}</span>
                  {basePrice > activePrice && (
                    <span className="text-base text-slate-400 line-through">৳{basePrice}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg dark:bg-emerald-950 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> ক্যাশ অন ডেলিভারি
                </span>
              </div>
            </div>

            {/* Quick Order CTA */}
            <div className="pt-2 space-y-3">
              <button
                onClick={scrollToOrderForm}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 py-4 text-center text-base font-extrabold text-white shadow-xl hover:from-amber-700 hover:to-amber-800 transition transform active:scale-95 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-5 w-5" /> {ctaText}
              </button>
              <p className="text-center text-xs text-slate-500 font-medium">
                🔒 কোনো অগ্রিম টাকা দেওয়ার প্রয়োজন নেই, ডেলিভারি পাওয়ার পর টাকা দিন।
              </p>
            </div>
          </div>
        </section>

        {/* 4. Dynamic Sections & Banners (Rendered In Order) */}
        {parsedSections.length > 0 ? (
          <section className="space-y-8">
            {parsedSections.map((section, secIdx) => {
              if (section.type === "banner") {
                // Banner Section
                return (
                  <div
                    key={section.id || secIdx}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    {section.bannerLinkUrl ? (
                      <a href={section.bannerLinkUrl} className="block transition hover:opacity-95">
                        <img
                          src={section.bannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200"}
                          alt={section.bannerAlt || "Banner"}
                          className="w-full h-auto max-h-96 object-cover"
                        />
                      </a>
                    ) : (
                      <img
                        src={section.bannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200"}
                        alt={section.bannerAlt || "Banner"}
                        className="w-full h-auto max-h-96 object-cover"
                      />
                    )}
                  </div>
                );
              }

              // Feature Section
              const iconType = section.iconType || "checkmark";
              return (
                <div
                  key={section.id || secIdx}
                  className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 space-y-5"
                >
                  {section.title && (
                    <div className="text-center max-w-xl mx-auto">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                        {section.title}
                      </h2>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(section.items || []).map((item: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3 dark:bg-slate-800/50 dark:border-slate-800"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          {iconType === "checkmark" && <Check className="h-5 w-5 stroke-[3]" />}
                          {iconType === "bullet" && <Disc className="h-5 w-5" />}
                          {iconType === "star" && <Star className="h-5 w-5 fill-current" />}
                          {iconType === "number" && (
                            <span className="text-sm font-black">{idx + 1}</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 pt-1">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        ) : (
          <section className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 space-y-6">
            <div className="text-center max-w-xl mx-auto">
              <h2 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                কেন আমাদের থেকেই অর্ডার করবেন?
              </h2>
              <p className="text-xs text-slate-500 mt-1">আমরা নিশ্চিত করি সেরা কোয়ালিটি ও বিশ্বস্ত সেবা</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2 dark:bg-slate-800/50 dark:border-slate-800">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <Truck className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">দ্রুততম ডেলিভারি</h3>
                <p className="text-xs text-slate-500">ঢাকা সিটিতে ২৪-৪৮ ঘণ্টা এবং সারাদেশে ২-৩ দিনে ডেলিভারি।</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2 dark:bg-slate-800/50 dark:border-slate-800">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <PackageCheck className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">পণ্য দেখে নেওয়ার সুযোগ</h3>
                <p className="text-xs text-slate-500">ডেলিভারিম্যানের সামনে প্যাকেট খুলে চেক করে মূল্য পরিশোধ করবেন।</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2 dark:bg-slate-800/50 dark:border-slate-800">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  <RotateCcw className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">সহজ রিটার্ন ও এক্সচেঞ্জ</h3>
                <p className="text-xs text-slate-500">সাইজ বা কোয়ালিটিতে কোনো সমস্যা হলে ৭ দিনে সহজ এক্সচেঞ্জ সুযোগ।</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2 dark:bg-slate-800/50 dark:border-slate-800">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <ThumbsUp className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">১০০% প্রিমিয়াম কোয়ালিটি</h3>
                <p className="text-xs text-slate-500">প্রতিটি পণ্য মেটেরিয়াল চেক করে সর্বোচ্চ কোয়ালিটি নিশ্চিত করে পাঠানো হয়।</p>
              </div>
            </div>
          </section>
        )}

        {/* 5. One-Page Cash On Delivery Order Form */}
        <section id="order-form" className="rounded-3xl border-2 border-amber-600 bg-white p-6 shadow-2xl dark:border-amber-500 dark:bg-slate-900 sm:p-10 scroll-mt-20">
          {orderSuccess ? (
            <div className="py-10 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে!</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                অর্ডার রেফারেন্স নম্বর: <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400">{orderSuccess}</span>
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                আমাদের কাস্টমার প্রতিনিধি খুব শীঘ্রই আপনার নাম্বারে কল করে ডেলিভারির বিবরণ কনফার্ম করবেন।
              </p>
              <div className="pt-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  আরও কেনাকাটা করুন <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-center pb-6 border-b border-slate-100 dark:border-slate-800 space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full dark:bg-rose-950 dark:text-rose-400">
                  <ShoppingCart className="h-4 w-4" /> ইনস্ট্যান্ট ক্যাশ অন ডেলিভারি অর্ডার
                </span>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl text-slate-900 dark:text-white pt-1">
                  অর্ডার নিশ্চিত করতে নিচের ফর্মে সঠিক তথ্য লিখুন
                </h2>
                <p className="text-xs text-slate-500">পণ্য হাতে পেয়ে টাকা পরিশোধ করবেন। কোনো অগ্রিম চার্জ নেই!</p>
              </div>

              <form onSubmit={handleOrderSubmit} className="mt-6 space-y-6">
                {/* Size / Variant Selection */}
                {product?.variants && product.variants.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      সাইজ নির্বাচন করুন (Size Selection):
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {product.variants.map((v) => {
                        const isSelected = selectedVariant === v.id;
                        const vPrice = v.priceOverride && v.priceOverride > 0
                          ? v.priceOverride
                          : (product.discountPrice || product.basePrice);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVariant(v.id)}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-extrabold transition ${
                              isSelected
                                ? "border-amber-600 bg-amber-600 text-white shadow-md scale-105"
                                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            <span>{v.name.replace("Size: ", "")}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                              isSelected ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            }`}>
                              ৳{vPrice}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Color Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                    কালার নির্বাচন করুন (Color Selection):
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {productColors.map((c) => {
                      const isSelected = selectedColor === c;
                      const hex = getColorHex(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedColor(isSelected ? "" : c)}
                          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                            isSelected
                              ? "border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-gray-300 shrink-0"
                            style={{ backgroundColor: hex }}
                          />
                          <span>{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      আপনার নাম *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: তানভীর হোসেন"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-600 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      মোবাইল নম্বর *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="017XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-600 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    সম্পূর্ণ ডেলিভারি ঠিকানা *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="বাসা নম্বর, রোড নম্বর, এলাকা, থানা ও জেলার নাম..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-600 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      সিটি / জেলা সিলেক্ট করুন (Select City) *
                    </label>
                    <select
                      value={city}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-600 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    >
                      {DEFAULT_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      এরিয়া (থানা / উপজেলা) সিলেক্ট করুন *
                    </label>
                    <select
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-600 dark:border-slate-800 dark:bg-slate-800 dark:text-white"
                    >
                      {availableAreas.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    পরিমাণ (Quantity)
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800 w-36">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-2 text-lg font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-extrabold text-sm">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-2 text-lg font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4 dark:bg-slate-800 dark:border-slate-700 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>পণ্যের দাম ({quantity} টি):</span>
                    <span className="font-semibold text-slate-900 dark:text-white">৳{activePrice * quantity}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>ডেলিভারি চার্জ ({city === "Dhaka" ? `ঢাকা সিটি — ৳${dhakaCharge}` : `ঢাকার বাইরে — ৳${outsideDhakaCharge}`}):</span>
                    <span className="font-semibold text-slate-900 dark:text-white">৳{shippingFee}</span>
                  </div>
                  <div className="pt-2 border-t border-amber-200/80 dark:border-slate-700 flex justify-between text-base font-bold text-slate-900 dark:text-white">
                    <span>সর্বমোট মূল্য (ক্যাশ অন ডেলিভারি):</span>
                    <span className="text-xl font-black text-amber-700 dark:text-amber-400">৳{activePrice * quantity + shippingFee}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-4 text-base font-black text-white shadow-xl hover:from-emerald-700 hover:to-emerald-800 transition transform active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    "অর্ডার প্রসেস হচ্ছে..."
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" /> অর্ডার কনফার্ম করুন (৳{activePrice * quantity + shippingFee})
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </section>
      </main>

      {/* 6. Sticky Mobile Floating Order Bar */}
      {!orderSuccess && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 border-t border-slate-200 p-3 shadow-2xl backdrop-blur-md md:hidden dark:bg-slate-900/95 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">মোট দাম</span>
            <span className="text-lg font-black text-amber-700 dark:text-amber-400">৳{activePrice * quantity + shippingFee}</span>
          </div>
          <button
            onClick={scrollToOrderForm}
            className="flex-1 rounded-xl bg-amber-600 py-3 text-center text-xs font-black text-white shadow-lg hover:bg-amber-700 transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <ShoppingCart className="h-4 w-4" /> এখনই অর্ডার করুন
          </button>
        </div>
      )}
    </div>
  );
}
