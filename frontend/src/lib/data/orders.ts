import prisma from "@/lib/prisma";
import type { Order, OrderStatus } from "@/lib/orders";
import { Prisma } from "@prisma/client";

const STATUS_MAP_INT_TO_STR: Record<number, OrderStatus> = {
  1: "pending",
  2: "processing",
  3: "shipped",
  4: "delivered",
  5: "cancelled",
  6: "confirmed",
  7: "packed",
  8: "hold",
  9: "preorder",
  10: "return",
  11: "exchange",
  12: "refund",
  13: "return-process",
};

export function mapPrismaOrder(o: {
  id: string;
  orderNumber: string;
  customerId: string;
  subTotal: Prisma.Decimal | number | string;
  discountAmount: Prisma.Decimal | number | string;
  shippingFee: Prisma.Decimal | number | string;
  totalAmount: Prisma.Decimal | number | string;
  orderStatus: number;
  paymentStatus: number;
  shippingAddressJson: string;
  couponCode: string | null;
  createdAtUtc: Date;
  customer?: { id: string; fullName: string; phone: string; district: string; defaultAddress: string | null; area: string | null } | null;
  items?: { id: number; productId: string; productName: string; unitPrice: Prisma.Decimal | number | string; quantity: number; product?: { slug: string; name: string } | null }[];
}): Order {
  const customerName = o.customer?.fullName || "Customer";
  const customerPhone = o.customer?.phone || "";
  const customerDistrict = o.customer?.district || "Dhaka";
  const customerArea = o.customer?.area || undefined;

  let cleanAddress = o.shippingAddressJson || o.customer?.defaultAddress || "";
  let extractedCity = customerDistrict;
  let extractedArea = customerArea;
  let note = "";
  let paymentMethod = o.paymentStatus === 2 ? "Paid (bKash/Online)" : "Cash on Delivery";

  let isPreOrderFlag = o.orderStatus === 10; // status 10 is preorder

  if (o.shippingAddressJson) {
    const trimmed = o.shippingAddressJson.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.address) cleanAddress = parsed.address;
        if (parsed.city) extractedCity = parsed.city;
        if (parsed.area) extractedArea = parsed.area;
        if (parsed.note) note = parsed.note;
        if (parsed.paymentMethod) paymentMethod = parsed.paymentMethod;
        if (typeof parsed.isPreOrder === "boolean") isPreOrderFlag = parsed.isPreOrder;
      } catch {
        // Not valid JSON, proceed with legacy regex parsing
      }
    }

    if (!note) {
      const noteMatch = o.shippingAddressJson.match(/\(Note:\s*([^)]+)\)/i);
      if (noteMatch && noteMatch[1]) {
        note = noteMatch[1].trim();
      }
      cleanAddress = cleanAddress.replace(/\s*\(Note:[^)]+\)/i, "").trim();
    }
  }

  const items = (o.items || []).map((i) => {
    let rawName = i.productName || i.product?.name || "Product";
    let size = "Standard";
    const sizeMatch = rawName.match(/\(([^)]+)\)$/);
    if (sizeMatch && sizeMatch[1]) {
      size = sizeMatch[1].trim();
      rawName = rawName.substring(0, sizeMatch.index).trim();
    }

    return {
      slug: i.product?.slug || "product",
      name: rawName,
      size,
      qty: i.quantity,
      price: Number(i.unitPrice) || 0,
    };
  });

  const isManual = o.shippingAddressJson.toLowerCase().includes("manual") || o.shippingAddressJson.toLowerCase().includes("source:");

  return {
    id: o.orderNumber || `ORD-${o.id}`,
    customerId: o.customerId,
    customer: customerName,
    phone: customerPhone,
    address: cleanAddress,
    city: extractedCity,
    area: extractedArea,
    note,
    payment: paymentMethod,
    items,
    total: Number(o.totalAmount) || 0,
    delivery: Number(o.shippingFee) || 0,
    discount: Number(o.discountAmount) || 0,
    status: STATUS_MAP_INT_TO_STR[o.orderStatus] || "pending",
    date: o.createdAtUtc.toISOString().slice(0, 10),
    source: isManual ? "manual" : "checkout",
    isPreOrder: isPreOrderFlag,
    hasNotes: !!note,
  };
}

export async function getAllOrders(): Promise<{ orders: Order[]; incomplete: Order[] }> {
  try {
    const [orderRows, incompleteRows] = await Promise.all([
      prisma.order.findMany({
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAtUtc: "desc" },
      }),
      prisma.incompleteOrder.findMany({
        orderBy: { createdAtUtc: "desc" },
      }),
    ]);

    const orders = orderRows.map(mapPrismaOrder);

    const incomplete: Order[] = [];
    for (const row of incompleteRows) {
      try {
        const parsed = JSON.parse(row.orderJson);
        incomplete.push({
          id: row.orderId,
          customer: parsed.customer || parsed.name || "Incomplete",
          phone: row.phone || parsed.phone || "",
          address: parsed.address || "",
          city: parsed.city || "Dhaka",
          area: parsed.area,
          note: parsed.note || "",
          payment: parsed.payment || "Cash on Delivery",
          items: parsed.items || [],
          total: parsed.total || 0,
          delivery: parsed.delivery || 0,
          status: "pending",
          date: row.createdAtUtc.toISOString().slice(0, 10),
          source: "checkout",
        });
      } catch {
        /* skip invalid JSON */
      }
    }

    return { orders, incomplete };
  } catch (error) {
    console.error("getAllOrders database query failed:", error);
    return { orders: [], incomplete: [] };
  }
}

export async function getOrderById(idOrNumber: string): Promise<Order | null> {
  try {
    const clean = idOrNumber.trim();
    const isUuid = clean.length === 36 && clean.includes("-");

    const row = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: clean },
          { orderNumber: `ORD-${clean}` },
          { id: isUuid ? clean : undefined },
        ],
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!row) return null;
    return mapPrismaOrder(row);
  } catch (error) {
    console.error(`getOrderById failed for ${idOrNumber}:`, error);
    return null;
  }
}

export async function getCustomerOrders(phone: string): Promise<Order[]> {
  try {
    const cleanPhone = phone.trim();
    const rows = await prisma.order.findMany({
      where: {
        customer: {
          phone: cleanPhone,
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAtUtc: "desc" },
    });

    return rows.map(mapPrismaOrder);
  } catch (error) {
    console.error(`getCustomerOrders failed for ${phone}:`, error);
    return [];
  }
}
