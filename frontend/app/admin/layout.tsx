"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context";
import { LogOut, ShieldCheck } from "lucide-react";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/admin": {
    title: "Store Overview",
    subtitle: "A snapshot of how Arza is performing this fortnight",
  },
  "/admin/banners": {
    title: "Hero Banners",
    subtitle: "Manage homepage hero slides, images, call-to-actions & display order",
  },
  "/admin/orders": {
    title: "Orders",
    subtitle: "Manage customer orders, status & payments",
  },
  "/admin/incomplete": {
    title: "Incomplete Orders",
    subtitle: "Checkout attempts where customer entered details but did not complete order",
  },
  "/admin/manual-order": {
    title: "Create Manual Order (POS)",
    subtitle: "Select items from catalog, customize sizes/prices, enter customer details and submit",
  },
  "/admin/pre-order": {
    title: "Create Pre-order",
    subtitle: "Accept advance orders for upcoming stock",
  },
  "/admin/products": {
    title: "Products",
    subtitle: "Manage products, size prices & stock",
  },
  "/admin/categories": {
    title: "Categories",
    subtitle: "Manage store categories & banners",
  },
  "/admin/menu": {
    title: "Header Navigation Menu",
    subtitle: "Customize store navigation links, order, targets & custom menu items",
  },
  "/admin/reviews": {
    title: "Customer Reviews",
    subtitle: "Manage customer feedback & ratings",
  },
  "/admin/customers": {
    title: "Customers",
    subtitle: "Customer list, order history & contact info",
  },
  "/admin/links": {
    title: "Shareable Links",
    subtitle: "Direct checkout links for social marketing",
  },
  "/admin/settings": {
    title: "System Settings",
    subtitle: "Centralized website configurations, branding, shipping, SEO & business rules",
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoading && !isLoginPage) {
      if (!user || (user.role !== "admin" && user.role !== "staff")) {
        router.push("/admin/login");
      }
    }
  }, [user, isLoading, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading || (!user && !isLoginPage)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 text-sm">
        <ShieldCheck className="size-8 text-amber-500 animate-pulse mb-2" />
        Authenticating staff access...
      </div>
    );
  }

  if (pathname === "/admin/landing-page-design") {
    return <div className="h-screen w-screen overflow-hidden bg-background">{children}</div>;
  }

  const currentMeta = PAGE_META[pathname] || {
    title: "Dashboard",
    subtitle: "Store administration panel",
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-16 items-center gap-3 border-b border-border bg-background px-4">
            <SidebarTrigger />
            <div className="flex flex-col justify-center">
              <h1 className="font-display text-base font-extrabold tracking-tight text-foreground leading-tight">
                {currentMeta.title}
              </h1>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">
                {currentMeta.subtitle}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/80 border border-border/60">
                <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  {user?.name?.[0]?.toUpperCase() || "S"}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold leading-none text-foreground">{user?.name}</div>
                  <div className="text-[10px] text-muted-foreground leading-none mt-0.5 capitalize">{user?.staffRole || user?.role}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/admin/login");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive transition-colors cursor-pointer"
                title="Logout Staff"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
