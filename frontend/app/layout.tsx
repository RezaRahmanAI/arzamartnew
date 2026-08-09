import type { Metadata } from "next";
import "@/styles.css";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FloatingActions } from "@/components/floating-actions";
import { Toaster } from "@/components/ui/sonner";
import { ScrollToTop } from "@/components/scroll-to-top";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400&display=swap"
        />
      </head>
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
