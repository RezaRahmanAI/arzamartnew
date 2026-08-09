"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { User, Mail, Phone, Lock, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CustomerSignupPage() {
  const router = useRouter();
  const { registerCustomer, user } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    address: "",
  });

  if (user && user.role === "customer") {
    router.push("/account");
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = registerCustomer(form);
    if (success) {
      router.push("/account");
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Create an Account</h1>
          <p className="text-xs text-muted-foreground">Join ARZAMART for fast checkout and reward points.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="Nusrat Jahan"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="pl-9 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="nusrat@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="pl-9 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-semibold">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="phone"
                placeholder="+880 1700-000000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                type="password"
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="pl-9 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-semibold">Delivery Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="address"
                placeholder="Dhanmondi, Dhaka 1205"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="pl-9 text-sm"
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-sm font-bold gap-2 mt-2">
            Create Account
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
