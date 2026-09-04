"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCourierProvider } from "@/lib/api/services/courier-services";
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

export interface FailedSyncItemDto {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  district: string;
  errorMessage: string;
  failedAt: string;
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
  syncedCount: number;
  errorCount: number;
  errorItems?: FailedSyncItemDto[];
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
      if (o.orderStatus === 1) {
        return {
          success: false,
          error: `Order #${o.orderNumber} is still in "Pending" status. Please confirm the order first before assigning to courier.`,
        };
      }
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

    const provider = getCourierProvider(courier.code, courier.name);

    // Calculate total shipment value
    const totalValue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    // Track consignment sync results per order
    const failedSyncItems: FailedSyncItemDto[] = [];
    let syncedCount = 0;

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
        // If order previously had a cancelled/returned shipment, delete old one
        if (ord.shipment) {
          await tx.shipment.delete({ where: { id: ord.shipment.id } });
        }

        // Generate tracking via provider
        let cleanAddress = ord.shippingAddressJson || ord.customer?.defaultAddress || "";
        let extractedDistrict = ord.customer?.district || "Dhaka";
        try {
          const parsed = JSON.parse(ord.shippingAddressJson);
          if (parsed.address) cleanAddress = parsed.address;
          if (parsed.city) extractedDistrict = parsed.city;
        } catch {
          /* ignore */
        }

        let consignmentTracking: string | null = null;
        const shipmentStatus = "assigned";
        let historyNote = `Assigned to ${courier.name} under batch ${batchNumber}`;

        try {
          const consignment = await provider.createConsignment({
            orderId: ord.id,
            orderNumber: ord.orderNumber,
            customerName: ord.customer?.fullName || "Customer",
            customerPhone: ord.customer?.phone || "",
            deliveryAddress: cleanAddress,
            district: extractedDistrict,
            amountToCollect: Number(ord.totalAmount) || 0,
          });

          if (consignment.success && consignment.trackingNumber) {
            consignmentTracking = consignment.trackingNumber;
            syncedCount++;
            historyNote = `Successfully synced with ${courier.name}. Tracking: ${consignment.trackingNumber}`;
          } else {
            const errReason = consignment.error || `${courier.name} validation failed for order #${ord.orderNumber}`;
            failedSyncItems.push({
              orderId: ord.id,
              orderNumber: ord.orderNumber,
              customerName: ord.customer?.fullName || "Customer",
              customerPhone: ord.customer?.phone || "",
              customerAddress: cleanAddress,
              district: extractedDistrict,
              errorMessage: errReason,
              failedAt: new Date().toISOString(),
            });
            historyNote = `Courier Sync Failed: ${errReason}`;
          }
        } catch (consignmentErr) {
          const errReason = consignmentErr instanceof Error ? consignmentErr.message : "Courier API error";
          failedSyncItems.push({
            orderId: ord.id,
            orderNumber: ord.orderNumber,
            customerName: ord.customer?.fullName || "Customer",
            customerPhone: ord.customer?.phone || "",
            customerAddress: cleanAddress,
            district: extractedDistrict,
            errorMessage: `${courier.name} Exception: ${errReason}`,
            failedAt: new Date().toISOString(),
          });
          historyNote = `Courier Sync Error: ${errReason}`;
        }

        const shipment = await tx.shipment.create({
          data: {
            orderId: ord.id,
            courierId: courier.id,
            shipmentBatchId: batch.id,
            trackingNumber: consignmentTracking,
            status: shipmentStatus,
            notes: failedSyncItems.some((f) => f.orderId === ord.id)
              ? `[SYNC_ERROR] ${failedSyncItems.find((f) => f.orderId === ord.id)?.errorMessage}`
              : null,
          },
        });

        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId: shipment.id,
            previousStatus: null,
            newStatus: shipmentStatus,
            note: historyNote,
            changedBy: data.createdBy || "Admin",
            source: "manual",
          },
        });

        // Progress order status to Processing (2) or Packed (7)
        if (ord.orderStatus === 1 || ord.orderStatus === 6) {
          await tx.order.update({
            where: { id: ord.id },
            data: { orderStatus: 2 }, // Processing
          });
        }
      }

      // If any failed sync items exist, store them in the batch notes as structured JSON
      if (failedSyncItems.length > 0) {
        const syncMeta = {
          userNotes: data.notes?.trim() || null,
          failedSyncItems,
          syncedCount,
          errorCount: failedSyncItems.length,
          lastSyncAt: new Date().toISOString(),
        };
        await tx.shipmentBatch.update({
          where: { id: batch.id },
          data: {
            notes: JSON.stringify(syncMeta),
          },
        });
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

      let cleanNotes = b.notes;
      let errorCount = 0;
      let syncedCount = 0;
      let errorItems: FailedSyncItemDto[] = [];

      if (b.notes && b.notes.startsWith("{") && b.notes.includes("failedSyncItems")) {
        try {
          const parsed = JSON.parse(b.notes);
          cleanNotes = parsed.userNotes || null;
          errorCount = Number(parsed.errorCount) || 0;
          syncedCount = Number(parsed.syncedCount) || 0;
          errorItems = parsed.failedSyncItems || [];
        } catch {
          /* ignore */
        }
      } else {
        // Fallback: if not parsed from JSON, synced is any shipment with a tracking number
        syncedCount = b.shipments.filter((s: { status: string }) => s.status !== "assigned" || false).length;
      }

      // If syncedCount is 0, compute count of non-failed shipments
      if (syncedCount === 0 && b.totalOrders > 0) {
        syncedCount = Math.max(0, b.totalOrders - errorCount);
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
        syncedCount,
        errorCount,
        errorItems,
        notes: cleanNotes,
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

    let cleanNotes = batch.notes;
    let errorCount = 0;
    let syncedCount = 0;
    let errorItems: FailedSyncItemDto[] = [];

    if (batch.notes && batch.notes.startsWith("{") && batch.notes.includes("failedSyncItems")) {
      try {
        const parsed = JSON.parse(batch.notes);
        cleanNotes = parsed.userNotes || null;
        errorCount = Number(parsed.errorCount) || 0;
        syncedCount = Number(parsed.syncedCount) || 0;
        errorItems = parsed.failedSyncItems || [];
      } catch {
        /* ignore */
      }
    } else {
      syncedCount = shipments.filter((s) => s.trackingNumber).length;
    }

    if (syncedCount === 0 && batch.totalOrders > 0) {
      syncedCount = Math.max(0, batch.totalOrders - errorCount);
    }

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
      syncedCount,
      errorCount,
      errorItems,
      notes: cleanNotes,
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

/**
 * Retries courier synchronization for a SINGLE order in a shipment batch.
 * 1. Updates corrected customer information (name, phone, address, district) in DB.
 * 2. Invokes courier provider createConsignment for ONLY this order.
 * 3. On success: attaches tracking number, removes from batch errorItems, increments syncedCount, decrements errorCount.
 * 4. On failure: updates the errorMessage in the batch error list with the new failure reason.
 */
export async function retrySingleOrderCourierSyncAction(payload: {
  batchId: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  district?: string;
}): Promise<{
  success: boolean;
  trackingNumber?: string;
  error?: string;
  updatedErrorCount?: number;
  updatedSyncedCount?: number;
}> {
  try {
    const { batchId, orderId, customerName, customerPhone, customerAddress, district = "Dhaka" } = payload;

    // 1. Fetch batch and courier
    const batch = await prisma.shipmentBatch.findFirst({
      where: { OR: [{ id: batchId }, { batchNumber: batchId }] },
      include: { courier: true },
    });

    if (!batch) {
      return { success: false, error: "Shipment batch not found" };
    }

    // 2. Fetch order and shipment
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        shipment: true,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // 3. Update customer details and order shippingAddressJson in database
    const cleanPhone = customerPhone.trim().replace(/\D/g, "");
    let existingMeta: Record<string, unknown> = {};
    try {
      if (order.shippingAddressJson) {
        existingMeta = JSON.parse(order.shippingAddressJson);
      }
    } catch {
      /* ignore */
    }

    const updatedMeta = {
      ...existingMeta,
      address: customerAddress.trim(),
      city: district.trim(),
    };

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          shippingAddressJson: JSON.stringify(updatedMeta),
        },
      });

      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            fullName: customerName.trim() || order.customer?.fullName,
            phone: cleanPhone || order.customer?.phone,
            defaultAddress: customerAddress.trim() || order.customer?.defaultAddress,
            district: district.trim() || order.customer?.district,
          },
        });
      }
    });

    // 4. Invoke Courier Provider for ONLY this single order
    const provider = getCourierProvider(batch.courier.code, batch.courier.name);
    const consignment = await provider.createConsignment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      deliveryAddress: customerAddress.trim(),
      district: district.trim(),
      amountToCollect: Number(order.totalAmount) || 0,
    });

    // Parse existing batch sync metadata
    let syncMeta: {
      userNotes?: string | null;
      failedSyncItems: FailedSyncItemDto[];
      syncedCount: number;
      errorCount: number;
      lastSyncAt: string;
    } = {
      userNotes: batch.notes,
      failedSyncItems: [],
      syncedCount: 0,
      errorCount: 0,
      lastSyncAt: new Date().toISOString(),
    };

    if (batch.notes && batch.notes.startsWith("{") && batch.notes.includes("failedSyncItems")) {
      try {
        syncMeta = JSON.parse(batch.notes);
      } catch {
        /* ignore */
      }
    }

    if (consignment.success && consignment.trackingNumber) {
      // SUCCESS: Attach tracking, remove from error items, increment synced count
      await prisma.$transaction(async (tx) => {
        if (order.shipment) {
          await tx.shipment.update({
            where: { id: order.shipment.id },
            data: {
              trackingNumber: consignment.trackingNumber,
              notes: `[SYNC_OK] Successfully synced with ${batch.courier.name}`,
            },
          });

          await tx.shipmentStatusHistory.create({
            data: {
              shipmentId: order.shipment.id,
              previousStatus: order.shipment.status,
              newStatus: order.shipment.status,
              note: `Sync retry succeeded with ${batch.courier.name}. Tracking: ${consignment.trackingNumber}`,
              changedBy: "Admin",
              source: "manual",
            },
          });
        }

        // Update batch error list
        syncMeta.failedSyncItems = (syncMeta.failedSyncItems || []).filter((f) => f.orderId !== order.id);
        syncMeta.errorCount = syncMeta.failedSyncItems.length;
        syncMeta.syncedCount = (Number(syncMeta.syncedCount) || 0) + 1;
        syncMeta.lastSyncAt = new Date().toISOString();

        await tx.shipmentBatch.update({
          where: { id: batch.id },
          data: {
            notes: JSON.stringify(syncMeta),
          },
        });
      });

      revalidatePath("/admin/bulk-shipment");
      revalidatePath(`/admin/bulk-shipment/${batch.id}`);

      return {
        success: true,
        trackingNumber: consignment.trackingNumber,
        updatedErrorCount: syncMeta.errorCount,
        updatedSyncedCount: syncMeta.syncedCount,
      };
    } else {
      // FAILURE AGAIN: Update error reason in batch error list
      const newErrorMsg = consignment.error || `${batch.courier.name} rejected the updated consignment data.`;
      
      const existingIdx = (syncMeta.failedSyncItems || []).findIndex((f) => f.orderId === order.id);
      if (existingIdx >= 0) {
        syncMeta.failedSyncItems[existingIdx].errorMessage = newErrorMsg;
        syncMeta.failedSyncItems[existingIdx].failedAt = new Date().toISOString();
      } else {
        syncMeta.failedSyncItems.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: customerName.trim(),
          customerPhone: cleanPhone,
          customerAddress: customerAddress.trim(),
          district: district.trim(),
          errorMessage: newErrorMsg,
          failedAt: new Date().toISOString(),
        });
      }

      syncMeta.errorCount = syncMeta.failedSyncItems.length;
      syncMeta.lastSyncAt = new Date().toISOString();

      await prisma.shipmentBatch.update({
        where: { id: batch.id },
        data: {
          notes: JSON.stringify(syncMeta),
        },
      });

      return {
        success: false,
        error: newErrorMsg,
        updatedErrorCount: syncMeta.errorCount,
        updatedSyncedCount: syncMeta.syncedCount,
      };
    }
  } catch (error) {
    console.error("retrySingleOrderCourierSyncAction failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to retry courier sync",
    };
  }
}

export interface ScanOrderResult {
  status: "found" | "not_found" | "skipped";
  reason?: string;
  isDuplicate?: boolean;
  order?: {
    id: string;
    orderNumber: string;
    customerName: string;
    phone: string;
    address: string;
    district: string;
    totalAmount: number;
    dueAmount: number;
    paidAmount: number;
    orderStatus: number;
    orderStatusLabel: string;
    latestNote: string;
  };
}

/**
 * High-speed warehouse barcode/QR scanner lookup.
 * Rule 1: Only orders with status = "Packaging" (code 7 or 2) can be added.
 * Rule 2: Cannot be already Shipped (status 3) or duplicate in queue.
 */
export async function scanOrderForShipmentAction(
  rawCode: string,
  existingQueuedIds: string[] = []
): Promise<ScanOrderResult> {
  try {
    const queryCode = rawCode.trim();
    if (!queryCode) {
      return { status: "not_found", reason: "Empty scan code" };
    }

    const cleanNumeric = queryCode.replace(/\D/g, "");
    const isUuid = queryCode.length === 36 && queryCode.includes("-");

    // Search by exact orderNumber, with or without ORD- / PRE- prefix, or by id
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: queryCode }] : []),
          { orderNumber: queryCode },
          { orderNumber: `ORD-${queryCode}` },
          { orderNumber: `PRE-${queryCode}` },
          ...(cleanNumeric ? [{ orderNumber: { endsWith: cleanNumeric } }] : []),
        ],
      },
      include: {
        customer: true,
        shipment: {
          include: { courier: true },
        },
      },
    });

    if (!order) {
      return { status: "not_found", reason: `No order matched code: ${queryCode}` };
    }

    // Check duplicate in current scanning session queue
    if (existingQueuedIds.includes(order.id) || existingQueuedIds.includes(order.orderNumber)) {
      return {
        status: "skipped",
        reason: `Order #${order.orderNumber} is already in the current batch queue`,
        isDuplicate: true,
      };
    }

    // Check if order is already Shipped (status 3)
    if (order.orderStatus === 3) {
      return {
        status: "skipped",
        reason: `Order #${order.orderNumber} is already marked as Shipped`,
        isDuplicate: false,
      };
    }

    // Rule 1: Only orders with status = "Packaging" (code 7 = packed, or code 2 = processing) can be queued
    // In our system, status 7 = packed / packaging, status 2 = processing
    const PACKAGING_STATUS_CODES = [7, 2];
    if (!PACKAGING_STATUS_CODES.includes(order.orderStatus)) {
      const currentStatusName = STATUS_INT_TO_LABEL[order.orderStatus] || `Status ${order.orderStatus}`;
      return {
        status: "skipped",
        reason: `Wrong status: Order #${order.orderNumber} is currently "${currentStatusName}". Only "Packaging" orders can be queued.`,
        isDuplicate: false,
      };
    }

    // Extract address & notes
    let cleanAddress = order.shippingAddressJson || order.customer?.defaultAddress || "";
    let extractedDistrict = order.customer?.district || "Dhaka";
    let latestNote = "COD";
    let isPaid = order.paymentStatus === 2;

    if (order.shippingAddressJson) {
      try {
        const parsed = JSON.parse(order.shippingAddressJson);
        if (parsed.address) cleanAddress = parsed.address;
        if (parsed.city) extractedDistrict = parsed.city;
        if (parsed.note) latestNote = parsed.note;
        if (parsed.paymentMethod?.toLowerCase().includes("paid") || parsed.paid > 0) {
          isPaid = true;
        }
      } catch {
        /* ignore */
      }
    }

    const total = Number(order.totalAmount) || 0;
    const paid = isPaid ? total : 0;
    const due = Math.max(0, total - paid);

    return {
      status: "found",
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.fullName || "Customer",
        phone: order.customer?.phone || "",
        address: cleanAddress,
        district: extractedDistrict,
        totalAmount: total,
        dueAmount: due,
        paidAmount: paid,
        orderStatus: order.orderStatus,
        orderStatusLabel: STATUS_INT_TO_LABEL[order.orderStatus] || "packaging",
        latestNote,
      },
    };
  } catch (error) {
    console.error("scanOrderForShipmentAction failed:", error);
    return { status: "not_found", reason: "Lookup error occurred" };
  }
}

export interface SubmitBulkShippedPayload {
  orderIds: string[];
  courierId: string;
  invoiceId?: string;
  customerNote?: string;
  packagingNote?: string;
  actorName?: string;
}

/**
 * Submits the bulk shipment in a single atomic Prisma transaction.
 * - Re-validates every order status is still "Packaging" (7 or 2)
 * - Updates status to "Shipped" (3)
 * - Assigns delivery company & Inv-ID
 * - Logs customer note (type 2) and packaging note (type 10) into order metadata & shipment history
 */
export async function submitBulkShippedBatchAction(
  payload: SubmitBulkShippedPayload
): Promise<{ success: boolean; error?: string; batchNumber?: string; processedCount?: number }> {
  try {
    const { orderIds, courierId, invoiceId, customerNote, packagingNote, actorName = "Staff" } = payload;

    if (!orderIds || orderIds.length === 0) {
      return { success: false, error: "Queue is empty. Scan at least one order before submitting." };
    }

    if (!courierId) {
      return { success: false, error: "Please select a Delivery Company (Courier)." };
    }

    const courier = await prisma.courier.findUnique({
      where: { id: courierId },
    });

    if (!courier) {
      return { success: false, error: "Selected Courier not found in database." };
    }

    const cleanInvoiceId = (invoiceId || "").trim();
    const cleanCustNote = (customerNote || "").trim();
    const cleanPackNote = (packagingNote || "").trim();

    // Generate batch number
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

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch and re-validate ALL orders
      const orders = await tx.order.findMany({
        where: { id: { in: orderIds } },
        include: {
          customer: true,
          shipment: true,
        },
      });

      if (orders.length !== orderIds.length) {
        throw new Error("One or more orders in the queue could not be found in the database.");
      }

      const PACKAGING_STATUS_CODES = [7, 2];
      for (const ord of orders) {
        if (ord.orderStatus === 3) {
          throw new Error(`Order #${ord.orderNumber} was already marked as Shipped by another session.`);
        }
        if (!PACKAGING_STATUS_CODES.includes(ord.orderStatus)) {
          const lbl = STATUS_INT_TO_LABEL[ord.orderStatus] || `Status ${ord.orderStatus}`;
          throw new Error(`Order #${ord.orderNumber} is in "${lbl}" status (not Packaging). Submission rolled back.`);
        }
      }

      const totalBatchValue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

      // 2. Create the ShipmentBatch record
      const batchNotesSummary = [
        cleanInvoiceId ? `Inv-ID: ${cleanInvoiceId}` : "",
        cleanCustNote ? `Customer Note: ${cleanCustNote}` : "",
        cleanPackNote ? `Packaging Note: ${cleanPackNote}` : "",
      ].filter(Boolean).join(" | ");

      const batch = await tx.shipmentBatch.create({
        data: {
          batchNumber,
          courierId: courier.id,
          status: "shipped",
          totalOrders: orders.length,
          totalShipmentValue: totalBatchValue,
          notes: batchNotesSummary || null,
          createdBy: actorName,
        },
      });

      // 3. Process each order: update to Shipped (3), save notes into shippingAddressJson, attach Shipment
      for (const ord of orders) {
        // Parse existing metadata
        let existingMeta: Record<string, unknown> = {};
        try {
          if (ord.shippingAddressJson) {
            existingMeta = JSON.parse(ord.shippingAddressJson);
          }
        } catch {
          /* ignore */
        }

        // Build note history records for order tracking
        const currentNotesStr = String(existingMeta.note || "");
        const addedNotes: string[] = [];
        if (cleanCustNote) addedNotes.push(`[Customer Note (type=2)] ${cleanCustNote}`);
        if (cleanPackNote) addedNotes.push(`[Packaging Note (type=10)] ${cleanPackNote}`);

        const updatedNoteStr = addedNotes.length > 0
          ? currentNotesStr ? `${currentNotesStr} | ${addedNotes.join(" | ")}` : addedNotes.join(" | ")
          : currentNotesStr;

        const updatedMeta = {
          ...existingMeta,
          note: updatedNoteStr,
          courierName: courier.name,
          courierTrackingNumber: cleanInvoiceId || existingMeta.courierTrackingNumber || null,
          invoiceId: cleanInvoiceId || undefined,
          lastCustomerNote: cleanCustNote || undefined,
          lastPackagingNote: cleanPackNote || undefined,
          dispatchedAt: new Date().toISOString(),
          dispatchedBy: actorName,
        };

        // Update Order status to Shipped (3)
        await tx.order.update({
          where: { id: ord.id },
          data: {
            orderStatus: 3, // Shipped
            shippingAddressJson: JSON.stringify(updatedMeta),
          },
        });

        // Delete previous shipment if existed
        if (ord.shipment) {
          await tx.shipment.delete({ where: { id: ord.shipment.id } });
        }

        // Create new Shipment
        const shipment = await tx.shipment.create({
          data: {
            orderId: ord.id,
            courierId: courier.id,
            shipmentBatchId: batch.id,
            trackingNumber: cleanInvoiceId || null,
            status: "shipped",
            shippedAtUtc: new Date(),
            notes: batchNotesSummary || null,
          },
        });

        // Record history event
        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId: shipment.id,
            previousStatus: STATUS_INT_TO_LABEL[ord.orderStatus] || "packaging",
            newStatus: "shipped",
            note: `Dispatched via ${courier.name}. ${batchNotesSummary}`.trim(),
            changedBy: actorName,
            source: "bulk_shipped_scanner",
          },
        });
      }

      return { batchNumber, processedCount: orders.length };
    });

    revalidatePath("/admin/bulk-shipment");
    revalidatePath("/admin/bulk-shipped");
    revalidatePath("/admin/orders");

    return {
      success: true,
      batchNumber: result.batchNumber,
      processedCount: result.processedCount,
    };
  } catch (error) {
    console.error("submitBulkShippedBatchAction failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transaction failed during batch submission.",
    };
  }
}
