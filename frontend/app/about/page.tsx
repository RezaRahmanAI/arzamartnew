"use client";

import Link from "next/link";
import { useSettings } from "@/context/settings-context";
import { DEFAULT_SYSTEM_SETTINGS } from "@/types/settings";
import { Sparkles, ShieldCheck, HeartHandshake, Truck, Award, Users } from "lucide-react";

export default function AboutPage() {
  const { settings } = useSettings();
  const general = settings?.general || DEFAULT_SYSTEM_SETTINGS.general;
  const business = settings?.business || DEFAULT_SYSTEM_SETTINGS.business;
  const brandName = general.websiteName || "ARZAMART";

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Breadcrumb */}
        <nav className="flex text-xs text-muted-foreground gap-2">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">About Us</span>
        </nav>

        {/* Hero Section */}
        <div className="text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="size-3.5" /> Our Story & Mission
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            About {brandName}
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {general.description || "Everyday premium fashion made in Bangladesh. Cash on delivery nationwide."}
          </p>
        </div>

        {/* Main Content Card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Award className="size-5 text-primary" /> Who We Are
          </h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Welcome to <strong>{brandName}</strong> (operated by {business.businessName || `${brandName} Ltd.`}). We are dedicated to providing the finest everyday lifestyle and fashion products with uncompromising quality, affordable pricing, and fast doorstep delivery across all 64 districts in Bangladesh.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            From classic cotton tees, shirts, and traditional panjabis to seasonal trendy collections, our aim is to celebrate modern comfort and elegance in every thread.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 text-center space-y-2.5 shadow-xs">
            <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="size-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">100% Genuine Quality</h3>
            <p className="text-xs text-muted-foreground">Every fabric and product is thoroughly inspected to ensure long-lasting comfort and durability.</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 text-center space-y-2.5 shadow-xs">
            <div className="size-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
              <Truck className="size-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Fast Nationwide Delivery</h3>
            <p className="text-xs text-muted-foreground">Reliable cash-on-delivery service in Dhaka and all remote sub-districts across Bangladesh.</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 text-center space-y-2.5 shadow-xs">
            <div className="size-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
              <HeartHandshake className="size-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Easy Exchange Policy</h3>
            <p className="text-xs text-muted-foreground">Customer satisfaction comes first with our hassle-free size replacement and support.</p>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="bg-muted/40 border border-border rounded-2xl p-6 text-center space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center justify-center gap-2">
            <Users className="size-4.5 text-primary" /> Have questions or want to collaborate?
          </h3>
          <p className="text-xs text-muted-foreground">Our support team is always eager to assist you with your orders and inquiries.</p>
          <div className="pt-2">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-transform active:scale-95"
            >
              Contact Support Team
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}