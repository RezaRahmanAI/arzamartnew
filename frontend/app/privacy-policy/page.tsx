"use client";

import Link from "next/link";
import { useSettings } from "@/context/settings-context";
import { DEFAULT_SYSTEM_SETTINGS } from "@/types/settings";
import { ShieldCheck, Lock, Eye, FileText } from "lucide-react";

export default function PrivacyPolicyPage() {
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
          <span className="text-foreground font-semibold">Privacy Policy</span>
        </nav>

        {/* Header */}
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <Lock className="size-3.5" /> Data Security & Protection
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-muted-foreground">
            Last Updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6 text-sm text-foreground/80 leading-relaxed shadow-sm">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4.5 text-primary" /> 1. Overview & Commitment
            </h2>
            <p>
              At <strong>{brandName}</strong> (operated by {business.businessName || `${brandName} Ltd.`}), we respect and protect the privacy of our customers. This Privacy Policy outlines how your personal information is collected, used, and safeguarded when you visit or make a purchase from our website.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Eye className="size-4.5 text-primary" /> 2. Information We Collect
            </h2>
            <p>
              When you browse our shop or place an order, we collect specific details necessary to fulfill your request:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li><strong>Customer Information:</strong> Full name, shipping address, mobile phone number, and optional email address.</li>
              <li><strong>Order Details:</strong> Items selected, sizes, quantities, and chosen payment method (Cash on Delivery / Online Gateways).</li>
              <li><strong>Device & Usage Data:</strong> IP address, browser type, and interaction metrics to enhance website security and performance.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="size-4.5 text-primary" /> 3. How We Use Your Information
            </h2>
            <p>We use your collected personal information strictly to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li>Process, pack, and deliver your parcels via verified courier partners.</li>
              <li>Send SMS / phone call confirmations regarding order status and delivery updates.</li>
              <li>Provide responsive customer support and resolve exchanges or returns.</li>
              <li>Prevent unauthorized transactions and maintain platform security.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">4. Data Sharing & Third Parties</h2>
            <p>
              We do <strong>NOT</strong> sell, trade, or rent your personal data to third parties. We only share necessary delivery details (name, phone, address) with our contracted courier partners (e.g. Steadfast, Pathao, RedX) solely for the purpose of shipping your parcel to your doorstep.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">5. Contact Information</h2>
            <p>
              If you have any questions or concerns regarding our privacy practices, please contact our privacy officer at:
            </p>
            <div className="bg-secondary/30 p-4 rounded-xl border border-border space-y-1 text-xs font-medium">
              <p><strong>Entity:</strong> {business.businessName || `${brandName} Bangladesh`}</p>
              <p><strong>Email:</strong> {contact.emailAddress || "privacy@arzamart.com"}</p>
              <p><strong>Hotline:</strong> {contact.supportPhone || "+880 1800 000000"}</p>
              <p><strong>Office:</strong> {contact.officeAddress || "Dhaka, Bangladesh"}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}