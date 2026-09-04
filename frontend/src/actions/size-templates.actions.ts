"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface SizeTemplateEntryDto {
  id?: string;
  size: string;
  chest?: string | null;
  length?: string | null;
  waist?: string | null;
  sleeve?: string | null;
  displayOrder?: number;
}

export interface SizeTemplateDto {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  createdAtUtc?: Date | string;
  updatedAtUtc?: Date | string | null;
  entries: SizeTemplateEntryDto[];
  productCount?: number;
}

export interface SaveSizeTemplateInput {
  name: string;
  category?: string;
  description?: string;
  entries: Array<{
    size: string;
    chest?: string;
    length?: string;
    waist?: string;
    sleeve?: string;
    displayOrder?: number;
  }>;
}

export async function getSizeTemplatesAction(): Promise<SizeTemplateDto[]> {
  try {
    const templates = await prisma.sizeTemplate.findMany({
      include: {
        entries: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAtUtc: "desc" },
    });

    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      createdAtUtc: t.createdAtUtc.toISOString(),
      updatedAtUtc: t.updatedAtUtc?.toISOString() || null,
      entries: t.entries.map((e) => ({
        id: e.id,
        size: e.size,
        chest: e.chest,
        length: e.length,
        waist: e.waist,
        sleeve: e.sleeve,
        displayOrder: e.displayOrder,
      })),
      productCount: t._count.products,
    }));
  } catch (error) {
    console.error("getSizeTemplatesAction error:", error);
    return [];
  }
}

export async function getSizeTemplateByIdAction(id: string): Promise<SizeTemplateDto | null> {
  try {
    const t = await prisma.sizeTemplate.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!t) return null;

    return {
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      createdAtUtc: t.createdAtUtc.toISOString(),
      updatedAtUtc: t.updatedAtUtc?.toISOString() || null,
      entries: t.entries.map((e) => ({
        id: e.id,
        size: e.size,
        chest: e.chest,
        length: e.length,
        waist: e.waist,
        sleeve: e.sleeve,
        displayOrder: e.displayOrder,
      })),
      productCount: t._count.products,
    };
  } catch (error) {
    console.error("getSizeTemplateByIdAction error:", error);
    return null;
  }
}

export async function createSizeTemplateAction(
  input: SaveSizeTemplateInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const name = input.name.trim();
    if (!name) {
      return { success: false, error: "Template name is required" };
    }

    const created = await prisma.$transaction(async (tx) => {
      const template = await tx.sizeTemplate.create({
        data: {
          name,
          category: input.category?.trim() || null,
          description: input.description?.trim() || null,
        },
      });

      const entries = input.entries || [];
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (!e.size?.trim()) continue;
        await tx.sizeTemplateEntry.create({
          data: {
            sizeTemplateId: template.id,
            size: e.size.trim(),
            chest: e.chest?.trim() || null,
            length: e.length?.trim() || null,
            waist: e.waist?.trim() || null,
            sleeve: e.sleeve?.trim() || null,
            displayOrder: e.displayOrder ?? i,
          },
        });
      }

      return template;
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/products");

    return { success: true, id: created.id };
  } catch (error) {
    console.error("createSizeTemplateAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create size template",
    };
  }
}

export async function updateSizeTemplateAction(
  id: string,
  input: SaveSizeTemplateInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const name = input.name.trim();
    if (!name) {
      return { success: false, error: "Template name is required" };
    }

    const existing = await prisma.sizeTemplate.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Size template not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.sizeTemplate.update({
        where: { id },
        data: {
          name,
          category: input.category?.trim() || null,
          description: input.description?.trim() || null,
        },
      });

      // Re-create entries to preserve clean order
      await tx.sizeTemplateEntry.deleteMany({
        where: { sizeTemplateId: id },
      });

      const entries = input.entries || [];
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (!e.size?.trim()) continue;
        await tx.sizeTemplateEntry.create({
          data: {
            sizeTemplateId: id,
            size: e.size.trim(),
            chest: e.chest?.trim() || null,
            length: e.length?.trim() || null,
            waist: e.waist?.trim() || null,
            sleeve: e.sleeve?.trim() || null,
            displayOrder: e.displayOrder ?? i,
          },
        });
      }
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/products");

    return { success: true };
  } catch (error) {
    console.error("updateSizeTemplateAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update size template",
    };
  }
}

export async function deleteSizeTemplateAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.sizeTemplate.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Size template not found" };
    }

    // Set Product.sizeTemplateId to null before deleting (Cascade removes entries automatically)
    await prisma.$transaction(async (tx) => {
      await tx.product.updateMany({
        where: { sizeTemplateId: id },
        data: { sizeTemplateId: null },
      });

      await tx.sizeTemplate.delete({
        where: { id },
      });
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/products");

    return { success: true };
  } catch (error) {
    console.error("deleteSizeTemplateAction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete size template",
    };
  }
}
