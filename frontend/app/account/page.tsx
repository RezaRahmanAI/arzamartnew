"use client";

import Link from "next/link";
import { Heart, MapPin, Package, Sparkles, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  currentCustomer,
  formatBDT,
  myOrders,
  statusStyles,
} from "@/lib/dashboard-data";
import { useWishlist } from "@/lib/wishlist";
import { useAuth } from "@/context/auth-context";
import { useOrders } from "@/lib/orders";
import { Trash2, ShoppingBag, LogOut, CheckCircle2 } from "lucide-react";
import { getImageUrl, handleImageError } from "@/lib/utils";

function AccountContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { wishlistProducts, removeFromWishlist } = useWishlist();
  const { user, logout } = useAuth();
  const { orders } = useOrders();
  const [activeTab, setActiveTab] = useState("orders");

  useEffect(() => {
    if (tabParam === "wishlist" || tabParam === "profile" || tabParam === "orders") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const customerInfo = {
    customerId: user?.id || "CUST-1001",
    name: user?.name || currentCustomer.name,
    email: user?.email || currentCustomer.email,
    phone: user?.phone || currentCustomer.phone,
    address: user?.address || currentCustomer.address,
    isGoogleVerified: user?.isGoogleVerified ?? true,
    points: currentCustomer.points,
  };

  // Dynamic order filtering matching Master Customer Record (by customerId or phone)
  const customerOrders = orders.filter(
    (o) =>
      (o.customerId && o.customerId === customerInfo.customerId) ||
      (customerInfo.phone && o.phone && o.phone.replace(/\D/g, "") === customerInfo.phone.replace(/\D/g, ""))
  );

  const displayOrders = customerOrders.length > 0 ? customerOrders : myOrders;

  const spent = displayOrders.reduce((sum, o) => sum + o.total, 0);

  const stats = [
    { label: "Orders placed", value: String(displayOrders.length), icon: Package },
    { label: "Total spent", value: formatBDT(spent), icon: Wallet },
    { label: "Reward points", value: String(customerInfo.points), icon: Sparkles },
    { label: "Saved items", value: String(wishlistProducts.length), icon: Heart },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title border-l-4 border-primary">My dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back, {customerInfo.name.split(" ")[0]} — here's everything about your ARZAMART
            account.
          </p>
        </div>
        {user && (
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-xs font-bold text-muted-foreground hover:text-destructive hover:border-destructive transition-colors cursor-pointer shadow-sm"
          >
            <LogOut className="size-3.5" /> Sign Out
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-card">
            <s.icon className="size-4 text-primary" />
            <p className="mt-3 font-display text-xl font-extrabold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-5 space-y-3">
          {displayOrders.length === 0 && (
            <p className="text-sm text-muted-foreground">You haven't placed an order yet.</p>
          )}
          {displayOrders.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusStyles[o.status]}`}
                >
                  {o.status}
                </span>
                <span className="text-xs text-muted-foreground">{o.date}</span>
                <span className="ml-auto font-bold">{formatBDT(o.total)}</span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {o.items.map((it, i) => (
                  <li key={`${it.slug}-${i}`}>
                    {it.name} · size {it.size} · ×{it.qty}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="wishlist" className="mt-5">
          {wishlistProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <Heart className="mx-auto size-10 text-muted-foreground/40" />
              <h3 className="mt-3 text-base font-semibold text-foreground">Your wishlist is empty</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse products and click the heart icon to save your favorite items here.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
              >
                Explore Products
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {wishlistProducts.map((p) => (
                <div
                  key={p.slug}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-3 shadow-card transition-all hover:shadow-lg"
                >
                  <button
                    type="button"
                    onClick={() => removeFromWishlist(p.slug)}
                    className="absolute right-4 top-4 z-10 flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground border border-border backdrop-blur-md hover:bg-destructive hover:text-white transition-colors cursor-pointer"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="size-3.5" />
                  </button>

                  <Link href={`/product/${p.slug}`} className="block">
                    <img
                      src={getImageUrl(p.image)}
                      alt={p.name}
                      loading="lazy"
                      onError={handleImageError}
                      className="aspect-square w-full rounded-lg object-cover transition-transform duration-300 group-hover:scale-105 bg-muted/20"
                    />
                  </Link>

                  <div className="mt-3 flex flex-1 flex-col justify-between">
                    <div>
                      <Link href={`/product/${p.slug}`}>
                        <p className="text-sm font-semibold hover:text-primary transition-colors line-clamp-1">
                          {p.name}
                        </p>
                      </Link>
                      <p className="mt-1 text-sm font-bold text-price">{formatBDT(p.price)}</p>
                    </div>

                    <Link
                      href={`/product/${p.slug}`}
                      className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      <ShoppingBag className="size-3.5" /> View Product
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile" className="mt-5">
          <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer ID</p>
                <p className="text-sm font-bold font-mono text-primary">{customerInfo.customerId}</p>
              </div>
              {customerInfo.isGoogleVerified && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="size-3.5" /> Verified Account
                </span>
              )}
            </div>
            <Row label="Name" value={customerInfo.name} />
            <Row label="Email" value={customerInfo.email} />
            <Row label="Phone" value={customerInfo.phone} />
            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Delivery address
                </p>
                <p className="text-sm font-medium">{customerInfo.address}</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Continue shopping
        </Link>
        <Link
          href="/admin"
          className="rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground"
        >
          Store admin dashboard
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-muted-foreground">Loading dashboard...</div>}>
      <AccountContent />
    </Suspense>
  );
}
