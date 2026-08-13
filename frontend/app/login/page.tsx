"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { DEFAULT_CITIES, getAreasForCity } from "@/lib/location-data";
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
  const [city, setCity] = useState("Dhaka");
  const [area, setArea] = useState(() => getAreasForCity("Dhaka")[0] || "");

  if (user && user.role === "customer") {
    router.push("/account");
  }

  const availableAreas = getAreasForCity(city);

  const handleCityChange = (nextCity: string) => {
    setCity(nextCity);
    const areas = getAreasForCity(nextCity);
    setArea(areas[0] || "");
  };

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
    const success = await registerCustomer({
      name: name.trim(),
      email: "",
      phone: phone.trim(),
      password: regPassword,
      address: address.trim() || `${area}, ${city}`,
      area,
      district: city,
    });
    setIsSubmitting(false);
    if (success) {
      router.push("/account");
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            <ShoppingBag className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Customer Portal" : "Create an Account"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "signin"
              ? "Order without logging in, or verify your account below."
              : "Join for fast checkout and reward points."}
          </p>
        </div>

        {/* Sign In / Sign Up toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`rounded-lg py-2 text-sm font-bold transition-colors ${
              mode === "signin"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`rounded-lg py-2 text-sm font-bold transition-colors ${
              mode === "signup"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier" className="text-xs font-semibold">Email or Mobile Number</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="identifier"
                  type="text"
                  placeholder="+8801700000000 or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-9 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-bold gap-2" disabled={isSubmitting}>
              Sign In
              <ArrowRight className="size-4" />
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
                  placeholder="Nusrat Jahan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="su-phone" className="text-xs font-semibold">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="su-phone"
                  type="tel"
                  placeholder="+880 1700-000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9 text-sm"
                  required
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="su-city" className="text-xs font-semibold">City</Label>
                <select
                  id="su-city"
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {DEFAULT_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="su-area" className="text-xs font-semibold">Area (Thana / Upazila)</Label>
                <select
                  id="su-area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {availableAreas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
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