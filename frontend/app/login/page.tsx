"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Lock, Mail, ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CustomerLoginPage() {
  const router = useRouter();
  const { user, loginCustomer } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user && user.role === "customer") {
    router.push("/account");
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await loginCustomer(identifier, password);
    setIsSubmitting(false);
    if (success) {
      router.push("/account");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-2">
            <ShoppingBag className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Portal</h1>
          <p className="text-xs text-muted-foreground">
            Order without logging in, or verify your account below.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 text-sm"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-sm font-bold gap-2" disabled={isSubmitting}>
            Sign In
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-border">
          <Link href="/admin/login" className="text-xs text-muted-foreground hover:text-foreground underline">
            Are you a staff member? Admin Portal Login →
          </Link>
        </div>
      </div>
    </div>
  );
}