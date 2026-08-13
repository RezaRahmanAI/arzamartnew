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
  slug: string;
  name: string;
  size: string;
  color: string;
  qty: number;
  price: number;
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
};

type OrdersContextValue = {
  orders: Order[];
  incomplete: Order[];
  isLoading: boolean;
  generateNextOrderId: () => string;
  addOrder: (order: Order) => Promise<string>;
  saveIncomplete: (order: Order) => Promise<void>;
  removeIncomplete: (id: string) => Promise<void>;
  promoteIncomplete: (id: string) => Promise<void>;
  updateStatus: (id: string, status: OrderStatus) => Promise<void>;
  updateOrder: (id: string, payload: Partial<Order>) => Promise<void>;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { settings, updateSection, saveSettings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [incomplete, setIncomplete] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const generateNextOrderId = useCallback((): string => {
    const prefix = settings?.orders?.orderIdPrefix ?? "ORD-";
    const nextNum = settings?.orders?.nextOrderNumber ?? 10001;
    return `${prefix}${nextNum}`;
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

      // Keep nextOrderNumber in settings aligned with the final adopted id so
      // subsequent orders keep incrementing from the last one.
      const prefix = settings?.orders?.orderIdPrefix ?? "ORD-";
      const currentNum = settings?.orders?.nextOrderNumber ?? 10001;
      if (finalId.startsWith(prefix)) {
        const extractedNum = parseInt(finalId.replace(prefix, ""), 10);
        const nextNum = !isNaN(extractedNum) ? Math.max(currentNum + 1, extractedNum + 1) : currentNum + 1;
        updateSection("orders", { nextOrderNumber: nextNum });
        saveSettings({ silent: true });
      }

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
    try {
      await ordersService.saveIncomplete(order);
    } catch (err) {
      console.error("Failed to sync incomplete order with API:", err);
    }
  }, []);

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
    },
    [incomplete, addOrder]
  );

  const updateStatus = useCallback(async (id: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
    try {
      await ordersService.updateStatus(id, status);
    } catch (err) {
      console.error("Failed to sync order status update with API:", err);
    }
  }, []);

  const updateOrder = useCallback(async (id: string, payload: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...payload, id } : o)));
    setIncomplete((prev) => prev.map((o) => (o.id === id ? { ...o, ...payload, id } : o)));
    try {
      await ordersService.updateOrder(id, payload);
    } catch (err) {
      console.error("Failed to sync order update with API:", err);
    }
  }, []);

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders,
      incomplete,
      isLoading,
      generateNextOrderId,
      addOrder,
      saveIncomplete,
      removeIncomplete,
      promoteIncomplete,
      updateStatus,
      updateOrder,
    }),
    [
      orders,
      incomplete,
      isLoading,
      generateNextOrderId,
      addOrder,
      saveIncomplete,
      removeIncomplete,
      promoteIncomplete,
      updateStatus,
      updateOrder,
    ]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used inside OrdersProvider");
  return ctx;
}
