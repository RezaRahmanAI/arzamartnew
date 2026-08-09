"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { ShieldCheck, Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const router = useRouter();
  const { loginAdmin, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Safely handle redirection after component render
  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "staff")) {
      router.push("/admin");
    }
  }, [user, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const success = loginAdmin(email, password);
    setIsSubmitting(false);

    if (success) {
      router.push("/admin");
    }
  };

  const autofillStaff = (staffEmail: string, staffPass: string) => {
    setEmail(staffEmail);
    setPassword(staffPass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">ARZAMART Staff Portal</h1>
          <p className="text-xs text-slate-400">Secure access for store administrators & staff members.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-300">Staff Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 size-4 text-slate-500" />
              <Input
                id="email"
                type="email"
                placeholder="admin@arza.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 text-sm bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-300">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-slate-500" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 text-sm bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-amber-500"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-sm font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 gap-2 cursor-pointer" disabled={isSubmitting}>
            {isSubmitting ? "Authenticating..." : "Access Admin Dashboard"}
            <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="space-y-2 pt-2 border-t border-slate-800">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 text-center">
            Demo Admin & Staff Credentials (Click to Autofill):
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => autofillStaff("admin@arza.com", "Admin@123456")}
              className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition-all cursor-pointer"
            >
              <div className="font-bold text-amber-400">Super Admin</div>
              <div className="text-[10px] text-slate-400 truncate">admin@arza.com</div>
              <div className="text-[10px] text-slate-500 font-mono">pass: Admin@123456</div>
            </button>

            <button
              type="button"
              onClick={() => autofillStaff("admin@arzamart.com", "admin123")}
              className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition-all cursor-pointer"
            >
              <div className="font-bold text-amber-400">Arzamart Admin</div>
              <div className="text-[10px] text-slate-400 truncate">admin@arzamart.com</div>
              <div className="text-[10px] text-slate-500 font-mono">pass: admin123</div>
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <Link href="/" className="text-xs text-slate-400 hover:text-white underline">
            ← Return to Main Website
          </Link>
        </div>
      </div>
    </div>
  );
}
