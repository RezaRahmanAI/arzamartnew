"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ordersService } from "./api/services/orders.service";

import { useSettings } from "@/context/settings-context";
import { logSystemAction } from "@/lib/audit-logger";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refund"
  | "hold"
  | "preorder"
  | "return"
  | "exchange"
  | "return-process";

export type OrderItem = {
  productId?: string;
  slug: string;
  name: string;
  size: string;
  qty: number;
  price: number;
  imageUrl?: string;
};

export type Order = {
  id: string;
  customerId?: string;
  customer: string;
  phone: string;
  address: string;
  city: string;
  area?: string;
  note: string;
  payment: string;
  items: OrderItem[];
  total: number;
  delivery: number;
  paid?: number;
  discount?: number;
  status: OrderStatus;
  date: string;
  source: "checkout" | "manual" | "pre-order";
  isPreOrder?: boolean;
  sourcePageName?: string;
  socialMediaSourceName?: string;
  hasNotes?: boolean;
  courierName?: string | null;
  courierTrackingNumber?: string | null;
  shipmentStatus?: string | null;
  shipmentBatchId?: string | null;
  createdAt?: string;
};

type OrdersContextValue = {
  orders: Order[];
  incomplete: Order[];
  isLoading: boolean;
  generateNextOrderId: () => string;
  generateNextIncompleteOrderId: () => string;
  generateNextPreOrderId: () => string;
  addOrder: (order: Order) => Promise<string>;
  saveIncomplete: (order: Order) => Promise<void>;
  removeIncomplete: (id: string) => Promise<void>;
  promoteIncomplete: (id: string) => Promise<void>;
  updateStatus: (id: string, status: OrderStatus) => Promise<void>;
  updateOrder: (id: string, payload: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  transferToRegularOrder: (id: string) => Promise<{ success: boolean; error?: string; newOrderNumber?: string }>;
  transferToPreOrder: (id: string) => Promise<{ success: boolean; error?: string; newOrderNumber?: string }>;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { settings, updateSection, saveSettings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [incomplete, setIncomplete] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const generateNextOrderId = useCallback((): string => {
    const nextNum = settings?.orders?.nextOrderNumber ?? 10001;
    return `${nextNum}`;
  }, [settings]);

  const generateNextIncompleteOrderId = useCallback((): string => {
    const nextNum = settings?.orders?.nextIncompleteOrderNumber ?? 5001;
    return `${nextNum}`;
  }, [settings]);

  const generateNextPreOrderId = useCallback((): string => {
    const nextNum = settings?.orders?.nextPreOrderNumber ?? 1001;
    return `${nextNum}`;
  }, [settings]);

  const fetchOrdersData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await ordersService.getAll();
      setOrders(data.orders);
      setIncomplete(data.incomplete);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrdersData();
  }, [fetchOrdersData]);

    const addOrder = useCallback(
    async (order: Order): Promise<string> => {
      let finalId = order.id;
      setOrders((prev) => [order, ...prev]);
      setIncomplete((prev) => prev.filter((o) => o.id !== order.id));

      try {
        const saved = await ordersService.create(order);
        if (saved && saved.id && saved.id !== order.id) {
          finalId = saved.id;
          setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, id: saved.id! } : o)));
        }
      } catch (err) {
        console.error("Failed to sync order creation with API:", err);
      }

      // FIX 5: Defer settings updates and audit logging so the customer
      // immediately sees the confirmation / invoice screen without UI thread jank.
      setTimeout(() => {
        try {
          const regCurrentNum = settings?.orders?.nextOrderNumber ?? 10001;
          const preCurrentNum = settings?.orders?.nextPreOrderNumber ?? 1001;
          const isPreOrder = order.isPreOrder || order.status === "preorder";

          const extractedNum = parseInt(finalId.replace(/\D/g, ""), 10);

          if (isPreOrder) {
            const nextNum = !isNaN(extractedNum) ? Math.max(preCurrentNum + 1, extractedNum + 1) : preCurrentNum + 1;
            updateSection("orders", { nextPreOrderNumber: nextNum });
            Promise.resolve().then(() => saveSettings({ silent: true })).catch(() => {});
          } else {
            const nextNum = !isNaN(extractedNum) ? Math.max(regCurrentNum + 1, extractedNum + 1) : regCurrentNum + 1;
            updateSection("orders", { nextOrderNumber: nextNum });
            Promise.resolve().then(() => saveSettings({ silent: true })).catch(() => {});
          }

          // Record immutable audit log for order creation
          logSystemAction({
            category: "ORDER",
            action: order.source === "manual" ? "Manual Order Created" : "New Order Placed",
            targetId: finalId,
            targetName: order.customer,
            details: `Order #${finalId} created with total ৳${order.total} (${order.items.length} items) for customer ${order.customer} (${order.phone}). Status: ${order.status}`,
          });
        } catch {
          /* background task error safety */
        }
      }, 0);

      return finalId;
    },
    [settings, updateSection, saveSettings]
  );

  const saveIncomplete = useCallback(async (order: Order) => {
    setIncomplete((prev) => {
      const idx = prev.findIndex((o) => o.id === order.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = order;
        return next;
      }
      return [order, ...prev];
    });

    // Increment nextIncompleteOrderNumber if new incomplete order created
    const currentIncNum = settings?.orders?.nextIncompleteOrderNumber ?? 5001;
    const extractedNum = parseInt(order.id.replace(/\D/g, ""), 10);
    if (!isNaN(extractedNum)) {
      const nextNum = Math.max(currentIncNum + 1, extractedNum + 1);
      updateSection("orders", { nextIncompleteOrderNumber: nextNum });
      saveSettings({ silent: true });
    }

    try {
      await ordersService.saveIncomplete(order);
    } catch (err) {
      console.error("Failed to sync incomplete order with API:", err);
    }
  }, [settings, updateSection, saveSettings]);

  const removeIncomplete = useCallback(async (id: string) => {
    setIncomplete((prev) => prev.filter((o) => o.id !== id));
    try {
      await ordersService.removeIncomplete(id);
    } catch (err) {
      console.error("Failed to sync remove incomplete order with API:", err);
    }
  }, []);

  const promoteIncomplete = useCallback(
    async (id: string) => {
      const target = incomplete.find((o) => o.id === id);
      if (!target) return;
      await addOrder({ ...target, status: "pending", source: "checkout" });
      await removeIncomplete(id);
      logSystemAction({
        category: "ORDER",
        action: "Incomplete Order Promoted",
        targetId: id,
        targetName: target.customer,
        details: `Incomplete order #${id} was promoted to active pending order for ${target.customer}.`,
      });
    },
    [incomplete, addOrder, removeIncomplete]
  );

  const updateStatus = useCallback(async (id: string, status: OrderStatus) => {
    const prevOrder = orders.find((o) => o.id === id);
    const oldStatus = prevOrder?.status || "unknown";

    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );

    logSystemAction({
      category: "ORDER",
      action: "Order Status Updated",
      targetId: id,
      targetName: prevOrder?.customer,
      details: `Order #${id} status changed from "${oldStatus}" to "${status}"`,
      changes: { status: { from: oldStatus, to: status } },
    });

    try {
      await ordersService.updateStatus(id, status);
    } catch (err) {
      console.error("Failed to sync order status update with API:", err);
    }
  }, [orders]);

  const updateOrder = useCallback(async (id: string, payload: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...payload, id } : o)));
    setIncomplete((prev) => prev.map((o) => (o.id === id ? { ...o, ...payload, id } : o)));

    logSystemAction({
      category: "ORDER",
      action: "Order Details Modified",
      targetId: id,
      details: `Order #${id} updated with changes: ${Object.keys(payload).join(", ")}`,
    });

    try {
      await ordersService.updateOrder(id, payload);
    } catch (err) {
      console.error("Failed to sync order update with API:", err);
    }
  }, []);

  const deleteOrder = useCallback(async (id: string) => {
    const targetOrder = orders.find((o) => o.id === id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setIncomplete((prev) => prev.filter((o) => o.id !== id));

    logSystemAction({
      category: "ORDER",
      action: "Order Deleted",
      targetId: id,
      targetName: targetOrder?.customer,
      details: `Order #${id} (Customer: ${targetOrder?.customer || "Unknown"}, Total: ৳${targetOrder?.total || 0}) was permanently deleted by admin/staff.`,
    });

    try {
      await ordersService.deleteOrder(id);
    } catch (err) {
      console.error("Failed to sync order deletion with API:", err);
    }
  }, [orders]);

  const transferToRegularOrder = useCallback(
    async (id: string) => {
      const res = await ordersService.transferToRegularOrder(id);
      if (res.success && res.newOrderNumber) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === id || o.id.replace(/\D/g, "") === id.replace(/\D/g, "")
              ? { ...o, id: res.newOrderNumber!, isPreOrder: false }
              : o
          )
        );
        logSystemAction({
          category: "ORDER",
          action: "Pre-Order Transferred to Regular Order",
          targetId: res.newOrderNumber,
          details: `Pre-order #${id} successfully transferred to regular running order #${res.newOrderNumber}.`,
        });
      }
      return res;
    },
    []
  );

  const transferToPreOrder = useCallback(
    async (id: string) => {
      const res = await ordersService.transferToPreOrder(id);
      if (res.success && res.newOrderNumber) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === id || o.id.replace(/\D/g, "") === id.replace(/\D/g, "")
              ? { ...o, id: res.newOrderNumber!, isPreOrder: true, status: "pending" as OrderStatus }
              : o
          )
        );
        logSystemAction({
          category: "ORDER",
          action: "Order Transferred to Pre-Order",
          targetId: res.newOrderNumber,
          details: `Regular pending order #${id} transferred to pre-order #${res.newOrderNumber}.`,
        });
      }
      return res;
    },
    []
  );

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders,
      incomplete,
      isLoading,
      generateNextOrderId,
      generateNextIncompleteOrderId,
      generateNextPreOrderId,
      addOrder,
      saveIncomplete,
      removeIncomplete,
      promoteIncomplete,
      updateStatus,
      updateOrder,
      deleteOrder,
      transferToRegularOrder,
      transferToPreOrder,
    }),
    [
      orders,
      incomplete,
      isLoading,
      generateNextOrderId,
      generateNextIncompleteOrderId,
      generateNextPreOrderId,
      addOrder,
      saveIncomplete,
      removeIncomplete,
      promoteIncomplete,
      updateStatus,
      updateOrder,
      deleteOrder,
      transferToRegularOrder,
      transferToPreOrder,
    ]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used inside OrdersProvider");
  return ctx;
}
