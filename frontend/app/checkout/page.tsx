"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCart } from "@/lib/cart";
import { getSizePrice } from "@/lib/shop-data";
import { ClpOrderForm, CheckoutOrderItem } from "@/components/checkout/clp-order-form";

export default function CheckoutPage() {
  const { detailedLines, setQty, clear, count } = useCart();

  const checkoutItems: CheckoutOrderItem[] = detailedLines.map((line) => ({
    productId: line.product.id,
    name: line.product.name,
    slug: line.product.slug || line.product.id || "product",
    size: line.size || "Standard",
    quantity: line.qty,
    unitPrice: getSizePrice(line.product, line.size),
    imageUrl: line.product.image || (line.product.images?.[0] ?? ""),
    offerRuleIds: line.product.offerRuleIds,
    isBundle: !!line.product.isBundle,
  }));

  const handleUpdateQuantity = (index: number, quantity: number) => {
    setQty(index, quantity);
  };

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top bar back link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>কেনাকাটা চালিয়ে যান</span>
          </Link>
          <span className="text-xs font-semibold text-muted-foreground">
            {count}টি পণ্য নির্বাচিত
          </span>
        </div>

        {/* Reusing exact same CLP Order Form */}
        <ClpOrderForm
          items={checkoutItems}
          onUpdateQuantity={handleUpdateQuantity}
          onOrderCompleted={() => clear()}
          source="checkout"
        />
      </div>
    </div>
  );
}
