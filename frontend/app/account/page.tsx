"use client";

import Link from "next/link";
import { Heart, MapPin, Package, Sparkles, Wallet, Trash2, ShoppingBag, LogOut, CheckCircle2, KeyRound, Save, User, Phone, FileText, Lock } from "lucide-react";
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
import { useCustomers } from "@/lib/customers-store";
import { customersService } from "@/lib/api/services/customers.service";
import { getImageUrl, handleImageError } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function AccountContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { wishlistProducts, removeFromWishlist } = useWishlist();
  const { user, logout, setPassword, changePassword, loginAsCustomer } = useAuth();
  const { orders } = useOrders();
  const { updateCustomerProfile, findCustomerByPhone, upsertCustomerFromServer } = useCustomers();
  const [activeTab, setActiveTab] = useState("orders");

  // Profile edit form state
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pAddress, setPAddress] = useState("");
  const [pNote, setPNote] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Password state
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [curPass, setCurPass] = useState("");
  const [passSaving, setPassSaving] = useState(false);

  useEffect(() => {
    if (tabParam === "wishlist" || tabParam === "profile" || tabParam === "orders") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Load profile values into the edit form whenever the logged-in user changes
  useEffect(() => {
    const master = user?.phone ? findCustomerByPhone(user.phone) : null;
    setPName(user?.name || "");
    setPPhone(user?.phone || "");
    setPAddress(user?.address || master?.address || "");
    setPNote(master?.defaultNote || "");
  }, [user?.id, user?.phone]);

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!pName.trim() || !pPhone.trim()) {
      toast.error("Name and phone number are required");
      return;
    }

    setProfileSaving(true);
    const updated = updateCustomerProfile(user.id, {
      fullName: pName.trim(),
      mobileNumber: pPhone.trim(),
      address: pAddress.trim(),
      defaultNote: pNote.trim(),
    });
    if (updated) {
      loginAsCustomer(updated);
      toast.success("Profile updated successfully!");
    } else {
      setProfileSaving(false);
      toast.error("Could not update profile. Please refresh and try again.");
      return;
    }

    // Best-effort sync to SQL Server so the profile survives device changes.
    try {
      const serverProfile = await customersService.getByPhone(pPhone.trim());
      const payload = {
        fullName: pName.trim(),
        phone: pPhone.trim(),
        email: user.email,
        defaultAddress: pAddress.trim() || undefined,
        defaultNote: pNote.trim() || undefined,
      };
      if (serverProfile) {
        const synced = await customersService.updateProfile(serverProfile.id, payload);
        if (synced) {
          const master = upsertCustomerFromServer(synced);
          loginAsCustomer(master);
        }
      } else {
        const created = await customersService.create({
          fullName: pName.trim(),
          email: user.email,
          phone: pPhone.trim(),
          defaultAddress: pAddress.trim() || "Dhaka, Bangladesh",
          district: "Dhaka",
        });
        if (created) {
          await customersService.updateProfile(created.id, {
            defaultNote: pNote.trim() || undefined,
          });
        }
      }
    } catch {
      // Offline — local save already succeeded.
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass1 !== pass2) {
      toast.error("Passwords do not match");
      return;
    }
    if (!user?.phone) {
      toast.error("No phone number on this account");
      return;
    }
    setPassSaving(true);
    const ok = await setPassword(user.phone, pass1);
    setPassSaving(false);
    if (ok) {
      setPass1("");
      setPass2("");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass1 !== pass2) {
      toast.error("New passwords do not match");
      return;
    }
    if (!user?.phone) {
      toast.error("No phone number on this account");
      return;
    }
    setPassSaving(true);
    const ok = await changePassword(user.phone, curPass, pass1);
    setPassSaving(false);
    if (ok) {
      setCurPass("");
      setPass1("");
      setPass2("");
    }
  };

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
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Personal information (editable) */}
            <form onSubmit={handleSaveProfile} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                    <User className="size-4 text-primary" /> Personal Information
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Edit your details — they are pre-filled on your next checkout.
                  </p>
                </div>
                {customerInfo.isGoogleVerified && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                    <CheckCircle2 className="size-3.5" /> Verified
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer ID</p>
                  <p className="text-sm font-bold font-mono text-primary">{customerInfo.customerId}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{customerInfo.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pName" className="text-xs font-semibold">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                      id="pName"
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pPhone" className="text-xs font-semibold">Mobile Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                      id="pPhone"
                      type="tel"
                      value={pPhone}
                      onChange={(e) => setPPhone(e.target.value)}
                      className="pl-9 text-sm"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Your orders are tracked by this number. Changing it affects how your order history is found.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pAddress" className="text-xs font-semibold">Delivery Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Textarea
                      id="pAddress"
                      rows={2}
                      value={pAddress}
                      onChange={(e) => setPAddress(e.target.value)}
                      className="pl-9 text-sm resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pNote" className="text-xs font-semibold">Default Delivery Note</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Textarea
                      id="pNote"
                      rows={2}
                      value={pNote}
                      onChange={(e) => setPNote(e.target.value)}
                      placeholder="e.g. Call me before delivery, avoid Saturday..."
                      className="pl-9 text-sm resize-none"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    This note is pre-filled in the &quot;Note (optional)&quot; field on your checkout form.
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={profileSaving} className="w-full h-10 text-sm font-bold gap-2">
                <Save className="size-4" /> {profileSaving ? "Saving..." : "Save Profile"}
              </Button>
            </form>

            {/* Password & Security */}
            <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="border-b border-border/60 pb-3">
                <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                  <Lock className="size-4 text-primary" /> Password &amp; Security
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {user?.hasPassword
                    ? "Your account is password protected. You can change your password below."
                    : "Set a password to sign in later with your mobile number."}
                </p>
              </div>

              {user?.hasPassword ? (
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="curPass" className="text-xs font-semibold">Current Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Input
                        id="curPass"
                        type="password"
                        value={curPass}
                        onChange={(e) => setCurPass(e.target.value)}
                        className="pl-9 text-sm"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newPass1" className="text-xs font-semibold">New Password</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Input
                        id="newPass1"
                        type="password"
                        value={pass1}
                        onChange={(e) => setPass1(e.target.value)}
                        className="pl-9 text-sm"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newPass2" className="text-xs font-semibold">Confirm New Password</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Input
                        id="newPass2"
                        type="password"
                        value={pass2}
                        onChange={(e) => setPass2(e.target.value)}
                        className="pl-9 text-sm"
                        minLength={6}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={passSaving} className="w-full h-10 text-sm font-bold gap-2">
                    <KeyRound className="size-4" /> {passSaving ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSetPassword} className="space-y-3">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">You ordered as a guest.</span>{" "}
                    Set a password now so you can sign in later with your mobile number and track your orders.
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="setPass1" className="text-xs font-semibold">New Password</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Input
                        id="setPass1"
                        type="password"
                        value={pass1}
                        onChange={(e) => setPass1(e.target.value)}
                        className="pl-9 text-sm"
                        minLength={6}
                        placeholder="Minimum 6 characters"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="setPass2" className="text-xs font-semibold">Confirm Password</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <Input
                        id="setPass2"
                        type="password"
                        value={pass2}
                        onChange={(e) => setPass2(e.target.value)}
                        className="pl-9 text-sm"
                        minLength={6}
                        placeholder="Re-enter your password"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={passSaving} className="w-full h-10 text-sm font-bold gap-2">
                    <KeyRound className="size-4" /> {passSaving ? "Setting..." : "Set Password"}
                  </Button>
                </form>
              )}
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
      </div>
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
