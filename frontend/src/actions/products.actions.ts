"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  getProducts,
  getProductBySlug,
  getProductById,
  getRelatedProducts,
} from "@/lib/data/products";
import type { Product } from "@/lib/shop-data";

export interface CreateProductInput {
  name: string;
  slug?: string;
  category?: string;
  subcategory?: string;
  categoryId?: number;
  subcategoryId?: number;
  price: number;
  compareAt?: number;
  mrp?: number;
  image?: string;
  images?: string[];
  sizes?: string[];
  sizePrices?: Record<string, number>;
  sizeStock?: Record<string, number>;
  sizeMeasurements?: Record<string, { chest?: string | null; length?: string | null; waist?: string | null; sleeve?: string | null }>;
  sizeTemplateId?: string | null;
  description?: string;
  shortDescription?: string;
  discountNote?: string;
  badge?: string;
  isBundle?: boolean;
  bundleProducts?: string[];
  offerRuleIds?: string[];
  isActive?: boolean;
  acceptPreOrder?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  category?: string;
  subcategory?: string;
  categoryId?: number;
  subcategoryId?: number;
  price?: number;
  compareAt?: number;
  mrp?: number;
  image?: string;
  images?: string[];
  sizes?: string[];
  sizePrices?: Record<string, number>;
  sizeStock?: Record<string, number>;
  sizeMeasurements?: Record<string, { chest?: string | null; length?: string | null; waist?: string | null; sleeve?: string | null }>;
  sizeTemplateId?: string | null;
  description?: string;
  shortDescription?: string;
  discountNote?: string;
  badge?: string;
  isBundle?: boolean;
  bundleProducts?: string[];
  offerRuleIds?: string[];
  isActive?: boolean;
  acceptPreOrder?: boolean;
}

export async function getProductsAction(params?: {
  page?: number;
  limit?: number;
  category?: string;
  categoryId?: number;
  search?: string;
  featured?: boolean;
  isActive?: boolean;
}): Promise<{ products: Product[]; totalCount: number }> {
  try {
    return await getProducts(params);
  } catch (error) {
    console.error("getProductsAction error:", error);
    return { products: [], totalCount: 0 };
  }
}

export async function getProductBySlugAction(slug: string): Promise<Product | null> {
  try {
    return await getProductBySlug(slug);
  } catch (error) {
    console.error("getProductBySlugAction error:", error);
    return null;
  }
}

export async function getProductByIdAction(id: string): Promise<Product | null> {
  try {
    return await getProductById(id);
  } catch (error) {
    console.error("getProductByIdAction error:", error);
    return null;
  }
}

export async function getRelatedProductsAction(productId: string, categoryId: number, limit = 8): Promise<Product[]> {
  try {
    return await getRelatedProducts(productId, categoryId, limit);
  } catch (error) {
    console.error("getRelatedProductsAction error:", error);
    return [];
  }
}

export async function createProductAction(input: CreateProductInput): Promise<{ success: boolean; slug?: string; error?: string }> {
  try {
    if (!input.name?.trim()) {
      return { success: false, error: "Product name is required." };
    }

    const name = input.name.trim();
    let slug = input.slug?.trim().toLowerCase() || name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");

    if (!slug) {
      slug = `prod-${Date.now().toString().slice(-6)}`;
    }

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({
      where: { slug },
    });
    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // Resolve Brand
    let brand = await prisma.brand.findFirst();
    if (!brand) {
      brand = await prisma.brand.create({
        data: { name: "Arza", slug: "arza", isActive: true },
      });
    }

    // Resolve category ID directly if provided, or resolve from database
    let categoryId = 1;
    if (input.subcategoryId && Number(input.subcategoryId) > 0) {
      categoryId = Number(input.subcategoryId);
    } else if (input.categoryId && Number(input.categoryId) > 0) {
      categoryId = Number(input.categoryId);
    } else {
      const subCatIdentifier = input.subcategory?.trim();
      const mainCatIdentifier = input.category?.trim();

      let foundCat = null;
      if (subCatIdentifier) {
        const subCatSlug = subCatIdentifier.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
        foundCat = await prisma.category.findFirst({
          where: {
            OR: [{ slug: subCatSlug }, { name: subCatIdentifier }],
          },
        });
      }

      if (!foundCat && mainCatIdentifier) {
        const mainCatSlug = mainCatIdentifier.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
        foundCat = await prisma.category.findFirst({
          where: {
            OR: [{ slug: mainCatSlug }, { name: mainCatIdentifier }],
          },
        });
      }

      if (foundCat) {
        categoryId = foundCat.id;
      } else if (mainCatIdentifier || subCatIdentifier) {
        const targetName = mainCatIdentifier || subCatIdentifier || "General";
        const catSlug = targetName.toLowerCase().replace(/[^a-z0-9-]+/g, "-") || `cat-${Date.now()}`;
        const newCat = await prisma.category.create({
          data: {
            name: targetName,
            slug: catSlug,
            displayOrder: 1,
            isActive: true,
          },
        });
        categoryId = newCat.id;
      } else {
        const defaultCat = await prisma.category.findFirst();
        if (defaultCat) categoryId = defaultCat.id;
      }
    }

    const sku = `SKU-${Date.now().toString().slice(-6)}`;
    const basePrice = input.mrp || input.price || 0;
    const discountPrice = input.compareAt && input.compareAt > input.price ? input.price : null;

    const bundleJson = input.bundleProducts && input.bundleProducts.length > 0
      ? JSON.stringify(input.bundleProducts)
      : null;

    const offerRuleIdsJson = input.offerRuleIds && input.offerRuleIds.length > 0
      ? JSON.stringify(input.offerRuleIds)
      : null;

    let finalBadge = input.badge?.trim() || "";
    if (input.acceptPreOrder) {
      finalBadge = finalBadge ? `${finalBadge}|PREORDER_ENABLED` : "PREORDER_ENABLED";
    }

    const shortDescriptionText = input.discountNote !== undefined ? input.discountNote : (input.shortDescription || "");
    const fullDescriptionText = input.description !== undefined ? input.description : "";

    const created = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          brandId: brand.id,
          categoryId,
          name,
          slug,
          sku,
          shortDescription: shortDescriptionText,
          fullDescription: fullDescriptionText,
          basePrice,
          discountPrice,
          badge: finalBadge || null,
          sizeTemplateId: input.sizeTemplateId || null,
          isBundle: input.isBundle ?? false,
          bundleProducts: bundleJson,
          offerRuleIds: offerRuleIdsJson,
          isFeatured: false,
          isActive: input.isActive ?? true,
          averageRating: 5.0,
          reviewCount: 0,
        },
      });

      // Images
      const imagesList = input.images && input.images.length > 0 ? input.images : input.image ? [input.image] : [];
      for (let i = 0; i < imagesList.length; i++) {
        await tx.productImage.create({
          data: {
            productId: prod.id,
            imageUrl: imagesList[i],
            isMain: i === 0,
            displayOrder: i + 1,
          },
        });
      }

      // Sizes / Variants
      const sizes = input.sizes && input.sizes.length > 0 ? input.sizes : ["M", "L", "XL", "XXL"];
      for (let i = 0; i < sizes.length; i++) {
        const sizeName = sizes[i];
        const priceOverride = input.sizePrices?.[sizeName] ?? null;
        const stockQuantity = input.sizeStock?.[sizeName] ?? 0;
        const measurement = input.sizeMeasurements?.[sizeName];

        await tx.productVariant.create({
          data: {
            productId: prod.id,
            name: `Size: ${sizeName}`,
            sku: `${sku}-${sizeName}`,
            priceOverride,
            stockQuantity,
            chest: measurement?.chest || null,
            length: measurement?.length || null,
            waist: measurement?.waist || null,
            sleeve: measurement?.sleeve || null,
            isActive: true,
          },
        });
      }

      return prod;
    });

    revalidatePath("/");
    revalidatePath("/admin/products");
    revalidatePath(`/product/${created.slug}`);

    return { success: true, slug: created.slug };
  } catch (error: unknown) {
    console.error("createProductAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create product." };
  }
}

export async function updateProductAction(slug: string, input: UpdateProductInput): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.product.findUnique({
      where: { slug },
      include: { images: true, variants: true },
    });

    if (!existing) {
      return { success: false, error: "Product not found" };
    }

    let categoryId = existing.categoryId;
    if (input.subcategoryId && Number(input.subcategoryId) > 0) {
      categoryId = Number(input.subcategoryId);
    } else if (input.categoryId && Number(input.categoryId) > 0) {
      categoryId = Number(input.categoryId);
    } else {
      const subCatIdentifier = input.subcategory !== undefined ? input.subcategory?.trim() : undefined;
      const mainCatIdentifier = input.category?.trim();

      let foundCat = null;
      if (subCatIdentifier) {
        const subCatSlug = subCatIdentifier.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
        foundCat = await prisma.category.findFirst({
          where: {
            OR: [{ slug: subCatSlug }, { name: subCatIdentifier }],
          },
        });
      }

      if (!foundCat && mainCatIdentifier) {
        const mainCatSlug = mainCatIdentifier.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
        foundCat = await prisma.category.findFirst({
          where: {
            OR: [{ slug: mainCatSlug }, { name: mainCatIdentifier }],
          },
        });
      }

      if (foundCat) {
        categoryId = foundCat.id;
      }
    }

    const basePrice = input.mrp !== undefined ? input.mrp : input.price !== undefined ? input.price : existing.basePrice;
    const discountPrice = input.compareAt && input.price && input.compareAt > input.price ? input.price : null;

    const bundleJson = input.bundleProducts !== undefined
      ? JSON.stringify(input.bundleProducts)
      : existing.bundleProducts;

    const offerRuleIdsJson = input.offerRuleIds !== undefined
      ? (input.offerRuleIds.length > 0 ? JSON.stringify(input.offerRuleIds) : null)
      : existing.offerRuleIds;

    let updatedBadge = input.badge !== undefined ? input.badge?.trim() || "" : (existing.badge || "");
    if (input.acceptPreOrder !== undefined) {
      const cleanWithoutTag = updatedBadge.replace(/\|?PREORDER_ENABLED/g, "").trim();
      updatedBadge = input.acceptPreOrder
        ? (cleanWithoutTag ? `${cleanWithoutTag}|PREORDER_ENABLED` : "PREORDER_ENABLED")
        : cleanWithoutTag;
    }

    const updatedShortDesc = input.discountNote !== undefined ? input.discountNote : input.shortDescription;
    const updatedFullDesc = input.description;

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.id },
        data: {
          name: input.name ?? existing.name,
          shortDescription: updatedShortDesc !== undefined ? updatedShortDesc : existing.shortDescription,
          fullDescription: updatedFullDesc !== undefined ? updatedFullDesc : existing.fullDescription,
          basePrice,
          discountPrice,
          badge: updatedBadge || null,
          isBundle: input.isBundle !== undefined ? input.isBundle : existing.isBundle,
          bundleProducts: bundleJson,
          offerRuleIds: offerRuleIdsJson,
          isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
          categoryId,
          sizeTemplateId: input.sizeTemplateId !== undefined ? (input.sizeTemplateId || null) : existing.sizeTemplateId,
        },
      });

      // Update Images if provided
      if (input.images || input.image) {
        await tx.productImage.deleteMany({
          where: { productId: existing.id },
        });

        const imagesList = input.images && input.images.length > 0 ? input.images : input.image ? [input.image] : [];
        for (let i = 0; i < imagesList.length; i++) {
          await tx.productImage.create({
            data: {
              productId: existing.id,
              imageUrl: imagesList[i],
              isMain: i === 0,
              displayOrder: i + 1,
            },
          });
        }
      }

      // Update Variants/Sizes if provided
      if (input.sizes && input.sizes.length > 0) {
        // Map existing variant stocks and measurements by clean size name
        const existingStockMap: Record<string, number> = {};
        const existingMeasurementsMap: Record<string, { chest?: string | null; length?: string | null; waist?: string | null; sleeve?: string | null }> = {};
        (existing.variants || []).forEach((v) => {
          const clean = v.name.replace(/^Size:\s*/i, "").trim();
          existingStockMap[clean] = v.stockQuantity;
          existingMeasurementsMap[clean] = {
            chest: v.chest,
            length: v.length,
            waist: v.waist,
            sleeve: v.sleeve,
          };
        });

        await tx.productVariant.deleteMany({
          where: { productId: existing.id },
        });

        for (let i = 0; i < input.sizes.length; i++) {
          const sizeName = input.sizes[i];
          const priceOverride = input.sizePrices?.[sizeName] ?? null;
          const stockQuantity =
            input.sizeStock?.[sizeName] !== undefined
              ? input.sizeStock[sizeName]
              : (existingStockMap[sizeName] ?? 0);

          const inputMeas = input.sizeMeasurements?.[sizeName];
          const fallbackMeas = existingMeasurementsMap[sizeName];

          await tx.productVariant.create({
            data: {
              productId: existing.id,
              name: `Size: ${sizeName}`,
              sku: `${existing.sku}-${sizeName}`,
              priceOverride,
              stockQuantity,
              chest: inputMeas?.chest !== undefined ? (inputMeas.chest || null) : (fallbackMeas?.chest || null),
              length: inputMeas?.length !== undefined ? (inputMeas.length || null) : (fallbackMeas?.length || null),
              waist: inputMeas?.waist !== undefined ? (inputMeas.waist || null) : (fallbackMeas?.waist || null),
              sleeve: inputMeas?.sleeve !== undefined ? (inputMeas.sleeve || null) : (fallbackMeas?.sleeve || null),
              isActive: true,
            },
          });
        }
      }
    });

    revalidatePath("/");
    revalidatePath("/admin/products");
    revalidatePath(`/product/${slug}`);

    return { success: true };
  } catch (error: unknown) {
    console.error("updateProductAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update product." };
  }
}

export async function deleteProductAction(slug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.product.findUnique({
      where: { slug },
    });

    if (!existing) {
      return { success: false, error: "Product not found" };
    }

    // Check if product exists in any completed or existing orders
    const orderItemCount = await prisma.orderItem.count({
      where: { productId: existing.id },
    });

    if (orderItemCount > 0) {
      return {
        success: false,
        error: `এই প্রোডাক্টটির (${existing.name}) সাথে অর্ডারের রেকর্ড সংযুক্ত রয়েছে, তাই এটি ডিলিট করা সম্ভব নয়। আপনি চাইলে প্রোডাক্টটি 'Inactive' করে রাখতে পারেন।`,
      };
    }

    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: existing.id } }),
      prisma.productVariant.deleteMany({ where: { productId: existing.id } }),
      prisma.product.delete({ where: { id: existing.id } }),
    ]);

    revalidatePath("/");
    revalidatePath("/admin/products");
    revalidatePath(`/product/${slug}`);

    return { success: true };
  } catch (error: unknown) {
    console.error("deleteProductAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete product." };
  }
}
