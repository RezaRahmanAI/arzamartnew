"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  ChartBar as BarChart3,
  Boxes,
  ClipboardX,
  Hop as Home,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquare,
  CirclePlus as PlusCircle,
  ShoppingBag,
  Users,
  FolderOpen,
  Layers,
  SlidersHorizontal,
  PackagePlus,
  UserCog,
  Menu,
  Globe,
  Truck,
  PackageCheck,
  ChevronRight,
} from "lucide-react";
import { useSettings } from "@/context/settings-context";
import { useOrders } from "@/lib/orders";
import { cn } from "@/lib/utils";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

interface SubNavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  title: string;
  icon: React.ElementType;
  items: SubNavItem[];
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { settings } = useSettings();
  const brandName = settings?.general?.websiteShortName || settings?.general?.websiteName || "Arza";

  let pendingOrdersCount = 0;
  let incompleteOrdersCount = 0;
  try {
    const ordersContext = useOrders();
    if (ordersContext?.orders) {
      pendingOrdersCount = ordersContext.orders.filter((o) => o.status === "pending").length;
    }
    if (ordersContext?.incomplete) {
      incompleteOrdersCount = ordersContext.incomplete.length;
    }
  } catch {
    /* Safe fallback if used outside OrdersProvider */
  }

  const navGroups: NavGroup[] = [
    {
      title: "Orders",
      icon: ShoppingBag,
      items: [
        { title: "All Orders", url: "/admin/orders", icon: ShoppingBag, badge: pendingOrdersCount },
        { title: "Website Orders", url: "/admin/orders?type=website", icon: Globe },
        { title: "Manual Orders", url: "/admin/manual-order", icon: PlusCircle },
        { title: "Pre-Orders", url: "/admin/pre-order", icon: PackagePlus },
        { title: "Bulk Shipment", url: "/admin/bulk-shipment", icon: PackageCheck },
        { title: "Couriers", url: "/admin/couriers", icon: Truck },
        { title: "Incomplete Orders", url: "/admin/incomplete", icon: ClipboardX, badge: incompleteOrdersCount },
      ],
    },
    {
      title: "Products",
      icon: Boxes,
      items: [
        { title: "All Products", url: "/admin/products", icon: Boxes },
        { title: "Categories", url: "/admin/categories", icon: FolderOpen },
        { title: "Sub-Categories", url: "/admin/sub-categories", icon: Layers },
      ],
    },
    {
      title: "Storefront & Web",
      icon: Globe,
      items: [
        { title: "Landing Pages", url: "/admin/landing-pages", icon: Globe },
        { title: "Hero Banners", url: "/admin/banners", icon: ImageIcon },
        { title: "Header Navigation", url: "/admin/menu", icon: Menu },
        { title: "Shareable Links", url: "/admin/links", icon: LinkIcon },
        { title: "Customer Reviews", url: "/admin/reviews", icon: MessageSquare },
      ],
    },
    {
      title: "Users & Staff",
      icon: Users,
      items: [
        { title: "Customers", url: "/admin/customers", icon: Users },
        { title: "Staff Management", url: "/admin/staff", icon: UserCog },
      ],
    },
  ];

  const searchParams = useSearchParams();

  const isSubActive = useCallback(
    (url: string) => {
      if (url === "/admin") return pathname === "/admin";
      if (url.includes("?")) {
        const [targetPath, targetQuery] = url.split("?");
        const currentType = searchParams.get("type");
        const targetType = new URLSearchParams(targetQuery).get("type");
        return pathname === targetPath && currentType === targetType;
      }
      if (url === "/admin/orders" && searchParams.get("type")) {
        return false;
      }
      return pathname === url || pathname.startsWith(url + "/");
    },
    [pathname, searchParams]
  );

  const isGroupActive = useCallback(
    (items: SubNavItem[]) => {
      return items.some((item) => isSubActive(item.url));
    },
    [isSubActive]
  );

  // Open state for each group
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      Orders: true,
      Products: true,
      "Storefront & Web": false,
      "Users & Staff": false,
    };
    return initial;
  });

  // Automatically keep current section open when navigating
  useEffect(() => {
    navGroups.forEach((group) => {
      if (isGroupActive(group.items)) {
        setOpenGroups((prev) => ({ ...prev, [group.title]: true }));
      }
    });
  }, [pathname, isGroupActive]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-extrabold text-sm shadow-xs">
            {brandName.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col overflow-hidden leading-none">
            <span className="font-display text-sm font-bold tracking-tight truncate">{brandName} Admin</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Control Center</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/70">
            Store Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* 1. Overview */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/admin"} tooltip="Overview">
                  <Link href="/admin" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* 2. Collapsible Groups: Orders, Products, Storefront, Users */}
              {navGroups.map((group) => {
                const groupActive = isGroupActive(group.items);
                const isOpen = openGroups[group.title] ?? false;

                return (
                  <Collapsible
                    key={group.title}
                    open={isOpen}
                    onOpenChange={() => toggleGroup(group.title)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={group.title}
                          className={cn(
                            "w-full justify-between font-medium transition-colors",
                            groupActive && "text-primary font-semibold"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <group.icon className={cn("h-4 w-4", groupActive && "text-primary")} />
                            <span>{group.title}</span>
                          </div>
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground",
                              isOpen && "rotate-90"
                            )}
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {group.items.map((sub) => {
                            const active = isSubActive(sub.url);
                            return (
                              <SidebarMenuSubItem key={sub.title}>
                                <SidebarMenuSubButton asChild isActive={active}>
                                  <Link href={sub.url} className="flex items-center justify-between w-full gap-2">
                                    <div className="flex items-center gap-2 truncate">
                                      <sub.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                      <span className="truncate">{sub.title}</span>
                                    </div>
                                    {sub.badge != null && sub.badge > 0 && (
                                      <span className="ml-auto px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-primary/15 text-primary border border-primary/20">
                                        {sub.badge}
                                      </span>
                                    )}
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}

              {/* 3. Settings */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/admin/settings"} tooltip="Settings">
                  <Link href="/admin/settings" className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to store">
              <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
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