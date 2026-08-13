"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Lock, Mail, ArrowRight, ShoppingBag, Phone, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CustomerLoginPage() {
  const router = useRouter();
  const {
    user,
    loginCustomer,
    loginWithGoogle,
    pendingGoogleSession,
    verifyAndLinkPhone,
    cancelPendingGoogle,
  } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [linkPhoneInput, setLinkPhoneInput] = useState("");
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

  const handleSimulateGoogleLogin = () => {
    // Simulates Google Login for a customer already linked with googleId "google-1001" (Nusrat Jahan)
    const res = loginWithGoogle({
      googleId: "google-1001",
      googleEmail: "nusrat@arzamart.com",
      fullName: "Nusrat Jahan",
      profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    });
    if (res.success) {
      router.push("/account");
    }
  };

  const handlePhoneLinkingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = verifyAndLinkPhone(linkPhoneInput);
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

        {/* Primary Option: Google Login */}
        <div className="space-y-3 pt-2">
          <Button
            type="button"
            onClick={handleSimulateGoogleLogin}
            className="w-full h-12 text-sm font-bold bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 gap-3 shadow-sm cursor-pointer dark:bg-slate-900 dark:text-white dark:border-slate-700"
          >
            <svg className="size-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google (Linked Account)
          </Button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or sign in with password</span>
          </div>
        </div>

        {/* Fallback Form */}
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
            Sign In with Password
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-border">
          <Link href="/admin/login" className="text-xs text-muted-foreground hover:text-foreground underline">
            Are you a staff member? Admin Portal Login →
          </Link>
        </div>
      </div>

      {/* Case B: Phone Link Prompt Modal for First Time Google Login */}
      <Dialog open={!!pendingGoogleSession} onOpenChange={(open) => !open && cancelPendingGoogle()}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Phone className="size-6" />
            </div>
            <DialogTitle className="text-left font-bold text-lg">
              Verify Account Ownership
            </DialogTitle>
            <DialogDescription className="text-left text-xs leading-relaxed">
              Google Login is used to secure your account. Please enter the mobile number you used when placing your orders.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePhoneLinkingSubmit} className="space-y-4 mt-2">
            {pendingGoogleSession && (
              <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center gap-3">
                <img
                  src={pendingGoogleSession.profileImage || "/placeholder.png"}
                  alt={pendingGoogleSession.fullName}
                  className="size-10 rounded-full object-cover border"
                />
                <div>
                  <p className="text-xs font-bold text-foreground">{pendingGoogleSession.fullName}</p>
                  <p className="text-[11px] text-muted-foreground">{pendingGoogleSession.googleEmail}</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="linkPhone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mobile Number
              </Label>
              <Input
                id="linkPhone"
                type="tel"
                placeholder="+8801700000000"
                value={linkPhoneInput}
                onChange={(e) => setLinkPhoneInput(e.target.value)}
                className="h-11 text-base font-mono"
                required
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                This will instantly link your previous orders to your Google account permanently.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={cancelPendingGoogle} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 font-bold gap-1">
                Verify & Link Account
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
