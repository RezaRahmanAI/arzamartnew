"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface CourierDto {
  id: string;
  name: string;
  code: string;
  logoUrl?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  apiStatus: string;
  notes?: string | null;
  isActive: boolean;
  displayOrder: number;
  totalShipments?: number;
  deliveredShipments?: number;
  inTransitShipments?: number;
  returnedShipments?: number;
  cancelledShipments?: number;
  totalValue?: number;
  createdAt: string;
  updatedAt?: string | null;
}

export async function getCouriersAction(): Promise<CourierDto[]> {
  try {
    const rows = await prisma.courier.findMany({
      include: {
        _count: {
          select: {
            shipments: true,
            shipmentBatches: true,
          },
        },
        shipments: {
          select: {
            status: true,
            order: {
              select: { totalAmount: true },
            },
          },
        },
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });

    return rows.map((c) => {
      let delivered = 0;
      let inTransit = 0;
      let returned = 0;
      let cancelled = 0;
      let totalValue = 0;

      for (const s of c.shipments) {
        totalValue += Number(s.order?.totalAmount) || 0;
        if (s.status === "delivered") delivered++;
        else if (s.status === "in_transit" || s.status === "shipped") inTransit++;
        else if (s.status === "returned") returned++;
        else if (s.status === "cancelled") cancelled++;
      }

      return {
        id: c.id,
        name: c.name,
        code: c.code,
        logoUrl: c.logoUrl,
        contactPerson: c.contactPerson,
        phone: c.phone,
        email: c.email,
        website: c.website,
        apiStatus: c.apiStatus,
        notes: c.notes,
        isActive: c.isActive,
        displayOrder: c.displayOrder,
        totalShipments: c._count.shipments,
        deliveredShipments: delivered,
        inTransitShipments: inTransit,
        returnedShipments: returned,
        cancelledShipments: cancelled,
        totalValue,
        createdAt: c.createdAtUtc.toISOString(),
        updatedAt: c.updatedAtUtc ? c.updatedAtUtc.toISOString() : null,
      };
    });
  } catch (error) {
    console.error("getCouriersAction failed:", error);
    return [];
  }
}

export async function getActiveCouriersAction(): Promise<Array<{ id: string; name: string; code: string }>> {
  try {
    const rows = await prisma.courier.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, code: true },
    });
    return rows;
  } catch (error) {
    console.error("getActiveCouriersAction failed:", error);
    return [];
  }
}

export async function createCourierAction(data: {
  name: string;
  code: string;
  logoUrl?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  website?: string;
  apiStatus?: string;
  notes?: string;
  isActive?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanName = data.name.trim();
    const cleanCode = (data.code || data.name).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");

    if (!cleanName) {
      return { success: false, error: "Courier name is required" };
    }

    const existing = await prisma.courier.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return { success: false, error: `Courier with code "${cleanCode}" already exists` };
    }

    await prisma.courier.create({
      data: {
        name: cleanName,
        code: cleanCode,
        logoUrl: data.logoUrl?.trim() || null,
        contactPerson: data.contactPerson?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        website: data.website?.trim() || null,
        apiStatus: data.apiStatus || "manual",
        notes: data.notes?.trim() || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    revalidatePath("/admin/couriers");
    revalidatePath("/admin/bulk-shipment");
    return { success: true };
  } catch (error) {
    console.error("createCourierAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create courier" };
  }
}

export async function updateCourierAction(
  id: string,
  data: {
    name: string;
    code: string;
    logoUrl?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    website?: string;
    apiStatus?: string;
    notes?: string;
    isActive?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanName = data.name.trim();
    const cleanCode = (data.code || data.name).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");

    if (!cleanName) {
      return { success: false, error: "Courier name is required" };
    }

    const existing = await prisma.courier.findFirst({
      where: { code: cleanCode, NOT: { id } },
    });

    if (existing) {
      return { success: false, error: `Another courier with code "${cleanCode}" already exists` };
    }

    await prisma.courier.update({
      where: { id },
      data: {
        name: cleanName,
        code: cleanCode,
        logoUrl: data.logoUrl?.trim() || null,
        contactPerson: data.contactPerson?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        website: data.website?.trim() || null,
        apiStatus: data.apiStatus || "manual",
        notes: data.notes?.trim() || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    revalidatePath("/admin/couriers");
    revalidatePath("/admin/bulk-shipment");
    return { success: true };
  } catch (error) {
    console.error("updateCourierAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update courier" };
  }
}

export async function toggleCourierActiveAction(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.courier.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath("/admin/couriers");
    revalidatePath("/admin/bulk-shipment");
    return { success: true };
  } catch (error) {
    console.error("toggleCourierActiveAction failed:", error);
    return { success: false, error: "Failed to toggle courier status" };
  }
}
