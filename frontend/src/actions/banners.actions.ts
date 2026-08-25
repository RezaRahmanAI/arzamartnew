"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { HeroSlide } from "@/lib/data/banners";
import { Prisma } from "@prisma/client";

export async function createBannerAction(data: {
  title?: string;
  subtitle?: string;
  image: string;
  href?: string;
  position?: string;
  displayOrder?: number;
  isActive?: boolean;
}): Promise<{ success: boolean; banner?: HeroSlide; error?: string }> {
  try {
    const row = await prisma.banner.create({
      data: {
        title: data.title || "",
        subtitle: data.subtitle || "",
        imageUrl: data.image,
        targetUrl: data.href || "/",
        position: data.position || "slider",
        displayOrder: data.displayOrder || 0,
        isActive: data.isActive ?? true,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin/banners");

    return {
      success: true,
      banner: {
        id: String(row.id),
        title: row.title,
        subtitle: row.subtitle,
        image: row.imageUrl,
        href: row.targetUrl,
        position: row.position,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        eyebrow: "Exclusive Drop",
      },
    };
  } catch (error: unknown) {
    console.error("createBannerAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create banner." };
  }
}

export async function updateBannerAction(
  id: string | number,
  data: {
    title?: string;
    subtitle?: string;
    image?: string;
    href?: string;
    position?: string;
    displayOrder?: number;
    isActive?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const bannerId = typeof id === "string" ? parseInt(id, 10) : id;
    if (isNaN(bannerId)) return { success: false, error: "Invalid banner ID" };

    const updateData: Prisma.BannerUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
    if (data.image !== undefined) updateData.imageUrl = data.image;
    if (data.href !== undefined) updateData.targetUrl = data.href;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await prisma.banner.update({
      where: { id: bannerId },
      data: updateData,
    });

    revalidatePath("/");
    revalidatePath("/admin/banners");
    return { success: true };
  } catch (error: unknown) {
    console.error("updateBannerAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update banner." };
  }
}

export async function deleteBannerAction(id: string | number): Promise<{ success: boolean; error?: string }> {
  try {
    const bannerId = typeof id === "string" ? parseInt(id, 10) : id;
    if (isNaN(bannerId)) return { success: false, error: "Invalid banner ID" };

    await prisma.banner.delete({
      where: { id: bannerId },
    });

    revalidatePath("/");
    revalidatePath("/admin/banners");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteBannerAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete banner." };
  }
}
