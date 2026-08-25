"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@/lib/orders";

const STATUS_MAP_STR_TO_INT: Record<string, number> = {
  pending: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: 5,
  confirmed: 6,
  packed: 7,
  hold: 8,
  preorder: 9,
  return: 10,
  exchange: 11,
  refund: 12,
  "return-process": 13,
};

export interface CreateOrderInput {
  id?: string;
  customerId?: string;
  customer: string;
  phone: string;
  address: string;
  city: string;
  area?: string;
  note?: string;
  payment?: string;
  items: Array<{
    slug: string;
    name: string;
    size?: string;
    qty: number;
    price: number;
  }>;
  total: number;
  delivery: number;
  status?: OrderStatus;
  source?: "checkout" | "manual" | "pre-order";
}

async function resolveNextOrderNumber(): Promise<string> {
  const prefix = "ORD-";
  let nextNum = 10001;

  // 1. Check WebsiteSettings for orderIdPrefix and nextOrderNumber
  const settingsRow = await prisma.websiteSettings.findFirst();
  if (settingsRow?.settingsJson) {
    try {
      const parsed = JSON.parse(settingsRow.settingsJson);
      if (parsed?.orders?.nextOrderNumber) {
        nextNum = Number(parsed.orders.nextOrderNumber);
      }
    } catch {
      /* ignore */
    }
  }

  // 2. Query highest existing order number
  const existingOrders = await prisma.order.findMany({
    select: { orderNumber: true },
    where: { orderNumber: { startsWith: prefix } },
  });

  let maxExisting = 0;
  for (const o of existingOrders) {
    const numPart = parseInt(o.orderNumber.replace(prefix, ""), 10);
    if (!isNaN(numPart) && numPart > maxExisting) {
      maxExisting = numPart;
    }
  }

  if (maxExisting >= nextNum) {
    nextNum = maxExisting + 1;
  }

  let candidate = `${prefix}${nextNum}`;
  while (await prisma.order.findUnique({ where: { orderNumber: candidate } })) {
    nextNum++;
    candidate = `${prefix}${nextNum}`;
  }

  // Persist incremented nextOrderNumber in settings
  if (settingsRow) {
    try {
      const existingSettings = settingsRow.settingsJson ? JSON.parse(settingsRow.settingsJson) : {};
      const updatedSettings = {
        ...existingSettings,
        orders: {
          ...(existingSettings.orders || {}),
          nextOrderNumber: nextNum + 1,
        },
      };
      await prisma.websiteSettings.update({
        where: { id: settingsRow.id },
        data: { settingsJson: JSON.stringify(updatedSettings) },
      });
    } catch {
      /* ignore */
    }
  }

  return candidate;
}

export async function createOrderAction(input: CreateOrderInput): Promise<{ success: boolean; orderNumber: string; id: string; error?: string }> {
  try {
    const phone = input.phone?.trim() || "01700000000";
    const customerName = input.customer?.trim() || "Customer";

    // 1. Find or create Customer Master
    let customer = await prisma.customer.findUnique({
      where: { phone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          fullName: customerName,
          phone,
          email: `${phone.replace(/\+/g, "").replace(/\s+/g, "")}@guest.arzamart.com`,
          defaultAddress: input.address || "",
          district: input.city || "Dhaka",
          area: input.area || null,
          isGuest: true,
        },
      });
    } else {
      // Update default address if changed
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          fullName: customerName,
          defaultAddress: input.address || customer.defaultAddress,
          district: input.city || customer.district,
          area: input.area || customer.area,
        },
      });
    }

    // 2. Generate sequential order number
    const orderNumber = await resolveNextOrderNumber();

    // 3. Construct shipping address with note
    const addressParts = [input.address?.trim(), input.area?.trim(), input.city?.trim()].filter(Boolean);
    let shippingAddress = addressParts.join(", ");
    if (input.note?.trim()) {
      shippingAddress += ` (Note: ${input.note.trim()})`;
    }
    if (input.source === "manual") {
      shippingAddress += ` (Source: Manual/Admin)`;
    }

    const orderStatusInt = input.status ? STATUS_MAP_STR_TO_INT[input.status] || 1 : 1;
    const paymentStatusInt = input.payment?.toLowerCase().includes("paid") ? 2 : 1;
    const subTotal = input.total > input.delivery ? input.total - input.delivery : input.total;

    // 4. Create Order + OrderItems
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        subTotal,
        discountAmount: 0,
        shippingFee: input.delivery,
        totalAmount: input.total,
        orderStatus: orderStatusInt,
        paymentStatus: paymentStatusInt,
        shippingAddressJson: shippingAddress,
      },
    });

    // 5. Add order items & adjust stock if confirmed
    if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        const itemSlug = item.slug;
        const sizeName = item.size?.trim() || "Standard";

        // Find product
        const product = await prisma.product.findFirst({
          where: {
            OR: [
              { slug: itemSlug },
              { name: item.name },
            ],
          },
          include: { variants: true },
        });

        const targetProductId = product?.id || (await prisma.product.findFirst())?.id;
        if (!targetProductId) continue;

        const displayName = sizeName !== "Standard" ? `${item.name} (${sizeName})` : item.name;

        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: targetProductId,
            productName: displayName,
            unitPrice: item.price,
            quantity: item.qty,
          },
        });

        // Deduct variant stock if order is placed as confirmed
        if (orderStatusInt === 6 && product) {
          const variant = product.variants.find((v) => v.name === sizeName || v.name === `Size: ${sizeName}`);
          if (variant) {
            await prisma.productVariant.update({
              where: { id: variant.id },
              data: { stockQuantity: Math.max(0, variant.stockQuantity - item.qty) },
            });
          }
        }
      }
    }

    // 6. Delete draft if it was an incomplete order
    if (input.id) {
      await prisma.incompleteOrder.deleteMany({
        where: {
          OR: [{ orderId: input.id }, { id: input.id.length === 36 ? input.id : undefined }],
        },
      }).catch(() => null);
    }

    revalidatePath("/admin/orders");
    revalidatePath("/admin");

    return {
      success: true,
      orderNumber,
      id: orderNumber,
    };
  } catch (error: unknown) {
    console.error("createOrderAction failed:", error);
    return {
      success: false,
      orderNumber: "",
      id: "",
      error: error instanceof Error ? error.message : "Failed to create order.",
    };
  }
}

export async function updateOrderStatusAction(orderId: string, newStatus: OrderStatus): Promise<{ success: boolean; status: string; error?: string }> {
  try {
    const cleanId = orderId.trim();
    const isUuid = cleanId.length === 36 && cleanId.includes("-");

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: cleanId },
          { orderNumber: `ORD-${cleanId}` },
          { id: isUuid ? cleanId : undefined },
        ],
      },
      include: {
        items: {
          include: {
            product: {
              include: { variants: true },
            },
          },
        },
      },
    });

    if (!order) {
      return { success: false, status: "", error: `Order ${orderId} not found.` };
    }

    const oldStatus = order.orderStatus;
    const nextStatus = STATUS_MAP_STR_TO_INT[newStatus] || 1;

    // Adjust inventory if status is transitioning to/from Confirmed (6)
    if (oldStatus !== nextStatus) {
      if (nextStatus === 6) {
        // Deduct stock
        for (const item of order.items) {
          if (!item.product) continue;
          let sizeName = "Standard";
          const sizeMatch = item.productName.match(/\(([^)]+)\)$/);
          if (sizeMatch && sizeMatch[1]) sizeName = sizeMatch[1].trim();

          const variant = item.product.variants.find((v) => v.name === sizeName || v.name === `Size: ${sizeName}`);
          if (variant) {
            await prisma.productVariant.update({
              where: { id: variant.id },
              data: { stockQuantity: Math.max(0, variant.stockQuantity - item.quantity) },
            });
          }
        }
      } else if (oldStatus === 6) {
        // Restore stock
        for (const item of order.items) {
          if (!item.product) continue;
          let sizeName = "Standard";
          const sizeMatch = item.productName.match(/\(([^)]+)\)$/);
          if (sizeMatch && sizeMatch[1]) sizeName = sizeMatch[1].trim();

          const variant = item.product.variants.find((v) => v.name === sizeName || v.name === `Size: ${sizeName}`);
          if (variant) {
            await prisma.productVariant.update({
              where: { id: variant.id },
              data: { stockQuantity: variant.stockQuantity + item.quantity },
            });
          }
        }
      }
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { orderStatus: nextStatus },
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin");

    return { success: true, status: newStatus };
  } catch (error: unknown) {
    console.error("updateOrderStatusAction failed:", error);
    return { success: false, status: "", error: error instanceof Error ? error.message : "Failed to update order status." };
  }
}

export async function saveIncompleteOrderAction(draft: { id: string; phone?: string; customer?: string; [key: string]: unknown }): Promise<{ success: boolean }> {
  try {
    const orderId = draft.id?.trim();
    if (!orderId) return { success: false };

    const phone = draft.phone?.trim() || "";
    const orderJson = JSON.stringify(draft);

    const existing = await prisma.incompleteOrder.findUnique({
      where: { orderId },
    });

    if (existing) {
      await prisma.incompleteOrder.update({
        where: { id: existing.id },
        data: {
          phone,
          orderJson,
        },
      });
    } else {
      await prisma.incompleteOrder.create({
        data: {
          orderId,
          phone,
          orderJson,
        },
      });
    }

    revalidatePath("/admin/incomplete");
    return { success: true };
  } catch (error) {
    console.error("saveIncompleteOrderAction failed:", error);
    return { success: false };
  }
}

export async function removeIncompleteOrderAction(orderId: string): Promise<{ success: boolean }> {
  try {
    await prisma.incompleteOrder.deleteMany({
      where: {
        OR: [{ orderId }, { id: orderId.length === 36 ? orderId : undefined }],
      },
    });
    revalidatePath("/admin/incomplete");
    return { success: true };
  } catch (error) {
    console.error("removeIncompleteOrderAction failed:", error);
    return { success: false };
  }
}
