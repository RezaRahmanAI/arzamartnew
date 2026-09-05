"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBag,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";
import { toast } from "sonner";
import { getImageUrl, handleImageError } from "@/lib/utils";
import { useSettings } from "@/context/settings-context";
import { ordersService } from "@/lib/api/services/orders.service";
import {
  detectDeliveryZone,
  DELIVERY_ZONES,
  type DeliveryZone,
} from "@/lib/location-data";
import { type Order } from "@/lib/orders";
import { calculateQuantityOfferDiscount } from "@/lib/offer-calculator";

export interface CheckoutOrderItem {
  productId?: string;
  name: string;
  slug: string;
  size: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
  offerRuleIds?: string[] | string;
  isBundle?: boolean;
}

interface ClpOrderFormProps {
  items: CheckoutOrderItem[];
  onUpdateQuantity?: (index: number, quantity: number) => void;
  onOrderCompleted?: (orderId: string) => void;
  source?: "checkout" | "manual" | "pre-order";
  freeShippingThreshold?: number;
}

export function ClpOrderForm({
  items,
  onUpdateQuantity,
  onOrderCompleted,
  source = "checkout",
  freeShippingThreshold,
}: ClpOrderFormProps) {
  const router = useRouter();
  const { settings } = useSettings();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedDeliveryZone, setSelectedDeliveryZone] = useState<DeliveryZone>("inside_dhaka");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Address change with auto-detect delivery zone (Identical to CLP)
  const handleAddressChange = (addr: string) => {
    setCustomerAddress(addr);
    const detectedZone = detectDeliveryZone(addr);
    setSelectedDeliveryZone(detectedZone);
  };

  const rawZoneCharge = DELIVERY_ZONES[selectedDeliveryZone]?.charge ?? 70;

  // Subtotal calculation from items
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [items]);

  // Global quantity offers calculation (Identical to CLP)
  const offerEvaluation = useMemo(() => {
    return calculateQuantityOfferDiscount({
      items: items.map((item) => {
        let parsedRuleIds: string[] | undefined;
        if (Array.isArray(item.offerRuleIds)) {
          parsedRuleIds = item.offerRuleIds;
        } else if (typeof item.offerRuleIds === "string") {
          try {
            const parsed = JSON.parse(item.offerRuleIds);
            parsedRuleIds = Array.isArray(parsed) ? parsed : [item.offerRuleIds];
          } catch {
            parsedRuleIds = [item.offerRuleIds];
          }
        }
        return {
          qty: item.quantity,
          price: item.unitPrice,
          offerRuleIds: parsedRuleIds,
          isCombo: !!item.isBundle,
        };
      }),
      settings,
      baseDeliveryCharge: rawZoneCharge,
    });
  }, [items, settings, rawZoneCharge]);

  const deliveryCharge = useMemo(() => {
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    if (freeShippingThreshold && freeShippingThreshold > 0 && totalQty >= freeShippingThreshold) {
      return 0;
    }
    if (offerEvaluation.isFreeDelivery) {
      return 0;
    }
    return rawZoneCharge;
  }, [rawZoneCharge, items, freeShippingThreshold, offerEvaluation.isFreeDelivery]);

  const quantityDiscount = offerEvaluation.discountAmount;
  const grandTotal = Math.max(0, subtotal - quantityDiscount + deliveryCharge);

  // Incomplete order tracking (Identical to CLP)
  const saveIncompleteDraft = useCallback((nameVal?: string, phoneVal?: string, addrVal?: string) => {
    if (items.length === 0) return;
    const name = (nameVal !== undefined ? nameVal : customerName).trim();
    const phone = (phoneVal !== undefined ? phoneVal : customerPhone).trim();
    const addr = (addrVal !== undefined ? addrVal : customerAddress).trim();

    if (!name && !phone) return;

    const id = draftId || `${Math.floor(10000 + Math.random() * 90000)}`;
    if (!draftId) setDraftId(id);

    const zoneLabel = DELIVERY_ZONES[selectedDeliveryZone]?.label || "ঢাকার ভিতরে";

    const draftOrder: Order = {
      id,
      customer: name || "Incomplete Customer",
      phone: phone || "",
      address: addr,
      city: zoneLabel,
      area: zoneLabel,
      note: notes.trim(),
      payment: "Cash on Delivery",
      status: "pending",
      date: new Date().toISOString().slice(0, 10),
      total: grandTotal,
      delivery: deliveryCharge,
      source,
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        size: item.size || "Standard",
        qty: item.quantity,
        price: item.unitPrice,
      })),
    };

    ordersService.saveIncomplete(draftOrder);
  }, [items, customerName, customerPhone, customerAddress, draftId, notes, grandTotal, deliveryCharge, selectedDeliveryZone, source]);

  useEffect(() => {
    if (items.length === 0) return;
    const name = customerName.trim();
    const phone = customerPhone.trim();
    if (!name && !phone) return;

    const timer = setTimeout(() => {
      saveIncompleteDraft();
    }, 400);

    return () => clearTimeout(timer);
  }, [customerName, customerPhone, customerAddress, items, saveIncompleteDraft]);

  // Submit Direct Order (Exact CLP call: ordersService.createOrder -> createOrderAction)
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("অনুগ্রহ করে আপনার নাম লিখুন");
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      toast.error("অনুগ্রহ করে সঠিক মোবাইল নম্বর দিন");
      return;
    }
    if (!customerAddress.trim()) {
      toast.error("অনুগ্রহ করে সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন");
      return;
    }
    if (items.length === 0) {
      toast.error("কমপক্ষে একটি পণ্য নির্বাচন করুন");
      return;
    }

    try {
      setIsSubmitting(true);
      const zoneLabel = DELIVERY_ZONES[selectedDeliveryZone]?.label || "ঢাকার ভিতরে";
      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        shippingAddress: customerAddress.trim(),
        city: zoneLabel,
        area: zoneLabel,
        deliveryCharge: deliveryCharge,
        subtotal: subtotal,
        totalAmount: grandTotal,
        paymentMethod: "Cash on Delivery",
        notes: notes.trim(),
        source,
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          size: item.size || "Standard",
          variantName: item.size || "Standard",
          totalPrice: item.unitPrice * item.quantity,
        })),
      };

      const res = await ordersService.createOrder(payload);
      const orderId = res?.orderNumber || `${Date.now()}`;

      if (draftId) {
        ordersService.removeIncomplete(draftId);
      }

      try {
        const localOrder: Order = {
          id: orderId,
          customer: customerName.trim(),
          phone: customerPhone.trim(),
          address: customerAddress.trim(),
          city: zoneLabel,
          area: zoneLabel,
          note: notes.trim(),
          payment: "Cash on Delivery",
          status: "pending",
          date: new Date().toISOString().slice(0, 10),
          total: grandTotal,
          delivery: deliveryCharge,
          source,
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            slug: item.slug,
            size: item.size || "Standard",
            qty: item.quantity,
            price: item.unitPrice,
          })),
        };
        const rawOrders = window.localStorage.getItem("arza-orders-v1");
        const ordersList = rawOrders ? JSON.parse(rawOrders) : [];
        window.localStorage.setItem(
          "arza-orders-v1",
          JSON.stringify([localOrder, ...ordersList.filter((o: Order) => o.id !== orderId)])
        );
      } catch {
        /* storage fallback */
      }

      if (onOrderCompleted) {
        onOrderCompleted(orderId);
      }

      toast.success("আপনার অর্ডারটি সফলভাবে গৃহীত হয়েছে!");
      router.push(`/order-confirmation/${orderId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "অর্ডার সম্পন্ন করতে সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
      {/* Form Header (Identical to CLP) */}
      <div className="bg-primary text-primary-foreground p-6 md:p-7 text-center space-y-1.5">
        <h3 className="text-2xl md:text-3xl font-black tracking-tight">
          📝 সরাসরি অর্ডার করতে তথ্য পূরণ করুন
        </h3>
        <p className="text-sm md:text-base text-primary-foreground font-bold">
          ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন
        </p>
      </div>

      <form onSubmit={handlePlaceOrder} className="p-5 sm:p-7 md:p-9">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column (Customer Form Details): 7 cols on lg */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            <h4 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2 pb-2.5 border-b border-border">
              <Truck className="size-5 text-primary" />
              ডেলিভারির তথ্য
            </h4>

            {/* Customer Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-black text-foreground">আপনার নাম *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onBlur={(e) => saveIncompleteDraft(e.target.value, undefined)}
                  placeholder="যেমন: মোঃ করিম"
                  className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm sm:text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-black text-foreground">
                  মোবাইল নম্বর * (১১ ডিজিট)
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                  onBlur={(e) => saveIncompleteDraft(undefined, e.target.value.replace(/\D/g, ""))}
                  placeholder="01XXXXXXXXX"
                  className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm sm:text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
            </div>

            {/* Full Address with Smart Delivery Detector */}
            <div className="space-y-1.5">
              <label className="text-sm font-black text-foreground">
                পূর্ণাঙ্গ ঠিকানা (বাসা/রোড/এলাকা) *
              </label>
              <textarea
                required
                rows={2}
                value={customerAddress}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="বাসা নম্বর, রোড, এলাকার বিস্তারিত লিখুন..."
                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm sm:text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
              />
            </div>

            {/* Delivery Zone Card - Single auto calculated based on address */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  ডেলিভারি মেথড
                </label>
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  অটোমেটিক নির্ধারিত
                </span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-xl border-2 border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-4.5 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
                    <div className="size-2 bg-white rounded-full" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-extrabold text-foreground block">
                      {DELIVERY_ZONES[selectedDeliveryZone]?.label || "ঢাকার ভিতরে"} — {deliveryCharge === 0 ? "ফ্রি" : `${deliveryCharge} ৳`}
                    </span>
                    <span className="text-[11px] sm:text-xs text-muted-foreground">
                      আপনার প্রদত্ত ঠিকানা অনুযায়ী চার্জ স্বয়ংক্রিয়ভাবে হিসাব করা হয়েছে
                    </span>
                  </div>
                </div>
                <span className="text-sm sm:text-base font-black text-primary shrink-0">
                  {deliveryCharge === 0 ? "ফ্রি" : `৳${deliveryCharge}`}
                </span>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-sm font-black text-foreground">নোট (ঐচ্ছিক)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="অর্ডার সম্পর্কে কিছু জানাতে চাইলে লিখুন..."
                className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm sm:text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
          </div>

          {/* Right Column (Cart Summary & Total Pricing): 5 cols on lg */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
            <div className="bg-muted/40 border border-border rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <label className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag className="size-4.5 text-primary" />
                  আপনার কার্ট ({items.length}টি পণ্য)
                </label>
              </div>

              {/* Cart Products List */}
              {items.length === 0 ? (
                <div className="py-6 px-4 text-center rounded-xl border border-dashed border-border bg-background/60 space-y-2">
                  <ShoppingBag className="size-7 text-muted-foreground/50 mx-auto" />
                  <p className="text-sm font-black text-foreground/80">এখনও কোনো পণ্য নির্বাচন করা হয়নি</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div
                      key={`${item.productId}-${item.size}-${idx}`}
                      className="p-3 bg-background rounded-xl border border-border text-sm shadow-xs space-y-2.5"
                    >
                      {/* Top Row: Thumbnail + Product Full Name + Price */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <img
                            src={getImageUrl(item.imageUrl, "thumb")}
                            alt={item.name}
                            width={48}
                            height={48}
                            loading="lazy"
                            decoding="async"
                            className="size-12 rounded-lg object-cover border border-border shrink-0 bg-muted/20"
                            onError={handleImageError}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-foreground text-xs sm:text-sm leading-snug line-clamp-2">
                              {item.name}
                            </p>
                            {item.size && (
                              <span className="inline-block mt-1 text-[11px] font-extrabold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
                                সাইজ: {item.size}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-black text-foreground text-sm sm:text-base">
                            ৳{(item.unitPrice * item.quantity).toLocaleString()}
                          </span>
                          {item.quantity > 1 && (
                            <span className="block text-[10px] text-muted-foreground">
                              (৳{item.unitPrice.toLocaleString()} × {item.quantity})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Quantity Stepper and Quick Controls */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                        <span className="text-xs font-semibold text-muted-foreground">
                          পরিমাণ (Quantity):
                        </span>

                        <div className="flex items-center border border-border rounded-lg bg-muted/40 overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity && onUpdateQuantity(idx, item.quantity - 1)}
                            className="size-7 sm:size-8 flex items-center justify-center hover:bg-muted active:bg-muted/80 cursor-pointer font-bold text-foreground transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <span className="w-8 text-center font-black text-xs sm:text-sm bg-background py-1">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity && onUpdateQuantity(idx, item.quantity + 1)}
                            className="size-7 sm:size-8 flex items-center justify-center hover:bg-muted active:bg-muted/80 cursor-pointer font-bold text-foreground transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="p-4 bg-background rounded-xl border border-border space-y-2.5 text-sm">
                <div className="flex justify-between text-foreground/80 font-medium">
                  <span>প্রোডাক্ট সাবটোটাল</span>
                  <span className="font-extrabold text-foreground">
                    ৳{subtotal.toLocaleString()}
                  </span>
                </div>

                {quantityDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span>বিশেষ ছাড় (Discount)</span>
                      {offerEvaluation.appliedOfferTitle && (
                        <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded font-extrabold">
                          {offerEvaluation.appliedOfferTitle}
                        </span>
                      )}
                    </span>
                    <span className="font-black">
                      - ৳{quantityDiscount.toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-foreground/80 font-medium">
                  <span>ডেলিভারি চার্জ</span>
                  <span className="font-extrabold text-foreground">
                    {deliveryCharge === 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">
                        ফ্রি {offerEvaluation.isFreeDelivery && "(অফার)"}
                      </span>
                    ) : (
                      `৳${deliveryCharge}`
                    )}
                  </span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between text-base font-black text-foreground">
                  <span>সর্বমোট প্রদেয় বিল</span>
                  <span className="text-primary text-lg sm:text-xl font-black">
                    ৳{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all text-base sm:text-lg flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>অর্ডার প্রসেস হচ্ছে...</span>
                  </>
                ) : items.length === 0 ? (
                  <>
                    <ShoppingBag className="size-5.5" />
                    <span>প্রথমে পণ্য নির্বাচন করুন</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-5.5" />
                    <span>অর্ডার নিশ্চিত করুন (৳{grandTotal.toLocaleString()})</span>
                  </>
                )}
              </button>

              {/* Trust Badges under Button */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs font-semibold text-foreground/80 bg-muted/30 p-3.5 rounded-xl border border-border">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4.5 text-emerald-600 shrink-0" /> ১০০% অরিজিনাল পণ্য
                </span>
                <span className="flex items-center gap-1.5">
                  <HeartHandshake className="size-4.5 text-blue-600 shrink-0" /> সহজ রিটার্ন সুবিধা
                </span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
