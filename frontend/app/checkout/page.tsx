"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { formatBDT, getSizePrice } from "@/lib/shop-data";
import { generateOrderId, useOrders, type Order } from "@/lib/orders";
import { useSettings } from "@/context/settings-context";
import { useCustomers } from "@/lib/customers-store";
import { useAuth } from "@/context/auth-context";
import { getSavedNotesStore, saveNotesStore, type NoteRecord } from "@/components/admin/order-notes-modal";

import { DEFAULT_CITIES, getAreasForCity } from "@/lib/location-data";

export default function CheckoutPage() {
  const { detailedLines, subtotal, clear } = useCart();
  const { addOrder, saveIncomplete, removeIncomplete, generateNextOrderId } = useOrders();
  const { findOrCreateByPhone, findCustomerByPhone } = useCustomers();
  const { loginAsCustomer, user } = useAuth();
  const { settings } = useSettings();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState("Dhaka");
  const [selectedArea, setSelectedArea] = useState(() => getAreasForCity("Dhaka")[0] || "");
  const formRef = useRef<HTMLFormElement>(null);

  // Persist customer details so returning from cart/products keeps everything typed
  const CHECKOUT_PROFILE_KEY = "arza-checkout-profile-v1";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHECKOUT_PROFILE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      const master = user?.phone ? findCustomerByPhone(user.phone) : null;

      setName((saved?.name as string) || master?.fullName || "");
      setPhone((saved?.phone as string) || master?.mobileNumber || "");
      setAddress((saved?.address as string) || master?.address || "");
      setNote((saved?.note as string) || master?.defaultNote || "");
      const city = (saved?.city as string) || master?.district || "Dhaka";
      setSelectedCity(city);
      const areas = getAreasForCity(city);
      setSelectedArea(areas[0] || saved?.area || "");
    } catch {
      /* ignore */
    }
  }, [user?.phone]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(
          CHECKOUT_PROFILE_KEY,
          JSON.stringify({ name, phone, address, note, city: selectedCity, area: selectedArea })
        );
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [name, phone, address, note, selectedCity, selectedArea]);

  const availableAreas = getAreasForCity(selectedCity);

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    const areas = getAreasForCity(city);
    setSelectedArea(areas[0] || "");
  };

  // Delivery logic from centralized settings
  const freeShippingThreshold = settings?.shipping?.freeShippingThreshold ?? 5000;
  const enableFreeShipping = settings?.shipping?.enableFreeShipping ?? true;
  const defaultCharge = settings?.shipping?.rules?.[0]?.charge ?? 70;
  const delivery = subtotal === 0
    ? 0
    : (enableFreeShipping && subtotal >= freeShippingThreshold)
      ? 0
      : defaultCharge;

  const enableCOD = settings?.orders?.enableCOD ?? true;
  const enableOnlinePayment = settings?.orders?.enableOnlinePayment ?? true;

  useEffect(() => {
    if (detailedLines.length === 0) return;
    const id = draftId ?? generateNextOrderId();
    if (!draftId) setDraftId(id);

    const interval = setInterval(() => {
      const form = formRef.current;
      if (!form) return;
      const data = new FormData(form);
      const name = String(data.get("name") ?? "").trim();
      const phone = String(data.get("phone") ?? "").trim();
      if (!name && !phone) return;

      const order: Order = {
        id,
        customer: name || "Incomplete",
        phone,
        address: String(data.get("address") ?? "").trim(),
        city: selectedCity,
        area: selectedArea,
        note: String(data.get("note") ?? "").trim(),
        payment: String(data.get("payment") ?? "Cash on delivery"),
        items: detailedLines.map((l) => ({
          slug: l.slug,
          name: l.product.name,
          size: l.size,
          color: l.color,
          qty: l.qty,
          price: getSizePrice(l.product, l.size),
        })),
        total: subtotal + delivery,
        delivery,
        status: "pending",
        date: new Date().toISOString().slice(0, 10),
        source: "checkout",
      };
      saveIncomplete(order);
    }, 5000);

    return () => clearInterval(interval);
  }, [detailedLines, draftId, subtotal, delivery, saveIncomplete, selectedCity, selectedArea]);

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

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const address = String(formData.get("address") ?? "");

    // Master Customer Record Architecture: find or create Customer Master
    const customerMaster = findOrCreateByPhone(phone, {
      fullName: name,
      address,
      district: selectedCity,
    });

    // Auto-login the customer so their order is linked to their profile
    loginAsCustomer(customerMaster);

    setPlacing(true);
    const orderId = draftId ?? generateNextOrderId();
    const order: Order = {
      id: orderId,
      customerId: customerMaster.customerId,
      customer: name,
      phone,
      address,
      city: selectedCity,
      area: selectedArea,
      note: String(formData.get("note") ?? ""),
      payment: String(formData.get("payment") ?? "Cash on delivery"),
      items: detailedLines.map((l) => ({
        slug: l.slug,
        name: l.product.name,
        size: l.size,
        color: l.color,
        qty: l.qty,
        price: getSizePrice(l.product, l.size),
      })),
      total: subtotal + delivery,
      delivery,
      status: "pending",
      date: new Date().toISOString().slice(0, 10),
      source: "checkout",
    };
    addOrder(order);

    // Persist checkout note into localStorage notes store for admin Notes modal
    const checkoutNote = String(formData.get("note") ?? "").trim();
    if (checkoutNote) {
      const store = getSavedNotesStore();
      const noteRecord: NoteRecord = {
        id: `note-${Date.now()}`,
        text: checkoutNote,
        noteType: "Customer / Delivery Note",
        author: "Customer (Website)",
        timestamp: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      };
      store[order.id] = [...(store[order.id] || []), noteRecord];
      saveNotesStore(store);
    }

    if (draftId) removeIncomplete(draftId);
    clear();
    toast.success("Order placed!", {
      description: `Thanks ${name}, order ${orderId} is confirmed. We'll call to verify.`,
    });
    router.push(`/order-confirmation/${orderId}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="section-title border-l-4 border-primary">Checkout</h1>

      <form ref={formRef} onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold text-foreground">Delivery details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="name" placeholder="Your name" required value={name} onChange={(e) => setName(e.target.value)} />
            <Field
              label="Mobile number"
              name="phone"
              type="tel"
              placeholder="01XXXXXXXXX"
              pattern="01[0-9]{9}"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <label className="text-sm sm:col-span-2">
              <span className="font-semibold text-foreground">Address</span>
              <textarea
                name="address"
                required
                rows={3}
                placeholder="House, road, area details"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <label className="text-sm">
              <span className="font-semibold text-foreground">Select City</span>
              <select
                name="city"
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {DEFAULT_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="font-semibold text-foreground">Select Area (Thana / Upazila)</span>
              <select
                name="area"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {availableAreas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
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

        <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-bold text-foreground">Your order</h2>
          <ul className="mt-4 space-y-3">
            {detailedLines.map((line) => (
              <li
                key={`${line.slug}-${line.size}-${line.color}`}
                className="flex justify-between gap-3 text-sm"
              >
                <span className="text-muted-foreground">
                  {line.product.name}
                  <span className="block text-xs">
                    {line.color} · {line.size} · ×{line.qty}
                  </span>
                </span>
                <span className="font-semibold">
                  {formatBDT(getSizePrice(line.product, line.size) * line.qty)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold">{formatBDT(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className="font-semibold">{delivery === 0 ? "Free" : formatBDT(delivery)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-bold text-price">{formatBDT(subtotal + delivery)}</dd>
            </div>
          </dl>
          <button
            type="submit"
            disabled={placing}
            className="mt-5 w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60 cursor-pointer"
          >
            {placing ? "Placing order..." : "Confirm order"}
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
