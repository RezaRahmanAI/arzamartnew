import { type Order, type OrderStatus } from "@/lib/orders";
import { getAllOrders, getOrderById } from "@/lib/data/orders";
import {
  createOrderAction,
  updateOrderStatusAction,
  saveIncompleteOrderAction,
  removeIncompleteOrderAction,
} from "@/actions/orders.actions";

const ORDERS_KEY = "arza-orders-v1";
const INCOMPLETE_KEY = "arza-incomplete-orders-v1";

export interface CreateOrderPayload {
  customerName?: string;
  customer?: string;
  customerPhone?: string;
  phone?: string;
  shippingAddress?: string;
  address?: string;
  city?: string;
  area?: string;
  notes?: string;
  note?: string;
  paymentMethod?: string;
  payment?: string;
  deliveryCharge?: number;
  delivery?: number;
  subtotal?: number;
  totalAmount?: number;
  total?: number;
  items?: Array<{
    productId?: string;
    slug?: string;
    productName?: string;
    name?: string;
    size?: string;
    variantName?: string;
    quantity?: number;
    qty?: number;
    unitPrice?: number;
    price?: number;
  }>;
}

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
    try {
      const dbResult = await getAllOrders();
      if (dbResult.orders.length > 0 || dbResult.incomplete.length > 0) {
        this.saveLocalOrders(dbResult.orders);
        this.saveLocalIncomplete(dbResult.incomplete);
        return dbResult;
      }
      return this.getLocalOrders();
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
      const res = await createOrderAction({
        id: order.id,
        customerId: order.customerId,
        customer: order.customer,
        phone: order.phone,
        address: order.address,
        city: order.city,
        area: order.area,
        note: order.note,
        payment: order.payment,
        items: order.items.map((i) => ({
          slug: i.slug,
          name: i.name,
          size: i.size,
          qty: i.qty,
          price: i.price,
        })),
        total: order.total,
        delivery: order.delivery,
        status: order.status,
        source: order.source,
      });

      if (res.success && res.orderNumber) {
        const adopted = { ...order, id: res.orderNumber };
        const reordered = updatedOrders.map((o) => (o.id === order.id ? adopted : o));
        this.saveLocalOrders(reordered);
        return adopted;
      }
      return order;
    } catch {
      return order;
    }
  }

  public async createOrder(orderPayload: CreateOrderPayload): Promise<{ orderNumber?: string }> {
    try {
      const res = await createOrderAction({
        customer: orderPayload.customerName || orderPayload.customer || "Customer",
        phone: orderPayload.customerPhone || orderPayload.phone || "",
        address: orderPayload.shippingAddress || orderPayload.address || "",
        city: orderPayload.city || "Dhaka",
        area: orderPayload.area,
        note: orderPayload.notes || orderPayload.note,
        payment: orderPayload.paymentMethod || orderPayload.payment,
        items: (orderPayload.items || []).map((i) => ({
          slug: i.slug || i.productId || "product",
          name: i.productName || i.name || "Product",
          size: i.size || i.variantName || "Standard",
          qty: i.quantity || i.qty || 1,
          price: i.unitPrice || i.price || 0,
        })),
        total: orderPayload.totalAmount || orderPayload.total || 0,
        delivery: orderPayload.deliveryCharge || orderPayload.delivery || 0,
        status: "pending",
        source: "checkout",
      });

      return { orderNumber: res.orderNumber };
    } catch {
      return { orderNumber: undefined };
    }
  }

  public async getById(id: string): Promise<Order | null> {
    if (!id) return null;
    try {
      const dbOrder = await getOrderById(id);
      if (dbOrder) {
        return dbOrder;
      }
      const { orders } = this.getLocalOrders();
      return orders.find((o) => o.id === id || o.id.toLowerCase() === id.toLowerCase()) || null;
    } catch {
      const { orders } = this.getLocalOrders();
      return orders.find((o) => o.id === id || o.id.toLowerCase() === id.toLowerCase()) || null;
    }
  }

  public async updateStatus(id: string, status: OrderStatus | string): Promise<boolean> {
    const { orders } = this.getLocalOrders();
    const updated = orders.map((o) => (o.id === id ? { ...o, status: status as OrderStatus } : o));
    this.saveLocalOrders(updated);

    try {
      const res = await updateOrderStatusAction(id, status as OrderStatus);
      return res.success;
    } catch {
      return false;
    }
  }

  public async updateOrder(id: string, payload: Partial<Order>): Promise<Order | null> {
    const { orders } = this.getLocalOrders();
    const updated = orders.map((o) => (o.id === id ? { ...o, ...payload, id } : o));
    this.saveLocalOrders(updated);

    if (payload.status) {
      await updateOrderStatusAction(id, payload.status);
    }
    return updated.find((o) => o.id === id) || null;
  }

  public async addNote(_orderId: string, _text: string, _author: string): Promise<boolean> {
    return true;
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
      await saveIncompleteOrderAction(order);
      return order;
    } catch {
      return order;
    }
  }

  public async removeIncomplete(id: string): Promise<void> {
    const { incomplete } = this.getLocalOrders();
    const updated = incomplete.filter((o) => o.id !== id);
    this.saveLocalIncomplete(updated);

    try {
      await removeIncompleteOrderAction(id);
    } catch {
      /* fallback */
    }
  }
}

export const ordersService = new OrdersService();
