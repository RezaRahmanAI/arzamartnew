"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Printer, ShoppingBag, MapPin, Phone, CreditCard, Calendar, Loader2 } from "lucide-react";
import { useOrders, type Order } from "@/lib/orders";
import { ordersService } from "@/lib/api/services/orders.service";
import { formatBDT } from "@/lib/shop-data";

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderId = (params.orderId as string) || "";
  const { orders } = useOrders();

  const [order, setOrder] = useState<Order | null>(() => {
    return orders.find((o) => o.id === orderId || o.id.toLowerCase() === orderId.toLowerCase()) || null;
  });
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    let isMounted = true;

    async function resolveOrder() {
      // 1. Check in-memory orders
      const memOrder = orders.find((o) => o.id === orderId || o.id.toLowerCase() === orderId.toLowerCase());
      if (memOrder) {
        if (isMounted) {
          setOrder(memOrder);
          setLoading(false);
        }
        return;
      }

      // 2. Check localStorage
      try {
        const raw = window.localStorage.getItem("arza-orders-v1");
        if (raw) {
          const localList: Order[] = JSON.parse(raw);
          const found = localList.find((o) => o.id === orderId || o.id.toLowerCase() === orderId.toLowerCase());
          if (found) {
            if (isMounted) {
              setOrder(found);
              setLoading(false);
            }
            return;
          }
        }
      } catch {}

      // 3. Query API by ID or OrderNumber
      try {
        const remoteOrder = await ordersService.getById(orderId);
        if (remoteOrder && isMounted) {
          setOrder(remoteOrder);
          setLoading(false);
          return;
        }
      } catch {}

      if (isMounted) {
        setLoading(false);
      }
    }

    resolveOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, orders]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <Loader2 className="size-10 text-primary animate-spin mx-auto mb-4" />
        <h2 className="text-lg font-bold text-foreground">অর্ডার তথ্য খোঁজা হচ্ছে...</h2>
        <p className="text-xs text-muted-foreground mt-1">অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Order not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn't find an order with the ID <span className="font-semibold">{orderId}</span>.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          Go back home
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Success banner */}
      <div className="text-center print:hidden">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400">
          <CheckCircle2 className="size-10" />
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold text-foreground">Thank you for your order!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order <span className="font-semibold text-foreground">{order.id}</span> is confirmed and pending verification.
        </p>
      </div>

      {/* Invoice Layout */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-card print:border-none print:bg-transparent print:shadow-none">
        {/* Invoice Header */}
        <div className="bg-muted/30 p-6 border-b border-border">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Invoice</span>
              <h2 className="font-display text-xl font-bold text-foreground">{order.id}</h2>
            </div>
            <div className="text-left sm:text-right text-xs text-muted-foreground space-y-1">
              <p className="flex items-center gap-1.5 sm:justify-end">
                <Calendar className="size-3.5" />
                Date: {order.date}
              </p>
              <p className="flex items-center gap-1.5 sm:justify-end">
                <CreditCard className="size-3.5" />
                Payment: {order.payment}
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid gap-6 p-6 md:grid-cols-2">
          {/* Customer & Shipping info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Delivery Details</h3>
            <div className="space-y-2 text-sm text-foreground">
              <p className="font-bold">{order.customer}</p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-4 shrink-0 text-primary" />
                {order.phone}
              </p>
              <p className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0 mt-0.5 text-primary" />
                <span>
                  {order.address}
                  <span className="block font-medium text-foreground">{order.city}</span>
                </span>
              </p>
            </div>
          </div>

          {/* Order status card */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 h-fit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Status</h3>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm font-semibold capitalize text-foreground">{order.status}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              We will call you shortly to confirm your shipping details before delivery.
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-6 pb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Items Ordered</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-muted-foreground">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="text-foreground">
                    <td className="py-3">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Size {item.size}
                      </p>
                    </td>
                    <td className="py-3 text-center">{item.qty}</td>
                    <td className="py-3 text-right">{formatBDT(item.price)}</td>
                    <td className="py-3 text-right font-medium">
                      {formatBDT(item.price * item.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="bg-muted/10 px-6 py-4 border-t border-border">
          <div className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatBDT(order.total - order.delivery)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className="font-semibold">
                {order.delivery === 0 ? "Free" : formatBDT(order.delivery)}
              </span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>Grand Total</span>
              <span className="text-price">{formatBDT(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer"
        >
          <Printer className="size-4" />
          Print Invoice
        </button>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <ShoppingBag className="size-4" />
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
