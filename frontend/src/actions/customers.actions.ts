"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ApiCustomerProfile, ApiProfileUpdate } from "@/lib/api/services/customers.service";

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
        area: data.area,
        district: data.district,
        postalCode: data.postalCode,
        defaultNote: data.defaultNote,
      },
    });

    revalidatePath("/admin/customers");

    return {
      success: true,
      customer: {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        googleId: updated.googleId,
        googleEmail: updated.googleEmail,
        profileImage: updated.profileImage,
        defaultAddress: updated.defaultAddress,
        area: updated.area,
        district: updated.district,
        postalCode: updated.postalCode,
        defaultNote: updated.defaultNote,
        isGuest: updated.isGuest,
        hasPassword: !!updated.passwordHash,
        lastLoginAtUtc: updated.lastLoginAtUtc ? updated.lastLoginAtUtc.toISOString() : null,
        createdAtUtc: updated.createdAtUtc.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("updateCustomerProfileAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update profile." };
  }
}

export async function setCustomerPasswordAction(
  phone: string,
  newPassword: string
): Promise<{ success: boolean; customer?: ApiCustomerProfile; error?: string }> {
  try {
    const cleanPhone = phone.trim();
    const updated = await prisma.customer.update({
      where: { phone: cleanPhone },
      data: {
        passwordHash: newPassword,
      },
    });

    return {
      success: true,
      customer: {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        googleId: updated.googleId,
        googleEmail: updated.googleEmail,
        profileImage: updated.profileImage,
        defaultAddress: updated.defaultAddress,
        area: updated.area,
        district: updated.district,
        postalCode: updated.postalCode,
        defaultNote: updated.defaultNote,
        isGuest: updated.isGuest,
        hasPassword: true,
        lastLoginAtUtc: updated.lastLoginAtUtc ? updated.lastLoginAtUtc.toISOString() : null,
        createdAtUtc: updated.createdAtUtc.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("setCustomerPasswordAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to set password." };
  }
}
