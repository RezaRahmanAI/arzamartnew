"use client";

import Link from "next/link";
import { useSettings } from "@/context/settings-context";
import { DEFAULT_SYSTEM_SETTINGS } from "@/types/settings";
import { Scale, Truck, RotateCcw, CreditCard, ShieldCheck } from "lucide-react";

export default function TermsPage() {
  const { settings } = useSettings();
  const general = settings?.general || DEFAULT_SYSTEM_SETTINGS.general;
  const contact = settings?.contact || DEFAULT_SYSTEM_SETTINGS.contact;
  const business = settings?.business || DEFAULT_SYSTEM_SETTINGS.business;
  const brandName = general.websiteName || "ARZAMART";

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <nav className="flex text-xs text-muted-foreground gap-2">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Terms & Conditions</span>
        </nav>

        {/* Header */}
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <Scale className="size-3.5" /> Service Agreement & Policies
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-xs text-muted-foreground">
            Effective Date: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 text-sm text-foreground/80 leading-relaxed shadow-sm">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4.5 text-primary" /> 1. Agreement to Terms
            </h2>
            <p>
              By accessing or purchasing from <strong>{brandName}</strong> (operated by {business.businessName || `${brandName} Ltd.`}), you agree to be bound by these Terms and Conditions. Please review them carefully before placing an order.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <CreditCard className="size-4.5 text-primary" /> 2. Pricing & Payments
            </h2>
            <p>
              All prices listed on the website are in Bangladeshi Taka (BDT ৳). We reserve the right to modify prices or discontinue items at any time without prior notice.
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li><strong>Cash on Delivery (COD):</strong> Customers can pay directly to the courier agent upon receiving the package.</li>
              <li><strong>Online Gateways / Mobile Banking:</strong> bKash, Nagad, or credit/debit card transactions are processed securely through certified gateway partners.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Truck className="size-4.5 text-primary" /> 3. Shipping & Delivery Terms
            </h2>
            <p>
              We ship parcels across all districts in Bangladesh via verified third-party courier services. Standard estimated delivery timelines:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li><strong>Inside Dhaka:</strong> 1 to 3 business days.</li>
              <li><strong>Outside Dhaka:</strong> 2 to 5 business days.</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Please note that unforeseen weather disturbances, courier bottlenecks, or public holidays may cause minor delivery delays.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <RotateCcw className="size-4.5 text-primary" /> 4. Exchange & Return Policy
            </h2>
            <p>
              We want you to be 100% satisfied with your purchase. If there is a sizing issue or defect:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li>You must notify our customer support team within <strong>7 days</strong> of receiving your parcel.</li>
              <li>Items must be unworn, unwashed, and in original packaging with tags intact.</li>
              <li>For defective or wrong products received, exchange shipping costs are fully covered by {brandName}.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">5. Customer Support & Assistance</h2>
            <p>
              For any clarification regarding your order or these terms, please contact our support desk:
            </p>
            <div className="bg-secondary/30 p-4 rounded-xl border border-border space-y-1 text-xs font-medium">
              <p><strong>Hotline:</strong> {contact.supportPhone || "+880 1800 000000"}</p>
              <p><strong>Email:</strong> {contact.supportEmail || "support@arzamart.com"}</p>
              <p><strong>Address:</strong> {contact.officeAddress || "Dhaka, Bangladesh"}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}