import { apiClient } from "../client";
import { apiConfig } from "../config";
import { type Order, type OrderStatus } from "@/lib/orders";

const ORDERS_KEY = "arza-orders-v1";
const INCOMPLETE_KEY = "arza-incomplete-orders-v1";

class OrdersService {
  private getLocalOrders(): { orders: Order[]; incomplete: Order[] } {
    if (typeof window === "undefined") {
      return { orders: [], incomplete: [] };
    }
    try {
      const rawOrders = window.localStorage.getItem(ORDERS_KEY);
      const rawInc = window.localStorage.getItem(INCOMPLETE_KEY);
      const orders = rawOrders ? JSON.parse(rawOrders) : [];
      const incomplete = rawInc ? JSON.parse(rawInc) : [];
      return { orders, incomplete };
    } catch {
      return { orders: [], incomplete: [] };
    }
  }

  private saveLocalOrders(orders: Order[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch {
      /* ignore */
    }
  }

  private saveLocalIncomplete(incomplete: Order[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(INCOMPLETE_KEY, JSON.stringify(incomplete));
    } catch {
      /* ignore */
    }
  }

  public async getAll(): Promise<{ orders: Order[]; incomplete: Order[] }> {
    if (apiConfig.useMockData) {
      return this.getLocalOrders();
    }
    try {
      const orders = await apiClient.get<Order[]>("/orders").catch(() => null);
      const incomplete = await apiClient.get<Order[]>("/orders/incomplete").catch(() => null);

      const local = this.getLocalOrders();
      const resolvedOrders = Array.isArray(orders) ? orders : local.orders;
      const resolvedIncomplete = Array.isArray(incomplete) ? incomplete : local.incomplete;

      // Sync localStorage with API data to prevent stale fallbacks
      if (Array.isArray(orders)) this.saveLocalOrders(resolvedOrders);
      if (Array.isArray(incomplete)) this.saveLocalIncomplete(resolvedIncomplete);

      return { orders: resolvedOrders, incomplete: resolvedIncomplete };
    } catch {
      return this.getLocalOrders();
    }
  }

  public async create(order: Order): Promise<Order> {
    const { orders, incomplete } = this.getLocalOrders();
    const updatedOrders = [order, ...orders];
    const updatedInc = incomplete.filter((o) => o.id !== order.id);
    this.saveLocalOrders(updatedOrders);
    this.saveLocalIncomplete(updatedInc);

    try {
      return await apiClient.post<Order>("/orders", order);
    } catch {
      return order;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async createOrder(orderPayload: any): Promise<{ orderNumber?: string }> {
    try {
      return await apiClient.post<{ orderNumber?: string }>("/orders", orderPayload);
    } catch {
      return { orderNumber: "ORD-" + Math.floor(100000 + Math.random() * 900000) };
    }
  }

  public async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const { orders } = this.getLocalOrders();
    const updated = orders.map((o) => (o.id === id ? { ...o, status } : o));
    this.saveLocalOrders(updated);
    const target = updated.find((o) => o.id === id)!;

    try {
      return await apiClient.patch<Order>(`/orders/${id}/status`, { status });
    } catch {
      return target;
    }
  }

  public async saveIncomplete(order: Order): Promise<Order> {
    const { incomplete } = this.getLocalOrders();
    const idx = incomplete.findIndex((o) => o.id === order.id);
    let updated: Order[];
    if (idx >= 0) {
      updated = [...incomplete];
      updated[idx] = order;
    } else {
      updated = [order, ...incomplete];
    }
    this.saveLocalIncomplete(updated);

    try {
      return await apiClient.post<Order>("/orders/incomplete", order);
    } catch {
      return order;
    }
  }

  public async removeIncomplete(id: string): Promise<void> {
    const { incomplete } = this.getLocalOrders();
    const updated = incomplete.filter((o) => o.id !== id);
    this.saveLocalIncomplete(updated);

    try {
      await apiClient.delete<void>(`/orders/incomplete/${id}`);
    } catch {
      /* fallback */
    }
  }
}

export const ordersService = new OrdersService();
