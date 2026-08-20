import type { Metadata } from "next";
import "@/styles.css";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FloatingActions } from "@/components/floating-actions";
import { Toaster } from "@/components/ui/sonner";
import { ScrollToTop } from "@/components/scroll-to-top";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "700"],
  preload: true,
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "700"],
  preload: true,
});

export const metadata: Metadata = {
  title: "Arza — Everyday Fashion in Bangladesh",
  description:
    "Arza sells cotton tees, linen shirts, panjabi, hoodies and chinos with cash on delivery across Bangladesh.",
  authors: [{ name: "Arza" }],
  openGraph: {
    title: "Arza — Everyday Fashion in Bangladesh",
    description: "Cotton tees, linen shirts, panjabi and more. Cash on delivery nationwide.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <FloatingActions />
          <Toaster />
          <ScrollToTop />
        </Providers>
      </body>
    </html>
  );
}
