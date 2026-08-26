"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, ShieldCheck, Inbox } from "lucide-react";
import { useOrders } from "@/lib/orders";
import { formatBDT, Order } from "@/lib/dashboard-data";
import { useCustomers } from "@/lib/customers-store";
import { customersService, type ApiCustomer } from "@/lib/api/services/customers.service";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import dynamic from "next/dynamic";

const OrderInvoiceModal = dynamic(
  () => import("@/components/admin/order-invoice-modal").then((m) => m.OrderInvoiceModal),
  { ssr: false }
);

interface CustomerHistoryProps {
  params: Promise<{ phone: string }>;
}


export default function CustomerHistoryPage({ params }: CustomerHistoryProps) {
  const { phone: encodedPhone } = use(params);
  const phone = decodeURIComponent(encodedPhone);
  
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);

  const { orders } = useOrders();
  const { findCustomerByPhone } = useCustomers();
  const [apiCustomers, setApiCustomers] = useState<ApiCustomer[]>([]);
  const [customerActivity, setCustomerActivity] = useState<{
    cart: Array<{ slug: string; name?: string; size: string; qty: number; price?: number }>;
    wishlist: string[];
  }>({ cart: [], wishlist: [] });

  useEffect(() => {
    customersService.getAll().then(setApiCustomers);

    // Load customer activity (cart / wishlist)
    import("@/actions/customers.actions").then(({ getCustomerActivityAction }) => {
      getCustomerActivityAction(phone).then((act) => {
        if (act && (act.cart?.length > 0 || act.wishlist?.length > 0)) {
          setCustomerActivity(act);
        } else {
          // Fallback to local storage
          try {
            const localCart = window.localStorage.getItem(`customer_cart_${phone}`);
            const localWishlist = window.localStorage.getItem(`customer_wishlist_${phone}`);
            setCustomerActivity({
              cart: localCart ? JSON.parse(localCart) : [],
              wishlist: localWishlist ? JSON.parse(localWishlist) : [],
            });
          } catch {
            /* ignore */
          }
        }
      });
    });
  }, [phone]);

  // Find customer record from backend API or local master store
  const customerInfo = useMemo(() => {
    const fromApi = apiCustomers.find((c) => c.phone === phone);
    if (fromApi) {
      return { name: fromApi.fullName, email: fromApi.email, address: fromApi.defaultAddress || "", district: fromApi.district };
    }
    const local = findCustomerByPhone(phone);
    if (local) {
      return { name: local.fullName, email: local.email || "", address: local.address, district: local.district || local.area || "" };
    }
    return null;
  }, [apiCustomers, findCustomerByPhone, phone]);

  // Filter orders matching this customer's phone
  const customerOrders = useMemo(() => {
    return orders.filter((o) => o.phone === phone).sort((a, b) => {
      // Sort by newest first based on ID or date (simple sort by ID descending for mock)
      return b.id.localeCompare(a.id);
    });
  }, [orders, phone]);
  
  // Customer name from customer record or orders
  const name = customerInfo?.name || (customerOrders.length > 0 ? customerOrders[0].customer : "Unknown Customer");

  // Calculate statistics
  const stats = useMemo(() => {
    let total = 0;
    let delivered = 0;
    let cancelled = 0;
    let totalAmount = 0;
    
    // Status mapping
    const summaryByStatus: Record<string, { count: number; amount: number; paid: number; due: number }> = {};
    
    customerOrders.forEach(order => {
      total++;
      totalAmount += order.total;
      
      if (order.status === "delivered") delivered++;
      if (order.status === "cancelled" || (order.status as string) === "return") cancelled++;
      
      if (!summaryByStatus[order.status]) {
        summaryByStatus[order.status] = { count: 0, amount: 0, paid: 0, due: 0 };
      }
      
      summaryByStatus[order.status].count++;
      summaryByStatus[order.status].amount += order.total;
      
      // Mock logic: delivered orders are paid, otherwise due (unless cancelled)
      if (order.status === "delivered") {
        summaryByStatus[order.status].paid += order.total;
      } else if (order.status !== "cancelled" && (order.status as string) !== "refund") {
        summaryByStatus[order.status].due += order.total;
      }
    });

    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    
    // Convert object to array for table rendering
    const summaryArray = Object.entries(summaryByStatus).map(([status, data]) => ({
      status,
      ...data
    }));

    return {
      total,
      delivered,
      cancelled,
      totalAmount,
      totalPaid: summaryArray.reduce((sum, item) => sum + item.paid, 0),
      totalDue: summaryArray.reduce((sum, item) => sum + item.due, 0),
      successRate,
      summaryArray
    };
  }, [customerOrders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/customers" className="p-2 -ml-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Customer Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information & Summary Card */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <h3 className="text-xl font-bold text-foreground mb-4">Customer Information</h3>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-base font-semibold mb-3 gap-2">
            <div>
              <span className="text-muted-foreground font-normal">Name:</span>
              <span className="ml-1.5 font-bold text-foreground">{name}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-normal">Phone:</span>
              <span className="ml-1.5 font-bold text-foreground">{phone}</span>
            </div>
          </div>
          {customerInfo?.address ? (
            <div className="text-sm text-muted-foreground mb-1">
              <span className="font-medium">Address:</span> {customerInfo.address}
              {customerInfo.district ? `, ${customerInfo.district}` : ""}
            </div>
          ) : null}
          {customerInfo?.email ? (
            <div className="text-sm text-muted-foreground mb-1">
              <span className="font-medium">Email:</span> {customerInfo.email}
            </div>
          ) : null}
          
          <div className="flex items-center gap-2 text-sm mb-6">
            <span className="text-muted-foreground font-medium">Reviews:</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600 ml-1">
              <span className="text-base">👍</span> 0
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-red-600 ml-3">
              <span className="text-base">👎</span> 0
            </span>
          </div>

          <h4 className="text-lg font-bold text-foreground mb-3">Summary by Status</h4>
          
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-medium text-xs uppercase">ORDERS</TableHead>
                  <TableHead className="font-medium text-xs uppercase text-center">COUNT</TableHead>
                  <TableHead className="font-medium text-xs uppercase text-right">TOTAL AMOUNT</TableHead>
                  <TableHead className="font-medium text-xs uppercase text-right">TOTAL PAID</TableHead>
                  <TableHead className="font-medium text-xs uppercase text-right">TOTAL DUE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.summaryArray.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No orders recorded for this phone number.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.summaryArray.map((item) => (
                    <TableRow key={item.status} className="capitalize">
                      <TableCell>{item.status}</TableCell>
                      <TableCell className="text-center">{item.count}</TableCell>
                      <TableCell className="text-right">{formatBDT(item.amount)}</TableCell>
                      <TableCell className="text-right">{formatBDT(item.paid)}</TableCell>
                      <TableCell className="text-right">{formatBDT(item.due)}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="bg-muted/30 font-bold hover:bg-muted/30">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{stats.total}</TableCell>
                  <TableCell className="text-right">{formatBDT(stats.totalAmount)}</TableCell>
                  <TableCell className="text-right">{formatBDT(stats.totalPaid)}</TableCell>
                  <TableCell className="text-right">{formatBDT(stats.totalDue)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Analytics Card */}
        <div className="bg-card border border-border p-8 rounded-xl shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
            <h3 className="flex items-center gap-3 text-lg font-bold">
              <Activity className="size-5" />
              Fulfillment Performance
            </h3>
            <span className="text-muted-foreground text-sm font-medium">{phone}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="bg-muted/30 border border-border p-4 rounded-lg text-center">
              <p className="font-bold text-xl">{stats.total}</p>
              <p className="text-muted-foreground text-sm mt-1">Total Requests</p>
            </div>
            <div className="bg-muted/30 border border-border p-4 rounded-lg text-center">
              <p className="font-bold text-xl text-emerald-600">{stats.delivered}</p>
              <p className="text-muted-foreground text-sm mt-1">Delivered</p>
            </div>
            <div className="bg-muted/30 border border-border p-4 rounded-lg text-center">
              <p className="font-bold text-xl text-red-600">{stats.cancelled}</p>
              <p className="text-muted-foreground text-sm mt-1">Revoked</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[160px]">
            <div className="relative size-32">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted"></circle>
                <circle 
                  cx="18" 
                  cy="18" 
                  r="16" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="square" 
                  className="text-primary transition-all duration-1000 ease-in-out" 
                  strokeDasharray={`${stats.successRate}, 100`}
                ></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">{stats.successRate}%</span>
                <span className="text-muted-foreground text-xs mt-1 font-medium">Efficiency</span>
              </div>
            </div>
          </div>

          <div className="mt-8 p-5 bg-muted/20 border border-border rounded-lg text-center">
            <p className="text-muted-foreground text-sm mb-3">Operational Reliability Recommendation</p>
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" />
              <p className="font-bold text-foreground">Verified Secure Entity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Active Cart & Wishlist Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Cart Items */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              🛒 Active Cart ({customerActivity.cart.length})
            </h3>
            <span className="text-xs text-muted-foreground">Realtime in-cart items</span>
          </div>

          {customerActivity.cart.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Cart is currently empty.</p>
          ) : (
            <div className="space-y-3">
              {customerActivity.cart.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-sm">
                  <div className="font-medium text-foreground">
                    <span>{item.name || item.slug}</span>
                    <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      Size: {item.size}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">Qty: {item.qty}</span>
                    {item.price ? <span className="ml-2 text-xs text-muted-foreground">({formatBDT(item.price * item.qty)})</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Wishlist Items */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              ❤️ Saved Wishlist ({customerActivity.wishlist.length})
            </h3>
            <span className="text-xs text-muted-foreground">Interested / bookmarked items</span>
          </div>

          {customerActivity.wishlist.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Wishlist is currently empty.</p>
          ) : (
            <div className="space-y-2">
              {customerActivity.wishlist.map((slug, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border text-sm">
                  <span className="font-medium text-foreground capitalize">{slug.replace(/-/g, " ")}</span>
                  <span className="text-xs text-muted-foreground font-mono">slug: {slug}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders Ledger Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <h3 className="font-bold text-lg">Orders Ledger</h3>
        </div>
        
        {customerOrders.length === 0 ? (
          <div className="py-24 text-center">
            <Inbox className="size-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-muted-foreground font-semibold">Zero Activity Records</h3>
            <p className="text-muted-foreground/60 text-sm mt-2">Historical ledger is currently devoid of transactional nodes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Order No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerOrders.map(order => (
                  <TableRow key={order.id} className="group">
                    <TableCell className="font-medium text-foreground">
                      {order.id}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.date}
                    </TableCell>
                    <TableCell>
                      {(order as { isPreOrder?: boolean }).isPreOrder ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          <span className="size-1.5 rounded-full bg-blue-500"></span>
                          Pre-Order
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          <span className="size-1.5 rounded-full bg-emerald-500"></span>
                          Web-App
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-sm font-medium text-foreground bg-muted px-2.5 py-1 rounded-md border border-border">
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatBDT(order.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => setActiveInvoiceOrder(order)}
                        className="px-2 py-1 shrink-0 rounded-sm bg-cyan-50 border border-cyan-100 text-cyan-600 hover:bg-cyan-600 hover:text-white transition-all inline-flex items-center justify-center text-xs font-bold"
                      >
                        PDF
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <OrderInvoiceModal isOpen={!!activeInvoiceOrder} order={activeInvoiceOrder} onClose={() => setActiveInvoiceOrder(null)} />
    </div>
  );
}
