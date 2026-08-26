"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ManualCourierProvider } from "@/lib/api/services/courier-provider.interface";

export interface EligibleOrderDto {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  district: string;
  area?: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: number;
  orderStatus: number;
  orderStatusLabel: string;
  createdAt: string;
  hasExistingShipment: boolean;
  shipmentStatus?: string | null;
  courierName?: string | null;
}

export interface ShipmentBatchDto {
  id: string;
  batchNumber: string;
  courierId: string;
  courierName: string;
  courierCode: string;
  status: string;
  totalOrders: number;
  totalShipmentValue: number;
  deliveredCount: number;
  inTransitCount: number;
  pendingCount: number;
  cancelledCount: number;
  returnedCount: number;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ShipmentDetailDto {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  district: string;
  area?: string;
  totalAmount: number;
  orderStatus: number;
  paymentMethod: string;
  courierId: string;
  courierName: string;
  shipmentBatchId: string;
  batchNumber: string;
  trackingNumber?: string | null;
  status: string;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  returnedAt?: string | null;
  returnReason?: string | null;
  cancelReason?: string | null;
  notes?: string | null;
  createdAt: string;
  history: Array<{
    id: string;
    previousStatus?: string | null;
    newStatus: string;
    note?: string | null;
    changedBy: string;
    source: string;
    changedAt: string;
  }>;
}

const STATUS_INT_TO_LABEL: Record<number, string> = {
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

export async function getEligibleOrdersForShipmentAction(): Promise<EligibleOrderDto[]> {
  try {
    // Orders that are Confirmed, Processing, Packed or Pending, and either have no active shipment OR no shipment at all
    const orders = await prisma.order.findMany({
      where: {
        orderStatus: { in: [1, 2, 6, 7] }, // Pending, Processing, Confirmed, Packed
      },
      include: {
        customer: true,
        shipment: {
          include: {
            courier: true,
          },
        },
      },
      orderBy: { createdAtUtc: "desc" },
    });

    return orders.map((o) => {
      let cleanAddress = o.shippingAddressJson || o.customer?.defaultAddress || "";
      let extractedDistrict = o.customer?.district || "Dhaka";
      let extractedArea = o.customer?.area || undefined;
      let paymentMethod = o.paymentStatus === 2 ? "Online Paid" : "Cash on Delivery";

      if (o.shippingAddressJson) {
        try {
          const parsed = JSON.parse(o.shippingAddressJson);
          if (parsed.address) cleanAddress = parsed.address;
          if (parsed.city) extractedDistrict = parsed.city;
          if (parsed.area) extractedArea = parsed.area;
          if (parsed.paymentMethod) paymentMethod = parsed.paymentMethod;
        } catch {
          /* ignore */
        }
      }

      const activeShipmentStatuses = ["assigned", "ready_to_ship", "shipped", "in_transit"];
      const hasActiveShipment = !!o.shipment && activeShipmentStatuses.includes(o.shipment.status);

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customer?.fullName || "Customer",
        phone: o.customer?.phone || "",
        address: cleanAddress,
        district: extractedDistrict,
        area: extractedArea,
        totalAmount: Number(o.totalAmount) || 0,
        paymentMethod,
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
        orderStatusLabel: STATUS_INT_TO_LABEL[o.orderStatus] || "pending",
        createdAt: o.createdAtUtc.toISOString(),
        hasExistingShipment: hasActiveShipment,
        shipmentStatus: o.shipment?.status || null,
        courierName: o.shipment?.courier?.name || null,
      };
    });
  } catch (error) {
    console.error("getEligibleOrdersForShipmentAction failed:", error);
    return [];
  }
}

export async function createBulkShipmentBatchAction(data: {
  orderIds: string[];
  courierId: string;
  notes?: string;
  createdBy?: string;
}): Promise<{ success: boolean; batchId?: string; batchNumber?: string; error?: string }> {
  try {
    if (!data.orderIds || data.orderIds.length === 0) {
      return { success: false, error: "Please select at least one order" };
    }

    const courier = await prisma.courier.findUnique({
      where: { id: data.courierId },
    });

    if (!courier) {
      return { success: false, error: "Selected courier not found" };
    }

    if (!courier.isActive) {
      return { success: false, error: "Selected courier is currently inactive and cannot accept shipments" };
    }

    // Verify orders exist, not cancelled, and not already in an active shipment
    const orders = await prisma.order.findMany({
      where: {
        id: { in: data.orderIds },
      },
      include: {
        customer: true,
        shipment: true,
      },
    });

    if (orders.length !== data.orderIds.length) {
      return { success: false, error: "One or more selected orders could not be found" };
    }

    const activeShipmentStatuses = ["assigned", "ready_to_ship", "shipped", "in_transit"];
    for (const o of orders) {
      if (o.orderStatus === 5) {
        return { success: false, error: `Order #${o.orderNumber} is cancelled and cannot be shipped` };
      }
      if (o.shipment && activeShipmentStatuses.includes(o.shipment.status)) {
        return {
          success: false,
          error: `Order #${o.orderNumber} is already assigned to active shipment (${o.shipment.status})`,
        };
      }
    }

    // Generate unique Batch Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const latestBatch = await prisma.shipmentBatch.findFirst({
      where: { batchNumber: { startsWith: `BATCH-${dateStr}` } },
      orderBy: { createdAtUtc: "desc" },
    });

    let nextSeq = 1;
    if (latestBatch) {
      const parts = latestBatch.batchNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }
    const batchNumber = `BATCH-${dateStr}-${String(nextSeq).padStart(3, "0")}`;

    const totalValue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const provider = new ManualCourierProvider(courier.code, courier.name);

    // Create Batch and Shipments in transaction
    const createdBatch = await prisma.$transaction(async (tx) => {
      const batch = await tx.shipmentBatch.create({
        data: {
          batchNumber,
          courierId: courier.id,
          status: "processing",
          totalOrders: orders.length,
          totalShipmentValue: totalValue,
          notes: data.notes?.trim() || null,
          createdBy: data.createdBy || "Admin",
        },
      });

      for (const ord of orders) {
        // If order previously had a cancelled/returned shipment, delete old one or update
        if (ord.shipment) {
          await tx.shipment.delete({ where: { id: ord.shipment.id } });
        }

        // Generate tracking via provider
        let cleanAddress = ord.shippingAddressJson || ord.customer?.defaultAddress || "";
        try {
          const parsed = JSON.parse(ord.shippingAddressJson);
          if (parsed.address) cleanAddress = parsed.address;
        } catch {
          /* ignore */
        }

        const consignment = await provider.createConsignment({
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          customerName: ord.customer?.fullName || "Customer",
          customerPhone: ord.customer?.phone || "",
          deliveryAddress: cleanAddress,
          district: ord.customer?.district || "Dhaka",
          amountToCollect: Number(ord.totalAmount) || 0,
        });

        const shipment = await tx.shipment.create({
          data: {
            orderId: ord.id,
            courierId: courier.id,
            shipmentBatchId: batch.id,
            trackingNumber: consignment.trackingNumber || null,
            status: "assigned",
          },
        });

        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId: shipment.id,
            previousStatus: null,
            newStatus: "assigned",
            note: `Assigned to ${courier.name} under batch ${batchNumber}`,
            changedBy: data.createdBy || "Admin",
            source: "manual",
          },
        });

        // If order is pending, progress order status to Processing (2) or Packed (7)
        if (ord.orderStatus === 1 || ord.orderStatus === 6) {
          await tx.order.update({
            where: { id: ord.id },
            data: { orderStatus: 2 }, // Processing
          });
        }
      }

      return batch;
    });

    revalidatePath("/admin/bulk-shipment");
    revalidatePath("/admin/orders");

    return {
      success: true,
      batchId: createdBatch.id,
      batchNumber: createdBatch.batchNumber,
    };
  } catch (error) {
    console.error("createBulkShipmentBatchAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create shipment batch" };
  }
}

export async function getShipmentBatchesAction(): Promise<ShipmentBatchDto[]> {
  try {
    const batches = await prisma.shipmentBatch.findMany({
      include: {
        courier: true,
        shipments: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAtUtc: "desc" },
    });

    return batches.map((b) => {
      let delivered = 0;
      let inTransit = 0;
      let pending = 0;
      let cancelled = 0;
      let returned = 0;

      for (const s of b.shipments) {
        if (s.status === "delivered") delivered++;
        else if (s.status === "in_transit" || s.status === "shipped") inTransit++;
        else if (s.status === "cancelled") cancelled++;
        else if (s.status === "returned" || s.status === "failed_delivery") returned++;
        else pending++;
      }

      return {
        id: b.id,
        batchNumber: b.batchNumber,
        courierId: b.courierId,
        courierName: b.courier.name,
        courierCode: b.courier.code,
        status: b.status,
        totalOrders: b.totalOrders,
        totalShipmentValue: Number(b.totalShipmentValue) || 0,
        deliveredCount: delivered,
        inTransitCount: inTransit,
        pendingCount: pending,
        cancelledCount: cancelled,
        returnedCount: returned,
        notes: b.notes,
        createdBy: b.createdBy,
        createdAt: b.createdAtUtc.toISOString(),
      };
    });
  } catch (error) {
    console.error("getShipmentBatchesAction failed:", error);
    return [];
  }
}

export async function getShipmentBatchDetailsAction(batchId: string): Promise<{
  batch: ShipmentBatchDto | null;
  shipments: ShipmentDetailDto[];
}> {
  try {
    const batch = await prisma.shipmentBatch.findFirst({
      where: {
        OR: [{ id: batchId }, { batchNumber: batchId }],
      },
      include: {
        courier: true,
        shipments: {
          include: {
            order: {
              include: { customer: true },
            },
            courier: true,
            statusHistory: {
              orderBy: { changedAtUtc: "desc" },
            },
          },
          orderBy: { createdAtUtc: "asc" },
        },
      },
    });

    if (!batch) {
      return { batch: null, shipments: [] };
    }

    let delivered = 0;
    let inTransit = 0;
    let pending = 0;
    let cancelled = 0;
    let returned = 0;

    const shipments: ShipmentDetailDto[] = batch.shipments.map((s) => {
      if (s.status === "delivered") delivered++;
      else if (s.status === "in_transit" || s.status === "shipped") inTransit++;
      else if (s.status === "cancelled") cancelled++;
      else if (s.status === "returned" || s.status === "failed_delivery") returned++;
      else pending++;

      let cleanAddress = s.order.shippingAddressJson || s.order.customer?.defaultAddress || "";
      let extractedDistrict = s.order.customer?.district || "Dhaka";
      let extractedArea = s.order.customer?.area || undefined;
      let paymentMethod = s.order.paymentStatus === 2 ? "Online Paid" : "Cash on Delivery";

      if (s.order.shippingAddressJson) {
        try {
          const parsed = JSON.parse(s.order.shippingAddressJson);
          if (parsed.address) cleanAddress = parsed.address;
          if (parsed.city) extractedDistrict = parsed.city;
          if (parsed.area) extractedArea = parsed.area;
          if (parsed.paymentMethod) paymentMethod = parsed.paymentMethod;
        } catch {
          /* ignore */
        }
      }

      return {
        id: s.id,
        orderId: s.orderId,
        orderNumber: s.order.orderNumber,
        customerName: s.order.customer?.fullName || "Customer",
        customerPhone: s.order.customer?.phone || "",
        customerAddress: cleanAddress,
        district: extractedDistrict,
        area: extractedArea,
        totalAmount: Number(s.order.totalAmount) || 0,
        orderStatus: s.order.orderStatus,
        paymentMethod,
        courierId: s.courierId,
        courierName: s.courier.name,
        shipmentBatchId: s.shipmentBatchId,
        batchNumber: batch.batchNumber,
        trackingNumber: s.trackingNumber,
        status: s.status,
        shippedAt: s.shippedAtUtc ? s.shippedAtUtc.toISOString() : null,
        deliveredAt: s.deliveredAtUtc ? s.deliveredAtUtc.toISOString() : null,
        cancelledAt: s.cancelledAtUtc ? s.cancelledAtUtc.toISOString() : null,
        returnedAt: s.returnedAtUtc ? s.returnedAtUtc.toISOString() : null,
        returnReason: s.returnReason,
        cancelReason: s.cancelReason,
        notes: s.notes,
        createdAt: s.createdAtUtc.toISOString(),
        history: s.statusHistory.map((h) => ({
          id: h.id,
          previousStatus: h.previousStatus,
          newStatus: h.newStatus,
          note: h.note,
          changedBy: h.changedBy,
          source: h.source,
          changedAt: h.changedAtUtc.toISOString(),
        })),
      };
    });

    const batchDto: ShipmentBatchDto = {
      id: batch.id,
      batchNumber: batch.batchNumber,
      courierId: batch.courierId,
      courierName: batch.courier.name,
      courierCode: batch.courier.code,
      status: batch.status,
      totalOrders: batch.totalOrders,
      totalShipmentValue: Number(batch.totalShipmentValue) || 0,
      deliveredCount: delivered,
      inTransitCount: inTransit,
      pendingCount: pending,
      cancelledCount: cancelled,
      returnedCount: returned,
      notes: batch.notes,
      createdBy: batch.createdBy,
      createdAt: batch.createdAtUtc.toISOString(),
    };

    return { batch: batchDto, shipments };
  } catch (error) {
    console.error("getShipmentBatchDetailsAction failed:", error);
    return { batch: null, shipments: [] };
  }
}

export async function updateShipmentStatusAction(data: {
  shipmentId: string;
  newStatus: string;
  note?: string;
  trackingNumber?: string;
  returnReason?: string;
  cancelReason?: string;
  changedBy?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: data.shipmentId },
      include: { order: true },
    });

    if (!shipment) {
      return { success: false, error: "Shipment record not found" };
    }

    const previousStatus = shipment.status;
    const cleanStatus = data.newStatus.trim().toLowerCase();

    // Valid statuses: pending, assigned, ready_to_ship, shipped, in_transit, delivered, cancelled, returned, failed_delivery
    const validStatuses = [
      "pending",
      "assigned",
      "ready_to_ship",
      "shipped",
      "in_transit",
      "delivered",
      "cancelled",
      "returned",
      "failed_delivery",
    ];

    if (!validStatuses.includes(cleanStatus)) {
      return { success: false, error: `Invalid shipment status: ${data.newStatus}` };
    }

    const updateData: {
      status: string;
      trackingNumber?: string | null;
      shippedAtUtc?: Date | null;
      deliveredAtUtc?: Date | null;
      cancelledAtUtc?: Date | null;
      returnedAtUtc?: Date | null;
      returnReason?: string | null;
      cancelReason?: string | null;
      notes?: string | null;
    } = {
      status: cleanStatus,
    };

    if (data.trackingNumber !== undefined) {
      updateData.trackingNumber = data.trackingNumber.trim() || null;
    }

    const now = new Date();
    if (cleanStatus === "shipped" && !shipment.shippedAtUtc) updateData.shippedAtUtc = now;
    if (cleanStatus === "delivered") updateData.deliveredAtUtc = now;
    if (cleanStatus === "cancelled") {
      updateData.cancelledAtUtc = now;
      updateData.cancelReason = data.cancelReason || data.note || null;
    }
    if (cleanStatus === "returned" || cleanStatus === "failed_delivery") {
      updateData.returnedAtUtc = now;
      updateData.returnReason = data.returnReason || data.note || null;
    }

    await prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: data.shipmentId },
        data: updateData,
      });

      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: data.shipmentId,
          previousStatus,
          newStatus: cleanStatus,
          note: data.note || data.returnReason || data.cancelReason || `Status updated to ${cleanStatus}`,
          changedBy: data.changedBy || "Admin",
          source: "manual",
        },
      });

      // Synchronize Order status where appropriate
      if (cleanStatus === "delivered") {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { orderStatus: 4, paymentStatus: 2 }, // Delivered & Paid
        });
      } else if (cleanStatus === "shipped") {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { orderStatus: 3 }, // Shipped
        });
      } else if (cleanStatus === "returned") {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { orderStatus: 10 }, // Return
        });
      } else if (cleanStatus === "cancelled") {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { orderStatus: 5 }, // Cancelled
        });
      }
    });

    revalidatePath("/admin/bulk-shipment");
    revalidatePath("/admin/orders");

    return { success: true };
  } catch (error) {
    console.error("updateShipmentStatusAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update shipment status" };
  }
}

export async function updateTrackingNumberAction(
  shipmentId: string,
  trackingNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.shipment.update({
      where: { id: shipmentId },
      data: { trackingNumber: trackingNumber.trim() || null },
    });

    revalidatePath("/admin/bulk-shipment");
    return { success: true };
  } catch (error) {
    console.error("updateTrackingNumberAction failed:", error);
    return { success: false, error: "Failed to update tracking number" };
  }
}
