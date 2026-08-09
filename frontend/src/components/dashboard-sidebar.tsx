"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartBar as BarChart3, Boxes, ClipboardX, Hop as Home, Image, Link as LinkIcon, MessageSquare, CirclePlus as PlusCircle, ShoppingBag, Users, FolderOpen, SlidersHorizontal, PackagePlus, UserCog, Menu, Globe } from "lucide-react";
import { useSettings } from "@/context/settings-context";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Overview", url: "/admin", icon: BarChart3 },
  { title: "Hero Banners", url: "/admin/banners", icon: Image },
  { title: "Orders", url: "/admin/orders", icon: ShoppingBag },
  { title: "Incomplete Orders", url: "/admin/incomplete", icon: ClipboardX },
  { title: "Manual Order", url: "/admin/manual-order", icon: PlusCircle },
  { title: "Create Pre-order", url: "/admin/pre-order", icon: PackagePlus },
  { title: "Products", url: "/admin/products", icon: Boxes },
  { title: "Categories", url: "/admin/categories", icon: FolderOpen },
  { title: "Header Navigation", url: "/admin/menu", icon: Menu },
  { title: "Reviews", url: "/admin/reviews", icon: MessageSquare },
  { title: "Customers", url: "/admin/customers", icon: Users },
  { title: "Staff", url: "/admin/staff", icon: UserCog },
  { title: "Landing Pages", url: "/admin/landing-pages", icon: Globe },
  { title: "Shareable Links", url: "/admin/links", icon: LinkIcon },
  { title: "Settings", url: "/admin/settings", icon: SlidersHorizontal },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();
  const { settings } = useSettings();
  const brandName = settings?.general?.websiteShortName || settings?.general?.websiteName || "Arza";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-4">
        <span className="font-display text-lg font-extrabold tracking-tight">{brandName} Admin</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Store</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                <span>Back to store</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}