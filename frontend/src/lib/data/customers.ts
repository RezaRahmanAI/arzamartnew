import prisma from "@/lib/prisma";
import type { ApiCustomer, ApiCustomerProfile } from "@/lib/api/services/customers.service";

export async function getAllCustomers(): Promise<ApiCustomer[]> {
  try {
    const rows = await prisma.customer.findMany({
      include: {
        orders: true,
      },
      orderBy: { createdAtUtc: "desc" },
    });

    return rows.map((c) => {
      const orderCount = c.orders.length;
      const totalSpent = c.orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

      return {
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        email: c.email,
        district: c.district,
        defaultAddress: c.defaultAddress || undefined,
        isGuest: c.isGuest,
        createdAt: c.createdAtUtc.toISOString(),
        createdAtUtc: c.createdAtUtc.toISOString(),
        totalOrders: orderCount,
        totalSpent,
      };
    });
  } catch (error) {
    console.error("getAllCustomers query failed:", error);
    return [];
  }
}

export async function getCustomerByPhone(phone: string): Promise<ApiCustomerProfile | null> {
  try {
    const cleanPhone = phone.trim();
    const c = await prisma.customer.findUnique({
      where: { phone: cleanPhone },
    });

    if (!c) return null;

    return {
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      googleId: c.googleId,
      googleEmail: c.googleEmail,
      profileImage: c.profileImage,
      defaultAddress: c.defaultAddress || undefined,
      area: c.area,
      district: c.district,
      postalCode: c.postalCode,
      defaultNote: c.defaultNote || undefined,
      isGuest: c.isGuest,
      hasPassword: !!c.passwordHash,
      lastLoginAtUtc: c.lastLoginAtUtc ? c.lastLoginAtUtc.toISOString() : null,
      createdAt: c.createdAtUtc.toISOString(),
      createdAtUtc: c.createdAtUtc.toISOString(),
      totalOrders: 0,
      totalSpent: 0,
    };
  } catch (error) {
    console.error(`getCustomerByPhone query failed for ${phone}:`, error);
    return null;
  }
}
