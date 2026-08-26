"use client";

import Link from "next/link";
import { MessageCircle, ShoppingCart } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { useSettings } from "@/context/settings-context";

import { useState, useEffect } from "react";

export function FloatingActions() {
  const pathname = usePathname();
  const { count, detailedLines, subtotal } = useCart();
  const { settings } = useSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  // Build WhatsApp URL with context-rich message
  const rawNumber = settings?.contact?.whatsAppNumber || "+880 1800 000000";
  const cleanNumber = rawNumber.replace(/[^0-9]/g, "");

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    const brand = settings?.general?.websiteName || "Alzeena";
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    const pageTitle = typeof document !== "undefined" ? document.title : "";

    let messageText = `আসসালামু আলাইকুম ${brand}!\nআমি আপনাদের ওয়েবসাইট থেকে যোগাযোগ করছি।\n\n`;

    if (pathname.startsWith("/product/")) {
      // Product Page context
      const headingEl = document.querySelector("h1");
      const prodName = headingEl ? headingEl.textContent?.trim() : pageTitle;
      messageText += `🛍️ *পণ্য:* ${prodName}\n🔗 *লিংক:* ${currentUrl}\n\nআমি এই পণ্যটি সম্পর্কে বিস্তারিত জানতে চাই / অর্ডার করতে চাই।`;
    } else if (pathname.startsWith("/clp/")) {
      // CLP Landing Page context
      const headingEl = document.querySelector("h1, h2");
      const pageHeading = headingEl ? headingEl.textContent?.trim() : pageTitle;
      messageText += `✨ *অফার ল্যান্ডিং পেজ:* ${pageHeading}\n🔗 *লিংক:* ${currentUrl}\n\nআমি এই অফারটি সম্পর্কে জানতে চাই / অর্ডার করতে চাই।`;
    } else if (pathname.startsWith("/cart") || pathname.startsWith("/checkout")) {
      // Cart / Checkout context
      messageText += `🛒 *আমার কার্ট সামারি:*\n`;
      if (detailedLines.length > 0) {
        detailedLines.forEach((item, idx) => {
          messageText += `${idx + 1}. ${item.product.name} (সাইজ: ${item.size}) × ${item.qty}\n`;
        });
        messageText += `💰 *মোট মূল্য:* ৳${subtotal.toLocaleString()}\n`;
      }
      messageText += `🔗 *লিংক:* ${currentUrl}\n\nআমি আমার অর্ডারটি সম্পন্ন করতে সহায়তা চাচ্ছি।`;
    } else if (pathname.startsWith("/category/")) {
      messageText += `📂 *ক্যাটাগরি পেজ:* ${pageTitle}\n🔗 *লিংক:* ${currentUrl}\n\nআমি এই ক্যাটাগরির পণ্যগুলো সম্পর্কে জানতে চাই।`;
    } else {
      // General Homepage / other pages
      messageText += `📄 *বর্তমান পেজ:* ${pageTitle}\n🔗 *লিংক:* ${currentUrl}\n\nআমি একটি বিষয়ে সাহায্য চাচ্ছি।`;
    }

    const waFullUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(messageText)}`;
    window.open(waFullUrl, "_blank");
  };

  const isClp = pathname.startsWith("/clp");

  const handleCartClick = (e: React.MouseEvent) => {
    if (isClp) {
      e.preventDefault();
      const el = document.getElementById("section-order-form");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }
    }
  };

  return (
    <>
      <a
        href={`https://wa.me/${cleanNumber}`}
        onClick={handleWhatsAppClick}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 left-4 z-40 flex items-center gap-2 rounded-[var(--radius)] bg-success px-4 py-3 text-sm font-bold text-ink-foreground shadow-float transition-transform hover:scale-105"
      >
        <MessageCircle className="size-5" />
        WhatsApp
      </a>
      <Link
        href={isClp ? "#section-order-form" : "/cart"}
        onClick={handleCartClick}
        className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-[var(--radius)] gradient-sale px-4 py-3 text-sm font-bold text-primary-foreground shadow-float transition-transform hover:scale-105"
      >
        <ShoppingCart className="size-5" />
        {mounted && count > 0 ? `${count} Item${count > 1 ? "s" : ""}` : "Cart"}
      </Link>
    </>
  );
}