"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, FileText, Loader2, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatBDT, getSizePrice } from "@/lib/shop-data";
import { useOrders, type Order } from "@/lib/orders";
import { ordersService } from "@/lib/api/services/orders.service";
import { useSettings } from "@/context/settings-context";
import { useAuth } from "@/context/auth-context";
import { getSavedNotesStore, saveNotesStore, type NoteRecord } from "@/components/admin/order-notes-modal";

import {
  detectDeliveryZone,
  DELIVERY_ZONES,
  type DeliveryZone,
} from "@/lib/location-data";
import { calculateQuantityOfferDiscount } from "@/lib/offer-calculator";

export default function CheckoutPage() {
  const { detailedLines, subtotal, clear } = useCart();
  const { saveIncomplete, generateNextIncompleteOrderId } = useOrders();
  const { user } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [selectedDeliveryZone, setSelectedDeliveryZone] = useState<DeliveryZone>("inside_dhaka");
  const [userOverriddenZone, setUserOverriddenZone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Persist customer details so returning from cart/products keeps everything typed
  const CHECKOUT_PROFILE_KEY = "arza-checkout-profile-v1";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [placedCustomerName, setPlacedCustomerName] = useState<string>("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHECKOUT_PROFILE_KEY);
      const saved = raw ? JSON.parse(raw) : null;

      const restoredName = (saved?.name as string) || user?.name || "";
      const restoredPhone = (saved?.phone as string) || user?.phone || "";
      const restoredAddress = (saved?.address as string) || user?.address || "";
      const restoredNote = (saved?.note as string) || "";

      setName(restoredName);
      setPhone(restoredPhone);
      setAddress(restoredAddress);
      setNote(restoredNote);

      if (restoredAddress) {
        setSelectedDeliveryZone(detectDeliveryZone(restoredAddress));
      }
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(
          CHECKOUT_PROFILE_KEY,
          JSON.stringify({ name, phone, address, note, deliveryZone: selectedDeliveryZone })
        );
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [name, phone, address, note, selectedDeliveryZone]);

  const handleAddressChange = (addr: string) => {
    setAddress(addr);
    if (!userOverriddenZone) {
      const detected = detectDeliveryZone(addr);
      setSelectedDeliveryZone(detected);
    }
  };

  // Delivery logic from centralized settings & quantity offers
  const zoneCharge = DELIVERY_ZONES[selectedDeliveryZone]?.charge ?? 70;

  const offerResult = calculateQuantityOfferDiscount({
    items: detailedLines.map((l) => ({
      qty: l.qty,
      price: getSizePrice(l.product, l.size),
      product: l.product,
      offerRuleIds: l.product.offerRuleIds,
      isCombo: !!l.product.isBundle,
    })),
    settings,
    baseDeliveryCharge: zoneCharge,
  });

  const isFreeDelivery = offerResult.isFreeDelivery;
  const delivery = subtotal === 0 ? 0 : isFreeDelivery ? 0 : zoneCharge;
  const quantityDiscount = offerResult.discountAmount;
  const grandTotal = Math.max(0, subtotal - quantityDiscount + delivery);

  const enableCOD = settings?.orders?.enableCOD ?? true;
  const enableOnlinePayment = settings?.orders?.enableOnlinePayment ?? true;

  const saveIncompleteDraft = useCallback(
    (customName?: string, customPhone?: string) => {
      const targetName = (customName !== undefined ? customName : name).trim();
      const targetPhone = (customPhone !== undefined ? customPhone : phone).trim().replace(/\D/g, "");

      if (!targetName && !targetPhone) return;
      if (detailedLines.length === 0) return;

      const incompleteId = draftId ?? generateNextIncompleteOrderId();
      if (!draftId) setDraftId(incompleteId);

      const zoneLabel = DELIVERY_ZONES[selectedDeliveryZone]?.label || "ঢাকার ভিতরে";
      const order: Order = {
        id: incompleteId,
        customer: targetName || "Unknown Customer",
        phone: targetPhone || "",
        address: address.trim(),
        city: zoneLabel,
        area: zoneLabel,
        note: note.trim(),
        payment: "Cash on delivery",
        items: detailedLines.map((l) => ({
          slug: l.slug,
          name: l.product.name,
          size: l.size,
          qty: l.qty,
          price: getSizePrice(l.product, l.size),
        })),
        total: grandTotal,
        delivery,
        status: "pending",
        date: new Date().toISOString().slice(0, 10),
        source: "checkout",
      };
      saveIncomplete(order);
    },
    [detailedLines, name, phone, address, selectedDeliveryZone, note, draftId, generateNextIncompleteOrderId, grandTotal, delivery, saveIncomplete]
  );

  useEffect(() => {
    if (placedOrderId) return;
    if (detailedLines.length === 0) return;
    if (!name.trim() && !phone.trim()) return;

    const timer = setTimeout(() => {
      saveIncompleteDraft();
    }, 400);

    return () => clearTimeout(timer);
  }, [detailedLines, name, phone, address, selectedDeliveryZone, note, saveIncompleteDraft, placedOrderId]);

  if (placedOrderId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="size-12" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold text-foreground">
          Order Placed Successfully ✅
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Thank you <span className="font-semibold text-foreground">{placedCustomerName || "valued customer"}</span>, your order has been received and confirmed.
        </p>

        <div className="mt-6 inline-flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order ID:</span>
          <span className="font-mono text-xl font-extrabold text-primary">{placedOrderId}</span>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          We will call your mobile number shortly to verify delivery details.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/order-confirmation/${placedOrderId}`)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <FileText className="size-4" />
            View Invoice
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 py-3.5 text-sm font-bold text-foreground hover:bg-muted transition-all cursor-pointer"
          >
            <ShoppingBag className="size-4" />
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (detailedLines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Nothing to check out</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add a few pieces to your cart and come back.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanPhone = phone.trim().replace(/\D/g, "");
    const cleanAddress = address.trim();

    if (!cleanName) {
      toast.error("নাম প্রয়োজন", { description: "অনুগ্রহ করে আপনার সম্পূর্ণ নাম লিখুন।" });
      return;
    }

    if (!cleanPhone || !/^01[0-9]{9}$/.test(cleanPhone)) {
      toast.error("সঠিক মোবাইল নাম্বার দিন", {
        description: "১১ ডিজিটের সঠিক মোবাইল নাম্বার লিখুন (যেমন: 01XXXXXXXXX)।",
      });
      return;
    }

    if (!cleanAddress || cleanAddress.length < 5) {
      toast.error("সম্পূর্ণ ঠিকানা প্রয়োজন", {
        description: "অনুগ্রহ করে বাসা/রোড/এলাকার বিবরণ সহ ঠিকানা লিখুন।",
      });
      return;
    }

    if (detailedLines.length === 0) {
      toast.error("কার্ট খালি", { description: "কমপক্ষে একটি পণ্য কার্টে যোগ করুন।" });
      return;
    }

    setPlacing(true);

    try {
      const zoneLabel = DELIVERY_ZONES[selectedDeliveryZone]?.label || "ঢাকার ভিতরে";
      // Authenticated session UUID customerId if available
      const authenticatedCustomerId =
        user?.role === "customer" && user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)
          ? user.id
          : undefined;

      // CLP EXACT PAYLOAD STRUCTURE (Multi-product & multi-size pre-resolved)
      const payload = {
        customerId: authenticatedCustomerId,
        customerName: cleanName,
        customerPhone: cleanPhone,
        shippingAddress: cleanAddress,
        city: zoneLabel,
        area: zoneLabel,
        deliveryCharge: delivery,
        subtotal,
        totalAmount: grandTotal,
        paymentMethod: "Cash on delivery",
        notes: note.trim(),
        items: detailedLines.map((l) => {
          const unitPrice = getSizePrice(l.product, l.size);
          return {
            productId: l.product.id,
            productName: l.product.name,
            unitPrice,
            quantity: l.qty,
            size: l.size || "Standard",
            variantName: l.size || "Standard",
            totalPrice: unitPrice * l.qty,
          };
        }),
      };

      // CLP direct submission call: no client-side customer lookup
      const res = await ordersService.createOrder(payload);
      const finalOrderId = res?.orderNumber || `ORD-${Date.now()}`;

      // Clean up incomplete draft if order is placed
      if (draftId) {
        ordersService.removeIncomplete(draftId);
      }

      // Save local order cache so order-confirmation page has it immediately
      try {
        const localOrder: Order = {
          id: finalOrderId,
          customerId: authenticatedCustomerId,
          customer: cleanName,
          phone: cleanPhone,
          address: cleanAddress,
          city: zoneLabel,
          area: zoneLabel,
          note: note.trim(),
          payment: "Cash on delivery",
          status: "pending",
          date: new Date().toISOString().slice(0, 10),
          total: grandTotal,
          delivery,
          source: "checkout",
          items: detailedLines.map((l) => ({
            productId: l.product.id,
            name: l.product.name,
            slug: String(l.slug || l.product.slug || l.product.id || "product"),
            size: l.size || "Standard",
            qty: l.qty,
            price: getSizePrice(l.product, l.size),
          })),
        };
        const rawOrders = window.localStorage.getItem("arza-orders-v1");
        const ordersList = rawOrders ? JSON.parse(rawOrders) : [];
        window.localStorage.setItem(
          "arza-orders-v1",
          JSON.stringify([localOrder, ...ordersList.filter((o: Order) => o.id !== finalOrderId)])
        );
      } catch {
        /* storage fallback */
      }

      // Persist checkout note into localStorage notes store for admin Notes modal
      const checkoutNote = note.trim();
      if (checkoutNote) {
        try {
          const store = getSavedNotesStore();
          const noteRecord: NoteRecord = {
            id: `note-${Date.now()}`,
            text: checkoutNote,
            noteType: "Customer / Delivery Note",
            author: "Customer (Website)",
            timestamp: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
          };
          store[finalOrderId] = [...(store[finalOrderId] || []), noteRecord];
          saveNotesStore(store);
        } catch {
          /* ignore */
        }
      }

      clear();
      setPlacedCustomerName(cleanName);
      setPlacedOrderId(finalOrderId);
      setPlacing(false);
      toast.success("Order placed!", {
        description: `Thanks ${cleanName}, order ${finalOrderId} is confirmed. We'll call to verify.`,
      });

      // CLP instant redirect behavior
      router.push(`/order-confirmation/${finalOrderId}`);
    } catch (error) {
      console.error("Order submission failed:", error);
      toast.error("অর্ডার সম্পন্ন করা যায়নি", {
        description: error instanceof Error ? error.message : "অনুগ্রহ করে আবার চেষ্টা করুন অথবা আমাদের সাথে যোগাযোগ করুন।",
      });
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="section-title border-l-4 border-primary">Checkout</h1>

      <form ref={formRef} onSubmit={submit} noValidate className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold text-foreground">Delivery details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              name="name"
              placeholder="Your name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={(e) => saveIncompleteDraft(e.target.value, undefined)}
            />
            <Field
              label="Mobile number"
              name="phone"
              type="tel"
              placeholder="01XXXXXXXXX"
              pattern="01[0-9]{9}"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              onBlur={(e) => saveIncompleteDraft(undefined, e.target.value.replace(/\D/g, ""))}
            />
            <label className="text-sm sm:col-span-2">
              <span className="font-semibold text-foreground">Address</span>
              <textarea
                name="address"
                required
                rows={3}
                placeholder="House, road, area details"
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <Field label="Note (optional)" name="note" placeholder="Anything we should know?" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <h2 className="mt-8 font-display text-lg font-bold text-foreground">Payment</h2>
          <div className="mt-3 space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-primary bg-secondary/60 p-3">
              <input type="radio" name="payment" value="Cash on delivery" defaultChecked className="mt-1 accent-primary" />
              <span>
                <span className="block text-sm font-bold text-foreground">Cash on delivery</span>
                <span className="text-xs text-muted-foreground">
                  Pay the courier when your parcel arrives.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* RIGHT SIDE: Your Order & Delivery Method Selection */}
        <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-card space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Your order</h2>
            <ul className="mt-4 space-y-3">
              {detailedLines.map((line) => (
                <li
                  key={`${line.slug}-${line.size}`}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {line.product.name}
                    <span className="block text-xs">
                      {line.size} · ×{line.qty}
                    </span>
                  </span>
                  <span className="font-semibold">
                    {formatBDT(getSizePrice(line.product, line.size) * line.qty)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Delivery Method Selection Cards */}
          <div className="space-y-2.5 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                ডেলিভারি মেথড
              </label>
              <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                {userOverriddenZone ? "ম্যানুয়াল নির্বাচিত" : "অটোমেটিক নির্ধারিত"}
              </span>
            </div>

            <div className="space-y-2">
              {(Object.keys(DELIVERY_ZONES) as DeliveryZone[]).map((zoneKey) => {
                const zone = DELIVERY_ZONES[zoneKey];
                const isSelected = selectedDeliveryZone === zoneKey;
                return (
                  <button
                    key={zoneKey}
                    type="button"
                    onClick={() => {
                      setSelectedDeliveryZone(zoneKey);
                      setUserOverriddenZone(true);
                    }}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                        : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-4.5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground/50"
                        }`}
                      >
                        {isSelected && <div className="size-2 bg-white rounded-full" />}
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-extrabold text-foreground block">
                          {zone.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {zoneKey === "inside_dhaka"
                            ? "ঢাকা সিটির ভেতরে দ্রুত ডেলিভারি"
                            : zoneKey === "dhaka_sub_area"
                            ? "সাভার, গাজীপুর, কেরানীগঞ্জ ইত্যাদি"
                            : "সমগ্র বাংলাদেশ (কুরিয়ারের মাধ্যমে)"}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs sm:text-sm font-black shrink-0 ${isSelected ? "text-primary" : "text-foreground"}`}>
                      ৳{zone.charge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <dl className="space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">{formatBDT(subtotal)}</dd>
            </div>

            {quantityDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <dt className="flex items-center gap-1.5 font-medium">
                  <span>Special Discount</span>
                  {offerResult.appliedOfferTitle && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Applied: {offerResult.appliedOfferTitle}
                    </span>
                  )}
                </dt>
                <dd className="font-bold">- {formatBDT(quantityDiscount)}</dd>
              </div>
            )}

            {offerResult.isFreeDelivery && delivery === 0 && quantityDiscount === 0 && (
              <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>Applied offer: {offerResult.appliedOfferTitle}</span>
              </div>
            )}

            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className="font-semibold">
                {delivery === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Free {offerResult.isFreeDelivery && "(Offer Applied)"}
                  </span>
                ) : (
                  formatBDT(delivery)
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-bold text-price">{formatBDT(grandTotal)}</dd>
            </div>
          </dl>
          <button
            type="submit"
            disabled={placing}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60 cursor-pointer"
          >
            {placing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>অর্ডার সাবমিট হচ্ছে...</span>
              </>
            ) : (
              "Confirm order"
            )}
          </button>
        </aside>
      </form>
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="text-sm">
      <span className="font-semibold text-foreground">{label}</span>
      <input
        {...props}
        className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
