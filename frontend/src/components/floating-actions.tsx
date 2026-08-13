"use client";

import Link from "next/link";
import { MessageCircle, ShoppingCart } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { useSettings } from "@/context/settings-context";

export function FloatingActions() {
  const pathname = usePathname();
  const { count } = useCart();
  const { settings } = useSettings();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  // Build WhatsApp URL from settings contact number
  const rawNumber = settings?.contact?.whatsAppNumber || "+880 1800 000000";
  const cleanNumber = rawNumber.replace(/[^0-9]/g, "");
  const waUrl = `https://wa.me/${cleanNumber}`;

  return (
    <>
      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 left-4 z-40 flex items-center gap-2 rounded-full bg-success px-4 py-3 text-sm font-bold text-ink-foreground shadow-float transition-transform hover:scale-105"
      >
        <MessageCircle className="size-5" />
        WhatsApp
      </a>
      <Link
        href="/cart"
        className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full gradient-sale px-4 py-3 text-sm font-bold text-primary-foreground shadow-float transition-transform hover:scale-105"
      >
        <ShoppingCart className="size-5" />
        {count > 0 ? `${count} Item${count > 1 ? "s" : ""}` : "Cart"}
      </Link>
    </>
  );
}