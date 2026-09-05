"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface SizeTemplateColumnDto {
  id?: string;
  name: string;
  displayOrder?: number;
}

export interface SizeTemplateEntryDto {
  id?: string;
  size: string;
  measurements: Record<string, string>;
  displayOrder?: number;
}

export interface SizeTemplateDto {
  id: string;
  name: string;
  createdAtUtc?: Date | string;
  updatedAtUtc?: Date | string | null;
  columns: SizeTemplateColumnDto[];
  entries: SizeTemplateEntryDto[];
  productCount?: number;
}

export interface SaveSizeTemplateInput {
  name: string;
  columns: SizeTemplateColumnDto[];
  entries: SizeTemplateEntryDto[];
}

function safeParseJson(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (v === null || v === undefined) continue;
        out[String(k)] = String(v);
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

export async function getSizeTemplatesAction(): Promise<SizeTemplateDto[]> {
  try {
    const templates = await prisma.sizeTemplate.findMany({
      include: {
        columns: {
          orderBy: { displayOrder: "asc" },
        },
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
      createdAtUtc: t.createdAtUtc.toISOString(),
      updatedAtUtc: t.updatedAtUtc?.toISOString() || null,
      columns: t.columns.map((c) => ({
        id: c.id,
        name: c.name,
        displayOrder: c.displayOrder,
      })),
      entries: t.entries.map((e) => ({
        id: e.id,
        size: e.size,
        measurements: safeParseJson(e.measurementsJson),
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
        columns: {
          orderBy: { displayOrder: "asc" },
        },
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
      createdAtUtc: t.createdAtUtc.toISOString(),
      updatedAtUtc: t.updatedAtUtc?.toISOString() || null,
      columns: t.columns.map((c) => ({
        id: c.id,
        name: c.name,
        displayOrder: c.displayOrder,
      })),
      entries: t.entries.map((e) => ({
        id: e.id,
        size: e.size,
        measurements: safeParseJson(e.measurementsJson),
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

    const columns = (input.columns || []).filter((c) => c.name?.trim());
    if (columns.length === 0) {
      return { success: false, error: "Please add at least one measurement column" };
    }

    const created = await prisma.$transaction(async (tx) => {
      const template = await tx.sizeTemplate.create({
        data: { name },
      });

      const createdColumns: { id: string; name: string; order: number }[] = [];
      for (let i = 0; i < columns.length; i++) {
        const c = columns[i];
        const createdCol = await tx.sizeTemplateColumn.create({
          data: {
            sizeTemplateId: template.id,
            name: c.name.trim(),
            displayOrder: c.displayOrder ?? i,
          },
        });
        createdColumns.push({ id: createdCol.id, name: createdCol.name, order: createdCol.displayOrder });
      }

      const columnIdByName = new Map<string, string>();
      for (const c of createdColumns) {
        columnIdByName.set(c.name.toLowerCase(), c.id);
      }

      const entries = input.entries || [];
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (!e.size?.trim()) continue;

        const normalized: Record<string, string> = {};
        for (const [key, val] of Object.entries(e.measurements || {})) {
          const v = (val ?? "").toString().trim();
          if (!v) continue;
          const colId = columnIdByName.get(String(key).toLowerCase());
          if (colId) normalized[colId] = v;
        }

        await tx.sizeTemplateEntry.create({
          data: {
            sizeTemplateId: template.id,
            size: e.size.trim(),
            measurementsJson: JSON.stringify(normalized),
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

    const columns = (input.columns || []).filter((c) => c.name?.trim());
    if (columns.length === 0) {
      return { success: false, error: "Please add at least one measurement column" };
    }

    const existing = await prisma.sizeTemplate.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Size template not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.sizeTemplate.update({
        where: { id },
        data: { name },
      });

      // Build name -> oldColumnId map to translate incoming measurement keys
      // (which may use existing column names) into new column ids.
      const oldColumns = await tx.sizeTemplateColumn.findMany({
        where: { sizeTemplateId: id },
      });
      const oldIdByName = new Map<string, string>();
      for (const c of oldColumns) oldIdByName.set(c.name.toLowerCase(), c.id);

      // Save old measurements so we can re-key them after column reconciliation
      const oldEntries = await tx.sizeTemplateEntry.findMany({
        where: { sizeTemplateId: id },
      });
      const oldMeasurementsBySize = new Map<string, Record<string, string>>();
      for (const e of oldEntries) {
        const m = safeParseJson(e.measurementsJson);
        if (!oldMeasurementsBySize.has(e.size)) oldMeasurementsBySize.set(e.size, m);
      }

      // Recreate columns to preserve clean order and clean up removed ones
      await tx.sizeTemplateColumn.deleteMany({
        where: { sizeTemplateId: id },
      });

      const newColumns: { id: string; name: string; order: number }[] = [];
      for (let i = 0; i < columns.length; i++) {
        const c = columns[i];
        const created = await tx.sizeTemplateColumn.create({
          data: {
            sizeTemplateId: id,
            name: c.name.trim(),
            displayOrder: c.displayOrder ?? i,
          },
        });
        newColumns.push({ id: created.id, name: created.name, order: created.displayOrder });
      }

      const newIdByName = new Map<string, string>();
      for (const c of newColumns) newIdByName.set(c.name.toLowerCase(), c.id);

      // Re-create entries to preserve clean order
      await tx.sizeTemplateEntry.deleteMany({
        where: { sizeTemplateId: id },
      });

      const entries = input.entries || [];
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (!e.size?.trim()) continue;

        const normalized: Record<string, string> = {};
        // 1. Apply submitted measurements (keyed by either column id or name)
        for (const [key, val] of Object.entries(e.measurements || {})) {
          const v = (val ?? "").toString().trim();
          if (!v) continue;
          const lower = String(key).toLowerCase();
          let colId = newIdByName.get(lower);
          if (!colId) {
            const oldId = oldIdByName.get(lower);
            if (oldId) {
              // Try to match by old column id -> old column name -> new column id
              const oldCol = oldColumns.find((c) => c.id === oldId);
              if (oldCol) colId = newIdByName.get(oldCol.name.toLowerCase());
            }
          }
          if (colId) normalized[colId] = v;
        }

        await tx.sizeTemplateEntry.create({
          data: {
            sizeTemplateId: id,
            size: e.size.trim(),
            measurementsJson: JSON.stringify(normalized),
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

    // Set Product.sizeTemplateId to null before deleting (Cascade removes columns/entries automatically)
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