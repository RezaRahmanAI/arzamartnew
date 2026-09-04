"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Order, OrderStatus } from "@/lib/orders";
import { getAllOrders, getOrderById } from "@/lib/data/orders";

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
    productId?: string;
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
  sourcePageName?: string;
  socialMediaSourceName?: string;
  courierName?: string;
  courierTrackingNumber?: string;
}

async function resolveNextOrderNumber(latestOrderNumber?: string | null, settingsJson?: string | null): Promise<string> {
  let prefix = "ORD-";
  let nextNum = 10001;

  // 1. Check WebsiteSettings for orderIdPrefix and nextOrderNumber
  const settingsRow = settingsJson !== undefined
    ? (settingsJson ? { settingsJson } : null)
    : await prisma.websiteSettings.findFirst({ select: { settingsJson: true } });

  if (settingsRow?.settingsJson) {
    try {
      const parsed = JSON.parse(settingsRow.settingsJson);
      if (parsed?.orders?.orderIdPrefix) {
        prefix = parsed.orders.orderIdPrefix;
      }
      if (parsed?.orders?.nextOrderNumber) {
        nextNum = Number(parsed.orders.nextOrderNumber);
      }
    } catch {
      /* ignore */
    }
  }

  // 2. Query highest orderNumber matching this regular prefix in database
  const latestOrder = latestOrderNumber !== undefined
    ? (latestOrderNumber ? { orderNumber: latestOrderNumber } : null)
    : await prisma.order.findFirst({
        where: { orderNumber: { startsWith: prefix } },
        orderBy: { createdAtUtc: "desc" },
        select: { orderNumber: true },
      });

  if (latestOrder?.orderNumber) {
    const rawNumStr = latestOrder.orderNumber.replace(prefix, "").replace(/\D/g, "");
    const numPart = parseInt(rawNumStr, 10);
    if (!isNaN(numPart) && numPart >= nextNum) {
      nextNum = numPart + 1;
    }
  }

  return `${prefix}${nextNum}`;
}

async function resolveNextPreOrderNumber(latestOrderNumber?: string | null, settingsJson?: string | null): Promise<string> {
  let prefix = "PRE-";
  let nextNum = 1001;

  // 1. Check WebsiteSettings for preOrderIdPrefix and nextPreOrderNumber
  const settingsRow = settingsJson !== undefined
    ? (settingsJson ? { settingsJson } : null)
    : await prisma.websiteSettings.findFirst({ select: { settingsJson: true } });

  if (settingsRow?.settingsJson) {
    try {
      const parsed = JSON.parse(settingsRow.settingsJson);
      if (parsed?.orders?.preOrderIdPrefix) {
        prefix = parsed.orders.preOrderIdPrefix;
      }
      if (parsed?.orders?.nextPreOrderNumber) {
        nextNum = Number(parsed.orders.nextPreOrderNumber);
      }
    } catch {
      /* ignore */
    }
  }

  // 2. Query highest pre-order number matching this prefix in database
  const latestPreOrder = latestOrderNumber !== undefined
    ? (latestOrderNumber ? { orderNumber: latestOrderNumber } : null)
    : await prisma.order.findFirst({
        where: { orderNumber: { startsWith: prefix } },
        orderBy: { createdAtUtc: "desc" },
        select: { orderNumber: true },
      });

  if (latestPreOrder?.orderNumber) {
    const rawNumStr = latestPreOrder.orderNumber.replace(prefix, "").replace(/\D/g, "");
    const numPart = parseInt(rawNumStr, 10);
    if (!isNaN(numPart) && numPart >= nextNum) {
      nextNum = numPart + 1;
    }
  }

  return `${prefix}${nextNum}`;
}

export async function getOrdersAction(options?: { type?: "all" | "regular" | "preorder"; includePreOrders?: boolean }): Promise<{ orders: Order[]; incomplete: Order[] }> {
  try {
    return await getAllOrders(options);
  } catch (error) {
    console.error("getOrdersAction error:", error);
    return { orders: [], incomplete: [] };
  }
}

export async function getOrderByIdAction(id: string): Promise<Order | null> {
  try {
    return await getOrderById(id);
  } catch (error) {
    console.error("getOrderByIdAction error:", error);
    return null;
  }
}

export async function createOrderAction(input: CreateOrderInput): Promise<{
  success: boolean;
  id?: string;
  orderNumber?: string;
  error?: string;
}> {
  const tTotalStart = performance.now();
  try {
    const cleanPhone = (input.phone || "").trim().replace(/\D/g, "");
    if (!cleanPhone) {
      return { success: false, error: "Phone number is required." };
    }

    // Step A: Parallelize customer lookup, settings, latest order numbers, and all product lookups
    const tFetchStart = performance.now();
    const isPreOrderRequested = input.source === "pre-order" || input.status === "preorder";

    const productQueries = input.items.map((item) => {
      const isUuid = item.slug && item.slug.length === 36 && item.slug.includes("-");
      return prisma.product.findFirst({
        where: {
          OR: [
            ...(item.productId ? [{ id: item.productId }] : []),
            ...(isUuid ? [{ id: item.slug }] : []),
            ...(item.slug ? [{ slug: item.slug }] : []),
            ...(item.name ? [{ name: item.name }] : []),
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          badge: true,
          variants: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    const [settingsRow, latestRegOrder, latestPreOrder, ...loadedProducts] = await Promise.all([
      prisma.websiteSettings.findFirst({ select: { settingsJson: true } }),
      prisma.order.findFirst({
        where: { orderNumber: { startsWith: "ORD-" } },
        orderBy: { createdAtUtc: "desc" },
        select: { orderNumber: true },
      }),
      prisma.order.findFirst({
        where: { orderNumber: { startsWith: "PRE-" } },
        orderBy: { createdAtUtc: "desc" },
        select: { orderNumber: true },
      }),
      ...productQueries,
    ]);
    console.log(`[OrderPerf] Parallel pre-fetch took ${(performance.now() - tFetchStart).toFixed(1)}ms`);

    // Step B: Resolve subTotal, discount, delivery
    const subTotal = input.items.reduce((acc, item) => acc + (item.price || 0) * (item.qty || 1), 0);
    const shippingFee = input.delivery ?? 0;
    const totalAmount = input.total || subTotal + shippingFee;
    const discountAmount = Math.max(0, subTotal + shippingFee - totalAmount);

    const calculatedIsPreOrder = isPreOrderRequested;

    // Resolve order number instantly using already fetched settingsRow and latestOrder
    const orderNumber = calculatedIsPreOrder
      ? await resolveNextPreOrderNumber(latestPreOrder?.orderNumber, settingsRow?.settingsJson)
      : await resolveNextOrderNumber(latestRegOrder?.orderNumber, settingsRow?.settingsJson);

    const fullAddressJson = JSON.stringify({
      address: input.address,
      city: input.city,
      area: input.area || "",
      note: input.note || "",
      paymentMethod: input.payment || "Cash on Delivery",
      isPreOrder: calculatedIsPreOrder,
      source: input.source || (calculatedIsPreOrder ? "pre-order" : "checkout"),
      sourcePageName: input.sourcePageName || "",
      socialMediaSourceName: input.socialMediaSourceName || "",
      courierName: input.courierName || "",
      courierTrackingNumber: input.courierTrackingNumber || "",
    });

    const statusInt = STATUS_MAP_STR_TO_INT[input.status || "pending"] ?? 1;

    // Step C: Atomic transaction (Customer upsert + Order + OrderItems)
    const tTxStart = performance.now();
    const createdOrder = await prisma.$transaction(async (tx) => {
      // Upsert customer: atomic find-or-create/update within the transaction
      const customer = await tx.customer.upsert({
        where: { phone: cleanPhone },
        update: {
          ...(input.customer && input.customer !== "Customer" ? { fullName: input.customer } : {}),
          ...(input.address ? { defaultAddress: input.address } : {}),
          ...(input.city ? { district: input.city } : {}),
          ...(input.area ? { area: input.area } : {}),
        },
        create: {
          fullName: input.customer || "Guest Customer",
          email: `${cleanPhone.replace(/\+/g, "")}@customer.local`,
          phone: cleanPhone,
          defaultAddress: input.address || "Dhaka",
          district: input.city || "Dhaka",
          area: input.area || null,
          isGuest: true,
        },
        select: { id: true },
      });

      const ord = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          subTotal,
          discountAmount,
          shippingFee,
          totalAmount,
          orderStatus: statusInt,
          paymentStatus: 0, // 0 = Unpaid
          shippingAddressJson: fullAddressJson,
          couponCode: null,
          isPreOrder: calculatedIsPreOrder,
        },
      });

      for (let idx = 0; idx < input.items.length; idx++) {
        const item = input.items[idx];
        const prod = loadedProducts[idx];
        const productId = prod?.id;

        let matchedVariantId: string | undefined = undefined;
        if (prod && item.size && prod.variants.length > 0) {
          const v = prod.variants.find(
            (varItem) =>
              varItem.name.replace(/^Size:\s*/i, "").trim().toLowerCase() === item.size!.trim().toLowerCase()
          );
          if (v) matchedVariantId = v.id;
        }

        if (productId) {
          await tx.orderItem.create({
            data: {
              orderId: ord.id,
              productId,
              variantId: matchedVariantId,
              productName: item.size ? `${item.name} (${item.size})` : item.name,
              unitPrice: item.price,
              quantity: item.qty || 1,
            },
          });
        }

        // Stock decrement only if order is directly confirmed
        if (input.status === "confirmed" && matchedVariantId) {
          await tx.productVariant.update({
            where: { id: matchedVariantId },
            data: { stockQuantity: { decrement: item.qty || 1 } },
          });
        }
      }

      return ord;
    });
    console.log(`[OrderPerf] Transaction (Order + OrderItems) took ${(performance.now() - tTxStart).toFixed(1)}ms`);

    // Step G: Fire-and-forget non-blocking background cleanup and cache revalidation
    (async () => {
      try {
        await prisma.incompleteOrder.deleteMany({
          where: { phone: cleanPhone },
        });
        revalidatePath("/admin/orders");
        revalidatePath("/admin/incomplete");
        revalidatePath("/orders");
      } catch (bgErr) {
        console.warn("[OrderPerf] Background cleanup warning:", bgErr);
      }
    })();

    console.log(`[OrderPerf] Total createOrderAction took ${(performance.now() - tTotalStart).toFixed(1)}ms`);
    return { success: true, id: createdOrder.id, orderNumber: createdOrder.orderNumber };
  } catch (error: unknown) {
    console.error("createOrderAction failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to place order.",
    };
  }
}

export async function updateOrderStatusAction(
  orderIdentifier: string,
  newStatus: OrderStatus | string
): Promise<{ success: boolean; error?: string }> {
  try {
    const statusInt = STATUS_MAP_STR_TO_INT[newStatus.toLowerCase()] ?? 1;
    const cleanId = orderIdentifier.trim();

    // Query order by id (GUID) or orderNumber
    const whereCondition =
      cleanId.length === 36 && cleanId.includes("-")
        ? { id: cleanId }
        : { orderNumber: cleanId };

    const order = await prisma.order.findFirst({
      where: whereCondition,
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
      return { success: false, error: "Order not found" };
    }

    const previousStatus = order.orderStatus;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: statusInt },
      });

      // Stock management based on deducted vs un-deducted status groups
      // Deducted statuses: Confirmed (6), Processing (2), Packed (7), Shipped (3), Delivered (4)
      // Non-deducted statuses: Pending (1), Cancelled (5), Hold (8), Preorder (9), Return (10), Refund (12), Return-Process (13)
      const DEDUCTED_STATUS_INTS = [6, 2, 7, 3, 4];
      const isNewDeducted = DEDUCTED_STATUS_INTS.includes(statusInt);
      const isPrevDeducted = DEDUCTED_STATUS_INTS.includes(previousStatus);

      // Case A: Transitioned from non-deducted (e.g. Pending) to Deducted (e.g. Confirmed) -> Deduct Stock
      if (isNewDeducted && !isPrevDeducted) {
        for (const item of order.items) {
          if (item.product && item.product.variants.length > 0) {
            // Find variant by size in productName like "T-Shirt (M)" or item.variantId
            let variant = item.variantId ? item.product.variants.find((v) => v.id === item.variantId) : null;
            if (!variant) {
              const sizeMatch = item.productName.match(/\(([^)]+)\)$/);
              const sizeName = sizeMatch ? sizeMatch[1].trim().toLowerCase() : "";
              variant = item.product.variants.find((v) =>
                v.name.replace(/^Size:\s*/i, "").trim().toLowerCase() === sizeName ||
                v.name.toLowerCase().includes(sizeName)
              );
            }

            if (variant) {
              await tx.productVariant.update({
                where: { id: variant.id },
                data: {
                  stockQuantity: {
                    decrement: Math.min(variant.stockQuantity, item.quantity),
                  },
                },
              });
            }
          }
        }
      }

      // Case B: Transitioned from Deducted (e.g. Confirmed) back to Non-deducted (e.g. Pending, Cancelled, Return) -> Restock
      if (!isNewDeducted && isPrevDeducted) {
        for (const item of order.items) {
          if (item.product && item.product.variants.length > 0) {
            let variant = item.variantId ? item.product.variants.find((v) => v.id === item.variantId) : null;
            if (!variant) {
              const sizeMatch = item.productName.match(/\(([^)]+)\)$/);
              const sizeName = sizeMatch ? sizeMatch[1].trim().toLowerCase() : "";
              variant = item.product.variants.find((v) =>
                v.name.replace(/^Size:\s*/i, "").trim().toLowerCase() === sizeName ||
                v.name.toLowerCase().includes(sizeName)
              );
            }

            if (variant) {
              await tx.productVariant.update({
                where: { id: variant.id },
                data: {
                  stockQuantity: {
                    increment: item.quantity,
                  },
                },
              });
            }
          }
        }
      }
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/order-confirmation/${order.orderNumber}`);

    return { success: true };
  } catch (error: unknown) {
    console.error("updateOrderStatusAction failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update status",
    };
  }
}

export async function updateOrderAction(
  orderIdentifier: string,
  payload: Partial<Order>
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanId = orderIdentifier.trim();
    const whereCondition =
      cleanId.length === 36 && cleanId.includes("-")
        ? { id: cleanId }
        : { orderNumber: cleanId };

    const order = await prisma.order.findFirst({
      where: whereCondition,
      include: { customer: true },
    });

    if (!order) {
      // Check if it is an incomplete order
      const incompleteRow = await prisma.incompleteOrder.findFirst({
        where: { orderId: cleanId },
      });

      if (incompleteRow) {
        let currentOrder: Record<string, unknown> = {};
        try {
          currentOrder = JSON.parse(incompleteRow.orderJson);
        } catch {
          /* fallback */
        }
        const updatedIncomplete = {
          ...currentOrder,
          ...payload,
          id: cleanId,
        };
        await prisma.incompleteOrder.update({
          where: { id: incompleteRow.id },
          data: {
            orderJson: JSON.stringify(updatedIncomplete),
            phone: payload.phone || incompleteRow.phone,
          },
        });
        revalidatePath("/admin/incomplete");
        return { success: true };
      }

      return { success: false, error: "Order not found" };
    }

    const updateData: Record<string, unknown> = {};

    if (payload.status) {
      updateData.orderStatus = STATUS_MAP_STR_TO_INT[payload.status.toLowerCase()] ?? order.orderStatus;
    }

    if (payload.delivery !== undefined) {
      updateData.shippingFee = payload.delivery;
    }

    if (payload.discount !== undefined) {
      updateData.discountAmount = payload.discount;
    }

    if (payload.total !== undefined) {
      updateData.totalAmount = payload.total;
    }

    if (payload.paid !== undefined) {
      const total = payload.total !== undefined ? payload.total : Number(order.totalAmount);
      // 2 = Paid, 1 = Partial / Unpaid
      updateData.paymentStatus = payload.paid >= total && total > 0 ? 2 : 1;
    }

    let existingMeta: Record<string, unknown> = {};
    try {
      if (order.shippingAddressJson) {
        existingMeta = JSON.parse(order.shippingAddressJson);
      }
    } catch {
      /* fallback */
    }

    const updatedMeta = {
      ...existingMeta,
      address: payload.address !== undefined ? payload.address : existingMeta.address || order.customer.defaultAddress,
      city: payload.city !== undefined ? payload.city : existingMeta.city || order.customer.district,
      area: payload.area !== undefined ? payload.area : existingMeta.area,
      note: payload.note !== undefined ? payload.note : existingMeta.note,
      source: payload.source !== undefined ? payload.source : existingMeta.source,
      sourcePageName: payload.sourcePageName !== undefined ? payload.sourcePageName : existingMeta.sourcePageName,
      socialMediaSourceName: payload.socialMediaSourceName !== undefined ? payload.socialMediaSourceName : existingMeta.socialMediaSourceName,
      isPreOrder: payload.isPreOrder !== undefined ? payload.isPreOrder : existingMeta.isPreOrder,
      paid: payload.paid !== undefined ? payload.paid : existingMeta.paid,
      discount: payload.discount !== undefined ? payload.discount : existingMeta.discount,
      delivery: payload.delivery !== undefined ? payload.delivery : existingMeta.delivery,
    };

    updateData.shippingAddressJson = JSON.stringify(updatedMeta);

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: updateData,
      });

      if (payload.customer || payload.phone || payload.address || payload.city) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            fullName: payload.customer || order.customer.fullName,
            phone: payload.phone || order.customer.phone,
            defaultAddress: payload.address || order.customer.defaultAddress,
            district: payload.city || order.customer.district,
          },
        });
      }
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/customers");
    revalidatePath(`/order-confirmation/${order.orderNumber}`);

    return { success: true };
  } catch (error) {
    console.error("updateOrderAction failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update order",
    };
  }
}

export async function saveIncompleteOrderAction(order: Order): Promise<{ success: boolean }> {
  try {
    const orderId = (order.id || `INC-${Date.now()}`).trim();
    const phone = (order.phone || "").trim() || orderId;
    const orderJson = JSON.stringify(order);

    const existing = await prisma.incompleteOrder.findFirst({
      where: {
        OR: [{ orderId }, { phone }],
      },
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

export async function deleteOrderAction(orderIdentifier: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanId = orderIdentifier.trim();
    const isUuid = cleanId.length === 36 && cleanId.includes("-");

    const order = await prisma.order.findFirst({
      where: isUuid ? { id: cleanId } : { orderNumber: cleanId },
    });

    if (order) {
      // REQUIREMENT: Delete is ONLY allowed when order status is "cancelled" (status code 5)
      if (order.orderStatus !== 5) {
        return {
          success: false,
          error: "Orders can only be deleted when their status is 'Cancelled'.",
        };
      }

      // 1. Delete associated order items
      await prisma.orderItem.deleteMany({
        where: { orderId: order.id },
      });

      // 2. Delete the order
      await prisma.order.delete({
        where: { id: order.id },
      });
    }

    // Also clean from incomplete orders if it was an incomplete id
    await prisma.incompleteOrder.deleteMany({
      where: { orderId: cleanId },
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/incomplete");
    revalidatePath("/admin/customers");

    return { success: true };
  } catch (error) {
    console.error("deleteOrderAction failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete order",
    };
  }
}

/**
 * Transfer a Pre-Order to a Regular Order:
 * 1. Checks that the order exists and is currently a pre-order.
 * 2. Gated on CURRENT product stock: For every item, verify available stock >= required quantity.
 *    If any item is insufficient, rejects server-side with detailed error message.
 * 3. In an atomic transaction:
 *    - Assigns a NEW order number from the regular sequence (ORD-xxxxx).
 *    - Updates isPreOrder = false in database and inside shippingAddressJson metadata.
 *    - Deducts the required stock from each variant.
 *    - Records audit log in the order's note field.
 * 4. Revalidates paths.
 */
export async function transferToRegularOrderAction(
  orderIdentifier: string
): Promise<{ success: boolean; error?: string; newOrderNumber?: string }> {
  try {
    const cleanId = orderIdentifier.trim();
    const isUuid = cleanId.length === 36 && cleanId.includes("-");

    const order = await prisma.order.findFirst({
      where: isUuid ? { id: cleanId } : { orderNumber: cleanId },
      include: {
        customer: true,
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
      return { success: false, error: "Order not found." };
    }

    let meta: Record<string, unknown> = {};
    try {
      if (order.shippingAddressJson) {
        meta = JSON.parse(order.shippingAddressJson);
      }
    } catch {
      /* ignore */
    }

    const isCurrentPreOrder = order.isPreOrder || meta.isPreOrder || order.orderStatus === 9 || order.orderStatus === 10;
    if (!isCurrentPreOrder) {
      return { success: false, error: "This order is already a regular running order." };
    }

    // --- REQUIREMENT 3: Stock-Gated Check at Transfer Time ---
    const insufficientItems: string[] = [];
    const variantMatches: Array<{
      item: typeof order.items[0];
      variant: NonNullable<typeof order.items[0]["product"]>["variants"][0];
    }> = [];

    for (const item of order.items) {
      if (!item.product) {
        insufficientItems.push(`${item.productName}: Product catalog entry not found.`);
        continue;
      }

      let matchedVariant: NonNullable<typeof item.product>["variants"][0] | null = null;
      if (item.variantId) {
        matchedVariant = item.product.variants.find((v) => v.id === item.variantId) || null;
      }
      if (!matchedVariant) {
        const sizeMatch = item.productName.match(/\(([^)]+)\)$/);
        const sizeName = sizeMatch ? sizeMatch[1].trim().toLowerCase() : "";
        matchedVariant = item.product.variants.find((v) =>
          v.name.replace(/^Size:\s*/i, "").trim().toLowerCase() === sizeName ||
          v.name.toLowerCase().includes(sizeName)
        ) || null;
      }
      if (!matchedVariant && item.product.variants.length === 1) {
        matchedVariant = item.product.variants[0];
      }

      if (!matchedVariant) {
        insufficientItems.push(`${item.productName}: Variant not found.`);
        continue;
      }

      if (matchedVariant.stockQuantity < item.quantity) {
        insufficientItems.push(
          `${item.productName} (Available: ${matchedVariant.stockQuantity}, Required: ${item.quantity})`
        );
      } else {
        variantMatches.push({ item, variant: matchedVariant });
      }
    }

    if (insufficientItems.length > 0) {
      return {
        success: false,
        error: `Cannot transfer: Insufficient stock for ${insufficientItems.join("; ")}`,
      };
    }

    // --- REQUIREMENT 4: Transfer Behavior - ID Switching & Stock Reservation ---
    const newRegularOrderNumber = await resolveNextOrderNumber();
    const originalOrderNumber = order.orderNumber;

    meta.isPreOrder = false;
    meta.transferredFromPreOrderAt = new Date().toISOString();
    meta.originalPreOrderNumber = originalOrderNumber;
    const auditNote = `[TRANSFER] Order originally ${originalOrderNumber}, transferred to regular order ${newRegularOrderNumber} on ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })}.`;
    meta.note = meta.note ? `${meta.note}\n${auditNote}` : auditNote;

    await prisma.$transaction(async (tx) => {
      // 1. Decrement stock for confirmed/running order reservation
      for (const { item, variant } of variantMatches) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 2. Update order record in-place
      await tx.order.update({
        where: { id: order.id },
        data: {
          orderNumber: newRegularOrderNumber,
          isPreOrder: false,
          orderStatus: order.orderStatus === 9 ? 1 : order.orderStatus, // if preorder (9), move to pending (1)
          shippingAddressJson: JSON.stringify(meta),
        },
      });
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/pre-order");
    revalidatePath(`/order-confirmation/${newRegularOrderNumber}`);

    return {
      success: true,
      newOrderNumber: newRegularOrderNumber,
    };
  } catch (error) {
    console.error("transferToRegularOrderAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to transfer to regular order.",
    };
  }
}

/**
 * Transfer a Regular Pending Order to a Pre-Order:
 * 1. Checks that the order exists and is currently in "pending" status.
 *    Server-side validation strictly rejects if order status is anything other than pending (1).
 * 2. In an atomic transaction:
 *    - Assigns a NEW order number from the pre-order sequence (PRE-xxxxx).
 *    - Updates isPreOrder = true in database and inside shippingAddressJson metadata.
 *    - Updates orderStatus to 9 (preorder) or keeps pending flag.
 *    - Records audit log in the order note.
 * 3. Revalidates paths.
 */
export async function transferToPreOrderAction(
  orderIdentifier: string
): Promise<{ success: boolean; error?: string; newOrderNumber?: string }> {
  try {
    const cleanId = orderIdentifier.trim();
    const isUuid = cleanId.length === 36 && cleanId.includes("-");

    const order = await prisma.order.findFirst({
      where: isUuid ? { id: cleanId } : { orderNumber: cleanId },
      include: {
        customer: true,
        items: true,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found." };
    }

    // --- REQUIREMENT 5: Reverse Direction - Regular Pending Order -> Pre-Order ---
    // Server-side validation: ONLY allowed if order status is "pending" (1)
    if (order.orderStatus !== 1) {
      return {
        success: false,
        error: "Only orders in 'Pending' status can be transferred to Pre-Order.",
      };
    }

    let meta: Record<string, unknown> = {};
    try {
      if (order.shippingAddressJson) {
        meta = JSON.parse(order.shippingAddressJson);
      }
    } catch {
      /* ignore */
    }

    const isAlreadyPreOrder = Boolean(order.isPreOrder || meta.isPreOrder);
    if (isAlreadyPreOrder) {
      return { success: false, error: "This order is already a pre-order." };
    }

    const newPreOrderNumber = await resolveNextPreOrderNumber();
    const originalRegularNumber = order.orderNumber;

    meta.isPreOrder = true;
    meta.transferredToPreOrderAt = new Date().toISOString();
    meta.originalRegularOrderNumber = originalRegularNumber;
    const auditNote = `[TRANSFER] Order originally ${originalRegularNumber}, transferred to pre-order ${newPreOrderNumber} on ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })}.`;
    meta.note = meta.note ? `${meta.note}\n${auditNote}` : auditNote;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          orderNumber: newPreOrderNumber,
          isPreOrder: true,
          orderStatus: 9, // PreOrder status enum
          shippingAddressJson: JSON.stringify(meta),
        },
      });
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/pre-order");
    revalidatePath(`/order-confirmation/${newPreOrderNumber}`);

    return {
      success: true,
      newOrderNumber: newPreOrderNumber,
    };
  } catch (error) {
    console.error("transferToPreOrderAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to transfer to pre-order.",
    };
  }
}

export interface ReturnedItemInput {
  slug: string;
  name: string;
  size?: string;
  returnQty: number;
}

export interface ProcessOrderReturnPayload {
  orderIdentifier: string;
  returnType: "full" | "partial" | "reject";
  restockInventory: boolean;
  returnedItems: ReturnedItemInput[];
  reason?: string;
  actorName?: string;
}

export interface ProcessOrderReturnResult {
  success: boolean;
  error?: string;
  newStatus?: string;
  newTotalAmount?: number;
  newDueAmount?: number;
  refundAmount?: number;
  returnedItemsCount?: number;
  restockedCount?: number;
}

/**
 * Processes an order return (Full, Partial, or Reject) in a single atomic Prisma transaction.
 * 1. Item-wise Partial Return: Only checked items and specified quantities are returned.
 * 2. Auto-Restock: If restockInventory = true, increments stock in ProductVariant by returnedQty. If false, skips.
 * 3. Financial Recalculation:
 *    - Returned goods value = sum(unitPrice * returnQty).
 *    - Delivery fee is strictly non-refundable (kept in order total).
 *    - Order total = remaining goods + delivery fee.
 *    - Recalculates Paid vs Due vs Refund amount.
 * 4. Status update:
 *    - Full return: status = 10 ('return')
 *    - Partial return: status = 13 ('return-process') or 10 ('return')
 *    - Reject: leaves status unchanged, appends audit note.
 */
export async function processOrderReturnAction(
  payload: ProcessOrderReturnPayload
): Promise<ProcessOrderReturnResult> {
  try {
    const {
      orderIdentifier,
      returnType,
      restockInventory,
      returnedItems = [],
      reason = "",
      actorName = "Staff",
    } = payload;

    const cleanId = orderIdentifier.trim();
    const whereCondition =
      cleanId.length === 36 && cleanId.includes("-")
        ? { id: cleanId }
        : { orderNumber: cleanId };

    const order = await prisma.order.findFirst({
      where: whereCondition,
      include: {
        customer: true,
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
      return { success: false, error: "Order not found" };
    }

    // CASE 1: REJECT RETURN
    if (returnType === "reject") {
      let meta: Record<string, unknown> = {};
      try {
        if (order.shippingAddressJson) meta = JSON.parse(order.shippingAddressJson);
      } catch {
        /* ignore */
      }

      const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
      const rejectNote = `[RETURN REJECTED] Return request rejected on ${timestamp} by ${actorName}. Reason: ${reason || "No reason given"}.`;
      meta.note = meta.note ? `${meta.note}\n${rejectNote}` : rejectNote;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          shippingAddressJson: JSON.stringify(meta),
        },
      });

      revalidatePath("/admin/orders");
      return {
        success: true,
        newStatus: STATUS_MAP_INT_TO_STR[order.orderStatus] || "confirmed",
        newTotalAmount: Number(order.totalAmount),
        newDueAmount: Math.max(0, Number(order.totalAmount) - (order.paymentStatus === 2 ? Number(order.totalAmount) : 0)),
        refundAmount: 0,
        returnedItemsCount: 0,
        restockedCount: 0,
      };
    }

    // Validate items to return
    if (returnedItems.length === 0) {
      return { success: false, error: "Please select at least one item to return." };
    }

    // Execute everything in a single atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      let totalReturnedMerchandiseValue = 0;
      let totalRestockedQty = 0;
      const returnedSummaryList: string[] = [];

      for (const retItem of returnedItems) {
        if (retItem.returnQty <= 0) continue;

        // Find corresponding line item in order
        const lineItem = order.items.find((i) => {
          const rawName = (i.productName || "").toLowerCase();
          const matchTarget = retItem.name.toLowerCase();
          return (
            i.product?.slug === retItem.slug ||
            rawName.includes(matchTarget) ||
            matchTarget.includes(rawName)
          );
        });

        if (!lineItem) continue;

        const effectiveReturnQty = Math.min(retItem.returnQty, lineItem.quantity);
        const unitPrice = Number(lineItem.unitPrice) || 0;
        const lineReturnValue = unitPrice * effectiveReturnQty;
        totalReturnedMerchandiseValue += lineReturnValue;

        returnedSummaryList.push(`${lineItem.productName} x ${effectiveReturnQty} (৳${lineReturnValue})`);

        // If Restock Inventory is checked, increment stock on matching ProductVariant
        if (restockInventory && lineItem.product && lineItem.product.variants.length > 0) {
          let variant = lineItem.variantId
            ? lineItem.product.variants.find((v) => v.id === lineItem.variantId)
            : null;

          if (!variant) {
            const sizeMatch = lineItem.productName.match(/\(([^)]+)\)$/);
            const sizeName = retItem.size || (sizeMatch ? sizeMatch[1].trim() : "");
            if (sizeName) {
              variant = lineItem.product.variants.find(
                (v) =>
                  v.name.replace(/^Size:\s*/i, "").trim().toLowerCase() === sizeName.toLowerCase() ||
                  v.name.toLowerCase().includes(sizeName.toLowerCase())
              );
            }
          }

          if (variant) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                stockQuantity: {
                  increment: effectiveReturnQty,
                },
              },
            });
            totalRestockedQty += effectiveReturnQty;
          }
        }
      }

      // Financial Recalculation:
      // Delivery charge is strictly non-refundable (excluded from return refund)
      const shippingFee = Number(order.shippingFee) || 0;
      const originalSubTotal = Number(order.subTotal) || 0;
      const originalDiscount = Number(order.discountAmount) || 0;
      const originalTotal = Number(order.totalAmount) || 0;

      // New subtotal after removing returned merchandise
      const newSubTotal = Math.max(0, originalSubTotal - totalReturnedMerchandiseValue);
      // New total retains shipping fee
      const newTotalAmount = returnType === "full"
        ? shippingFee // If full return, customer still owes delivery fee, goods value becomes 0
        : Math.max(shippingFee, newSubTotal + shippingFee - originalDiscount);

      // Determine Paid vs Due vs Refund
      const wasPaid = order.paymentStatus === 2;
      const paidAmount = wasPaid ? originalTotal : 0;

      let refundAmount = 0;
      let newDueAmount = 0;

      if (paidAmount > newTotalAmount) {
        refundAmount = paidAmount - newTotalAmount;
        newDueAmount = 0;
      } else {
        newDueAmount = newTotalAmount - paidAmount;
        refundAmount = 0;
      }

      // Status resolution
      const targetStatusInt = returnType === "full" ? 10 : 13; // 10 = return, 13 = return-process

      // Update metadata & notes
      let meta: Record<string, unknown> = {};
      try {
        if (order.shippingAddressJson) meta = JSON.parse(order.shippingAddressJson);
      } catch {
        /* ignore */
      }

      const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
      const returnAudit = [
        `[RETURN PROCESSED - ${returnType.toUpperCase()}] on ${timestamp} by ${actorName}`,
        `Items: ${returnedSummaryList.join(", ")}`,
        `Restocked: ${restockInventory ? `Yes (${totalRestockedQty} units)` : "No (damaged/skipped)"}`,
        `Returned Value: ৳${totalReturnedMerchandiseValue} (Delivery ৳${shippingFee} retained)`,
        `New Total: ৳${newTotalAmount}, ${refundAmount > 0 ? `Refund Due: ৳${refundAmount}` : `Remaining Due: ৳${newDueAmount}`}`,
        reason ? `Reason: ${reason}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      meta.note = meta.note ? `${meta.note}\n${returnAudit}` : returnAudit;
      meta.returnSummary = {
        returnType,
        restockInventory,
        returnedValue: totalReturnedMerchandiseValue,
        retainedDeliveryCharge: shippingFee,
        newTotal: newTotalAmount,
        refundAmount,
        newDueAmount,
        processedAt: new Date().toISOString(),
      };

      await tx.order.update({
        where: { id: order.id },
        data: {
          subTotal: newSubTotal,
          totalAmount: newTotalAmount,
          orderStatus: targetStatusInt,
          paymentStatus: refundAmount > 0 ? 1 : wasPaid ? 2 : 0,
          shippingAddressJson: JSON.stringify(meta),
        },
      });

      return {
        newStatus: STATUS_MAP_INT_TO_STR[targetStatusInt] || "return",
        newTotalAmount,
        newDueAmount,
        refundAmount,
        returnedItemsCount: returnedSummaryList.length,
        restockedCount: totalRestockedQty,
      };
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/bulk-shipment");

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    console.error("processOrderReturnAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process return.",
    };
  }
}

