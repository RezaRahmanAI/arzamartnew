"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ApiCustomerProfile, ApiProfileUpdate } from "@/lib/api/services/customers.service";
import { getAllCustomers, getCustomerByPhone } from "@/lib/data/customers";
import crypto from "crypto";

export interface CustomerAuthCustomer {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  district?: string;
  defaultAddress?: string | null;
  hasPassword?: boolean;
}

function hashPassword(pass: string): string {
  return crypto.createHash("sha256").update(pass).digest("hex");
}

export async function getCustomersAction(): Promise<ApiCustomerProfile[]> {
  try {
    return await getAllCustomers();
  } catch (error) {
    console.error("getCustomersAction error:", error);
    return [];
  }
}

export async function getCustomerByPhoneAction(phone: string): Promise<ApiCustomerProfile | null> {
  try {
    return await getCustomerByPhone(phone);
  } catch (error) {
    console.error("getCustomerByPhoneAction error:", error);
    return null;
  }
}

export async function createCustomerAction(params: {
  fullName: string;
  email: string;
  phone: string;
  defaultAddress?: string;
  district?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const cleanPhone = params.phone.trim();
    let customer = await prisma.customer.findUnique({
      where: { phone: cleanPhone },
    });

    if (customer) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          fullName: params.fullName.trim(),
          email: params.email?.trim() || customer.email,
          defaultAddress: params.defaultAddress || customer.defaultAddress,
          district: params.district || customer.district,
          isGuest: false,
        },
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          fullName: params.fullName.trim(),
          email: params.email?.trim() || `${cleanPhone.replace(/\+/g, "")}@customer.local`,
          phone: cleanPhone,
          defaultAddress: params.defaultAddress || "",
          district: params.district || "Dhaka",
          isGuest: false,
        },
      });
    }

    revalidatePath("/admin/customers");
    return { success: true, id: customer.id };
  } catch (error: unknown) {
    console.error("createCustomerAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create customer." };
  }
}

export async function updateCustomerProfileAction(
  id: string,
  data: ApiProfileUpdate
): Promise<{ success: boolean; customer?: ApiCustomerProfile; error?: string }> {
  try {
    const updated = await prisma.customer.update({
      where: { id },
      data: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        defaultAddress: data.defaultAddress,
        district: data.district,
      },
    });

    revalidatePath("/admin/customers");
    revalidatePath("/account");

    return {
      success: true,
      customer: {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        defaultAddress: updated.defaultAddress || undefined,
        district: updated.district || undefined,
        totalOrders: 0,
        totalSpent: 0,
        isGuest: updated.isGuest,
        createdAt: updated.createdAtUtc.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("updateCustomerProfileAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update profile." };
  }
}

export async function setCustomerPasswordAction(
  phoneOrId: string,
  newPassword: string
): Promise<{ ok: boolean; customer?: CustomerAuthCustomer; message?: string; isNetworkError?: boolean }> {
  try {
    const clean = phoneOrId.trim();
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ phone: clean }, { id: clean }],
      },
    });

    if (!customer) {
      return { ok: false, message: "Customer account not found." };
    }

    const hashed = hashPassword(newPassword);
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash: hashed },
    });

    return {
      ok: true,
      customer: {
        id: updated.id,
        fullName: updated.fullName,
        phone: updated.phone,
        email: updated.email,
        district: updated.district,
        defaultAddress: updated.defaultAddress,
        hasPassword: true,
      },
    };
  } catch (error: unknown) {
    console.error("setCustomerPasswordAction error:", error);
    return { ok: false, message: error instanceof Error ? error.message : "Failed to set password." };
  }
}

export async function loginCustomerAction(
  emailOrPhone: string,
  pass: string
): Promise<{ ok: boolean; customer?: CustomerAuthCustomer; message?: string; isNetworkError?: boolean }> {
  try {
    const clean = emailOrPhone.trim();
    const isEmail = clean.includes("@");

    const customer = await prisma.customer.findFirst({
      where: isEmail
        ? { email: clean }
        : { phone: clean },
    });

    if (!customer) {
      return { ok: false, message: "No account found with this phone or email." };
    }

    if (!customer.passwordHash) {
      // Customer has no password yet (guest or newly created by order)
      return {
        ok: true,
        customer: {
          id: customer.id,
          fullName: customer.fullName,
          phone: customer.phone,
          email: customer.email,
          district: customer.district,
          defaultAddress: customer.defaultAddress,
          hasPassword: false,
        },
      };
    }

    const hashed = hashPassword(pass);
    if (customer.passwordHash !== hashed && customer.passwordHash !== pass) {
      return { ok: false, message: "Incorrect password. Please try again." };
    }

    return {
      ok: true,
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        district: customer.district,
        defaultAddress: customer.defaultAddress,
        hasPassword: true,
      },
    };
  } catch (error: unknown) {
    console.error("loginCustomerAction error:", error);
    return { ok: false, message: "Server connection failed.", isNetworkError: true };
  }
}
