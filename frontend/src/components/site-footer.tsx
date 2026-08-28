"use client";

import Link from "next/link";
import { Facebook, Instagram, Phone, Mail, MapPin } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCategories } from "@/lib/categories-store";
import { useSettings } from "@/context/settings-context";
import { DEFAULT_SYSTEM_SETTINGS } from "@/types/settings";
import { getImageUrl } from "@/lib/utils";

export function SiteFooter() {
  const pathname = usePathname();
  const { categories } = useCategories();
  const { settings } = useSettings();

  if (pathname.startsWith("/admin") || pathname.startsWith("/clp")) {
    return null;
  }

  const safeSettings = settings || DEFAULT_SYSTEM_SETTINGS;
  const general = safeSettings.general || DEFAULT_SYSTEM_SETTINGS.general;
  const contact = safeSettings.contact || DEFAULT_SYSTEM_SETTINGS.contact;
  const footer = safeSettings.footer || DEFAULT_SYSTEM_SETTINGS.footer;
  const socialMedia = safeSettings.socialMedia || DEFAULT_SYSTEM_SETTINGS.socialMedia;

  const activeSocials = socialMedia?.platforms?.filter((p) => p.active) || [];
  const footerLinks = footer?.footerMenuLinks || [];

  return (
    <footer className="mt-20 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          {safeSettings.branding?.footerLogo || safeSettings.branding?.darkLogo ? (
            <img
              src={getImageUrl(safeSettings.branding.footerLogo || safeSettings.branding.darkLogo)}
              alt={general?.websiteName || "ARZA"}
              className="h-10 w-auto max-w-[160px] object-contain mb-3"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "block";
              }}
            />
          ) : null}
          <p
            className="font-display text-2xl font-extrabold uppercase"
            style={{
              display: safeSettings.branding?.footerLogo || safeSettings.branding?.darkLogo ? "none" : "block",
            }}
          >
            {general?.websiteName || "ARZA"}
          </p>
          <p className="mt-3 max-w-xs text-sm text-ink-foreground/70">
            {footer?.footerDescription || general?.description || "Everyday fashion made in Bangladesh."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            {activeSocials.map((soc) => (
              <a
                key={soc.id || soc.platform}
                href={soc.url}
                target="_blank"
                rel="noreferrer"
                aria-label={soc.platform}
                className="grid size-9 place-items-center rounded-full bg-ink-foreground/10 transition-colors hover:bg-primary"
              >
                {soc.platform?.toLowerCase().includes("instagram") ? (
                  <Instagram className="size-4" />
                ) : (
                  <Facebook className="size-4" />
                )}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider">Shop</h4>
          <ul className="mt-4 space-y-2 text-sm text-ink-foreground/70">
            {(categories || []).map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className="transition-colors hover:text-accent"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider">Help & Info</h4>
          <ul className="mt-4 space-y-2 text-sm text-ink-foreground/70">
            {footerLinks.map((link, idx) => (
              <li key={idx}>
                <Link href={link.url} className="transition-colors hover:text-accent">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>Delivery: 1–3 days inside Dhaka</li>
            <li>7-day easy exchange</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider">Contact Us</h4>
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-foreground/70">
            <Phone className="size-4 text-primary shrink-0" /> {contact?.supportPhone || "+880 1800 000000"}
          </p>
          <p className="mt-2 flex items-start gap-2 text-sm text-ink-foreground/70">
            <MapPin className="size-4 text-primary shrink-0 mt-0.5" /> {contact?.officeAddress || "Dhaka, Bangladesh"}
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-foreground/70">
            <Mail className="size-4 text-primary shrink-0" /> {contact?.emailAddress || "hello@arza.example"}
          </p>
        </div>
      </div>
      <div className="border-t border-ink-foreground/10 py-5 text-center text-xs text-ink-foreground/50">
        {footer?.copyrightText || (general?.websiteName ? `© ${new Date().getFullYear()} ${general.websiteName}. All rights reserved.` : `© ${new Date().getFullYear()}. All rights reserved.`)}
      </div>
    </footer>
  );
}