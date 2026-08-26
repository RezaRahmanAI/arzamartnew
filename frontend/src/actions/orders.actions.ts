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

  // 2. Query highest orderNumber in database
  const latestOrder = await prisma.order.findFirst({
    orderBy: { createdAtUtc: "desc" },
    select: { orderNumber: true },
  });

  if (latestOrder?.orderNumber) {
    const numPart = parseInt(latestOrder.orderNumber.replace(/\D/g, ""), 10);
    if (!isNaN(numPart) && numPart >= nextNum) {
      nextNum = numPart + 1;
    }
  }

  return `${prefix}${nextNum}`;
}

export async function getOrdersAction(): Promise<{ orders: Order[]; incomplete: Order[] }> {
  try {
    return await getAllOrders();
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
  try {
    const cleanPhone = (input.phone || "").trim().replace(/\D/g, "");
    if (!cleanPhone) {
      return { success: false, error: "Phone number is required." };
    }

    // 1. Find or create Customer
    let customer = await prisma.customer.findFirst({
      where: { phone: cleanPhone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          fullName: input.customer || "Guest Customer",
          email: `${cleanPhone.replace(/\+/g, "")}@customer.local`,
          phone: cleanPhone,
          defaultAddress: input.address || "Dhaka",
          district: input.city || "Dhaka",
          area: input.area || null,
          isGuest: true,
        },
      });
    } else {
      // Update customer info if missing
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          fullName: input.customer && input.customer !== "Customer" ? input.customer : customer.fullName,
          defaultAddress: input.address || customer.defaultAddress,
          district: input.city || customer.district,
          area: input.area || customer.area,
        },
      });
    }

    // 2. Resolve order number
    const orderNumber = await resolveNextOrderNumber();

    // 3. Resolve subTotal, discount, delivery
    const subTotal = input.items.reduce((acc, item) => acc + (item.price || 0) * (item.qty || 1), 0);
    const shippingFee = input.delivery ?? 0;
    const totalAmount = input.total || subTotal + shippingFee;
    const discountAmount = Math.max(0, subTotal + shippingFee - totalAmount);

    // 4. Validate items against actual stock & calculate isPreOrder
    let calculatedIsPreOrder = false;

    for (const item of input.items) {
      const prod = await prisma.product.findFirst({
        where: {
          OR: [{ slug: item.slug }, { name: item.name }],
        },
        include: { variants: true },
      });

      if (!prod || !prod.isActive) {
        return {
          success: false,
          error: `Product "${item.name}" is currently inactive or unavailable.`,
        };
      }

      const acceptsPreOrder = prod.badge?.includes("PREORDER_ENABLED") ?? false;
      let availableStock = 15;

      if (item.size && prod.variants.length > 0) {
        const variant = prod.variants.find((v) =>
          v.name.replace(/^Size:\s*/i, "").trim().toLowerCase() === item.size!.trim().toLowerCase()
        );
        if (variant) {
          availableStock = variant.stockQuantity;
        } else {
          // If variant wasn't found by exact name, look for substring
          const partialVariant = prod.variants.find((v) => v.name.includes(item.size!));
          if (partialVariant) availableStock = partialVariant.stockQuantity;
        }
      }

      const requestedQty = item.qty || 1;

      if (availableStock < requestedQty) {
        if (acceptsPreOrder) {
          // Allowed: will be classified as Pre-Order
          calculatedIsPreOrder = true;
        } else {
          // Blocked: Stock out & AcceptPreOrder = false
          return {
            success: false,
            error: `"${item.name} (${item.size || "Standard"})" is Out of Stock.`,
          };
        }
      }
    }

    const fullAddressJson = JSON.stringify({
      address: input.address,
      city: input.city,
      area: input.area || "",
      note: input.note || "",
      paymentMethod: input.payment || "Cash on Delivery",
      isPreOrder: calculatedIsPreOrder,
    });

    const statusInt = STATUS_MAP_STR_TO_INT[input.status || "pending"] ?? 1;

    // 5. Create Order & OrderItems in a transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
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
        },
      });

      for (const item of input.items) {
        // Find product by slug or name
        const product = await tx.product.findFirst({
          where: {
            OR: [{ slug: item.slug }, { name: item.name }],
          },
          include: { variants: true },
        });

        const productId = product?.id;
        if (productId) {
          let matchedVariantId: string | undefined = undefined;
          if (item.size && product.variants.length > 0) {
            const v = product.variants.find(
              (varItem) =>
                varItem.name.replace(/^Size:\s*/i, "").trim().toLowerCase() === item.size!.trim().toLowerCase()
            );
            if (v) matchedVariantId = v.id;
          }

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
      }

      // 6. Deduct available stock only if confirmed AND not pre-order stock deficit
      if (input.status === "confirmed") {
        for (const item of input.items) {
          const prod = await tx.product.findFirst({
            where: { OR: [{ slug: item.slug }, { name: item.name }] },
            include: { variants: true },
          });

          if (prod && item.size && prod.variants.length > 0) {
            const variant = prod.variants.find(
              (v) => v.name.replace(/^Size:\s*/i, "").trim().toLowerCase() === item.size!.trim().toLowerCase()
            );
            if (variant && variant.stockQuantity >= item.qty) {
              await tx.productVariant.update({
                where: { id: variant.id },
                data: { stockQuantity: { decrement: item.qty } },
              });
            }
          }
        }
      }

      return ord;
    });

    // 6. Delete from Incomplete Orders if exists
    await prisma.incompleteOrder.deleteMany({
      where: { phone: cleanPhone },
    });

    // Revalidate paths for instant Next.js update
    revalidatePath("/admin/orders");
    revalidatePath("/admin/incomplete");
    revalidatePath("/orders");

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

      // Stock deduction on transition to confirmed (6) or shipped (3)
      if ((statusInt === 6 || statusInt === 3) && previousStatus !== 6 && previousStatus !== 3) {
        for (const item of order.items) {
          if (item.product && item.product.variants.length > 0) {
            // Check size pattern in product name
            const sizeMatch = item.productName.match(/\(([^)]+)\)$/);
            const sizeName = sizeMatch ? sizeMatch[1] : null;
            if (sizeName) {
              const variant = item.product.variants.find((v) => v.name.includes(sizeName));
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
      }

      // Restock on cancel (5) or return (10)
      if ((statusInt === 5 || statusInt === 10) && previousStatus !== 5 && previousStatus !== 10) {
        for (const item of order.items) {
          if (item.product && item.product.variants.length > 0) {
            const sizeMatch = item.productName.match(/\(([^)]+)\)$/);
            const sizeName = sizeMatch ? sizeMatch[1] : null;
            if (sizeName) {
              const variant = item.product.variants.find((v) => v.name.includes(sizeName));
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

export async function removeIncompleteOrderAction(orderId: string): Promise<{ success: boolean }> {
  try {
    const cleanId = orderId.trim();
    const deleteConditions: Array<{ orderId?: string; id?: string }> = [{ orderId: cleanId }];
    if (cleanId.length === 36 && cleanId.includes("-")) {
      deleteConditions.push({ id: cleanId });
    }

    await prisma.incompleteOrder.deleteMany({
      where: {
        OR: deleteConditions,
      },
    });
    revalidatePath("/admin/incomplete");
    return { success: true };
  } catch (error) {
    console.error("removeIncompleteOrderAction failed:", error);
    return { success: false };
  }
}
