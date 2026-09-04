"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { detectDeliveryZone, DELIVERY_ZONES } from "@/lib/location-data";
import {
  Lock,
  Mail,
  ArrowRight,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "signin" | "signup";

export default function CustomerLoginPage() {
  const router = useRouter();
  const { user, loginCustomer, registerCustomer } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign in state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Sign up state (order form fields + password)
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPass, setShowRegPass] = useState(false);

  if (user && user.role === "customer") {
    router.push("/account");
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await loginCustomer(identifier, password);
    setIsSubmitting(false);
    if (success) {
      router.push("/account");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const zone = detectDeliveryZone(address);
    const zoneLabel = DELIVERY_ZONES[zone]?.label || "ঢাকার ভিতরে";
    const cleanPhone = phone.trim().replace(/\D/g, "");
    const fallbackEmail = `${cleanPhone || "customer"}@customer.local`;
    const success = await registerCustomer({
      name: name.trim(),
      email: fallbackEmail,
      phone: phone.trim(),
      address: address.trim(),
      password: regPassword,
      area: zoneLabel,
      district: zoneLabel,
    });
    setIsSubmitting(false);
    if (success) {
      router.push("/account");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-card">
        {/* Brand / Title Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShoppingBag className="size-6" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {mode === "signin" ? "Sign in to your account" : "Create your customer account"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "signin"
              ? "Access your past orders, delivery details and wishlist."
              : "Register to save addresses and track all orders instantly."}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-lg py-2 text-xs font-bold transition-all ${
              mode === "signin"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg py-2 text-xs font-bold transition-all ${
              mode === "signup"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="si-identifier" className="text-xs font-semibold">Mobile Number or Email</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="si-identifier"
                  type="text"
                  placeholder="01XXXXXXXXX or email@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="si-password" className="text-xs font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="si-password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-9 pr-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full font-bold text-sm" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In"}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="su-name" className="text-xs font-semibold">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="su-name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="su-phone" className="text-xs font-semibold">Mobile Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="su-phone"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  pattern="01[0-9]{9}"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="su-address" className="text-xs font-semibold">Delivery Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="su-address"
                  placeholder="House, road, area details"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="su-password" className="text-xs font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="su-password"
                  type={showRegPass ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="pl-9 pr-10 text-sm"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPass((v) => !v)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  aria-label={showRegPass ? "Hide password" : "Show password"}
                >
                  {showRegPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-bold gap-2" disabled={isSubmitting}>
              Create Account
              <ArrowRight className="size-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}