"use client";

import Link from "next/link";
import { useState } from "react";
import { useSettings } from "@/context/settings-context";
import { DEFAULT_SYSTEM_SETTINGS } from "@/types/settings";
import { Phone, Mail, MapPin, Send, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ContactPage() {
  const { settings } = useSettings();
  const contact = settings?.contact || DEFAULT_SYSTEM_SETTINGS.contact;
  const general = settings?.general || DEFAULT_SYSTEM_SETTINGS.general;
  const brandName = general.websiteName || "ARZAMART";

  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      toast.error("Please fill in your name, phone number, and message.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.isSuccess) {
        throw new Error(data.error || "Failed to send message. Please try again.");
      }

      setSubmitted(true);
      toast.success("Message received!", {
        description: data.message || "Thank you for reaching out. Our support team will contact you shortly.",
      });
      setForm({ name: "", phone: "", email: "", subject: "", message: "" });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error("Submission failed", {
        description: errorMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Breadcrumb */}
        <nav className="flex text-xs text-muted-foreground gap-2">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Contact Us</span>
        </nav>

        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
            <MessageSquare className="size-3.5" /> 24/7 Customer Support
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Get in Touch with {brandName}
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Need help with your order, sizing, or tracking? Reach out to us via phone, WhatsApp, or send us a quick message below.
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-xs">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Phone className="size-4.5" />
            </div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone & WhatsApp</h3>
            <p className="text-sm font-bold text-foreground">{contact.supportPhone || "+880 1800 000000"}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-xs">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Mail className="size-4.5" />
            </div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</h3>
            <p className="text-sm font-bold text-foreground break-all">{contact.supportEmail || "support@arzamart.com"}</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-2 shadow-xs">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <MapPin className="size-4.5" />
            </div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Office Address</h3>
            <p className="text-xs font-semibold text-foreground leading-relaxed">
              {contact.officeAddress || "House #12, Road #4, Dhanmondi, Dhaka-1205, Bangladesh"}
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-border/60 pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Send className="size-4.5 text-primary" /> Send us a Message
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Fill out the form below and we will reply within 2-4 hours.</p>
          </div>

          {submitted ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center space-y-3">
              <CheckCircle2 className="size-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-foreground">Thank You for Contacting Us!</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Your message has been safely submitted. Our team will review your inquiry and get back to you shortly.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-2 text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Your name"
                    className="w-full h-10 px-3.5 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    className="w-full h-10 px-3.5 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Email (Optional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full h-10 px-3.5 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Subject / Order ID</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="e.g. Order Tracking #ORD-1002"
                    className="w-full h-10 px-3.5 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Your Message *</label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Type your question or query here..."
                  className="w-full p-3.5 bg-background border border-border rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="size-3.5" />
                {submitting ? "Sending..." : "Submit Message"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}