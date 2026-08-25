"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

export interface CreateProductInput {
  name: string;
  slug?: string;
  category?: string;
  price: number;
  compareAt?: number;
  mrp?: number;
  image?: string;
  images?: string[];
  sizes?: string[];
  sizePrices?: Record<string, number>;
  sizeStock?: Record<string, number>;
  description?: string;
  badge?: string;
  purchaseRate?: number;
  isBundle?: boolean;
  bundleProducts?: string[];
  isActive?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  category?: string;
  price?: number;
  compareAt?: number;
  mrp?: number;
  image?: string;
  images?: string[];
  sizes?: string[];
  sizePrices?: Record<string, number>;
  sizeStock?: Record<string, number>;
  description?: string;
  badge?: string;
  purchaseRate?: number;
  isBundle?: boolean;
  bundleProducts?: string[];
  isActive?: boolean;
}

export async function createProductAction(input: CreateProductInput): Promise<{ success: boolean; slug?: string; error?: string }> {
  try {
    if (!input.name?.trim()) {
      return { success: false, error: "Product name is required." };
    }

    const name = input.name.trim();
    const slug = input.slug?.trim().toLowerCase() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({
      where: { slug },
    });
    if (existing) {
      return { success: false, error: `A product with slug '${slug}' already exists.` };
    }

    // Resolve Category
    const categorySlug = input.category?.trim().toLowerCase() || "t-shirts";
    let category = await prisma.category.findFirst({
      where: {
        OR: [{ slug: categorySlug }, { name: categorySlug }],
      },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: input.category?.trim() || "General",
          slug: categorySlug,
          displayOrder: 0,
          isActive: true,
        },
      });
    }

    // Resolve Brand
    let brand = await prisma.brand.findFirst();
    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          name: "Arza Brand",
          slug: "arza-brand",
          isActive: true,
        },
      });
    }

    const basePrice = input.mrp ?? input.compareAt ?? input.price ?? 0;
    const discountPrice = input.price > 0 && input.price < basePrice ? input.price : null;
    const sku = `SKU-${slug.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        categoryId: category.id,
        name,
        slug,
        sku,
        shortDescription: input.description?.trim() || "",
        fullDescription: input.description?.trim() || "",
        basePrice,
        discountPrice,
        isFeatured: false,
        isActive: input.isActive ?? true,
        isBundle: input.isBundle ?? false,
        bundleProducts: input.bundleProducts && input.bundleProducts.length > 0 ? JSON.stringify(input.bundleProducts) : null,
        purchaseRate: input.purchaseRate ?? basePrice * 0.7,
        badge: input.badge?.trim() || null,
      },
    });

    // Main Image
    if (input.image) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          imageUrl: input.image,
          isMain: true,
          displayOrder: 1,
        },
      });
    }

    // Gallery Images
    if (input.images && input.images.length > 0) {
      let order = 2;
      for (const imgUrl of input.images) {
        if (!imgUrl || imgUrl === input.image) continue;
        await prisma.productImage.create({
          data: {
            productId: product.id,
            imageUrl: imgUrl,
            isMain: false,
            displayOrder: order++,
          },
        });
      }
    }

    // Variants (Sizes)
    const sizes = input.sizes && input.sizes.length > 0 ? input.sizes : ["M", "L", "XL"];
    for (const sizeName of sizes) {
      const priceOverride = input.sizePrices?.[sizeName];
      const stockQty = input.sizeStock?.[sizeName] ?? 15;

      await prisma.productVariant.create({
        data: {
          productId: product.id,
          name: sizeName,
          sku: `${sku}-${sizeName}`.toUpperCase(),
          priceOverride: priceOverride ? Number(priceOverride) : null,
          stockQuantity: Math.max(0, stockQty),
          isActive: true,
        },
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/products");
    revalidatePath(`/category/${category.slug}`);

    return { success: true, slug: product.slug };
  } catch (error: unknown) {
    console.error("createProductAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create product." };
  }
}

export async function updateProductAction(slug: string, input: UpdateProductInput): Promise<{ success: boolean; slug?: string; error?: string }> {
  try {
    const cleanSlug = slug.trim().toLowerCase();
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug: cleanSlug }, { slug: cleanSlug.replace(/-/g, "") }],
      },
      include: {
        images: true,
        variants: true,
      },
    });

    if (!product) {
      return { success: false, error: `Product with slug '${slug}' not found.` };
    }

    const updateData: Prisma.ProductUpdateInput = {};

    if (input.name?.trim()) updateData.name = input.name.trim();
    if (input.description !== undefined) {
      updateData.shortDescription = input.description;
      updateData.fullDescription = input.description;
    }
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.badge !== undefined) updateData.badge = input.badge?.trim() || null;
    if (input.purchaseRate !== undefined) updateData.purchaseRate = input.purchaseRate;

    if (input.isBundle !== undefined) {
      updateData.isBundle = input.isBundle;
      updateData.bundleProducts = input.isBundle && input.bundleProducts ? JSON.stringify(input.bundleProducts) : null;
    }

    if (input.mrp !== undefined && input.mrp > 0) {
      updateData.basePrice = input.mrp;
    } else if (input.compareAt !== undefined && input.compareAt > 0) {
      updateData.basePrice = input.compareAt;
    }

    if (input.price !== undefined) {
      updateData.discountPrice = input.price;
    }

    // Update Category if provided
    if (input.category?.trim()) {
      const catSlug = input.category.trim().toLowerCase();
      const category = await prisma.category.findFirst({
        where: {
          OR: [{ slug: catSlug }, { name: catSlug }],
        },
      });
      if (category) {
        updateData.category = { connect: { id: category.id } };
      }
    }

    await prisma.product.update({
      where: { id: product.id },
      data: updateData,
    });

    // Update Images if provided
    if (input.image || input.images) {
      await prisma.productImage.deleteMany({
        where: { productId: product.id },
      });

      const mainImg = input.image || input.images?.[0];
      if (mainImg) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            imageUrl: mainImg,
            isMain: true,
            displayOrder: 1,
          },
        });
      }

      if (input.images && input.images.length > 0) {
        let order = 2;
        for (const imgUrl of input.images) {
          if (!imgUrl || imgUrl === mainImg) continue;
          await prisma.productImage.create({
            data: {
              productId: product.id,
              imageUrl: imgUrl,
              isMain: false,
              displayOrder: order++,
            },
          });
        }
      }
    }

    // Update Variants (Sizes & Stock)
    if (input.sizes && input.sizes.length > 0) {
      const existingVariants = await prisma.productVariant.findMany({
        where: { productId: product.id },
      });

      for (const sizeName of input.sizes) {
        const cleanSize = sizeName.trim();
        const price = input.sizePrices?.[cleanSize];
        const stock = input.sizeStock?.[cleanSize] ?? 15;

        const match = existingVariants.find((v) => v.name === cleanSize || v.name === `Size: ${cleanSize}`);

        if (match) {
          await prisma.productVariant.update({
            where: { id: match.id },
            data: {
              priceOverride: price ? Number(price) : null,
              stockQuantity: Math.max(0, stock),
              isActive: true,
            },
          });
        } else {
          await prisma.productVariant.create({
            data: {
              productId: product.id,
              name: cleanSize,
              sku: `${product.sku}-${cleanSize}`.toUpperCase(),
              priceOverride: price ? Number(price) : null,
              stockQuantity: Math.max(0, stock),
              isActive: true,
            },
          });
        }
      }
    } else if (input.sizeStock) {
      for (const [sizeName, qty] of Object.entries(input.sizeStock)) {
        const variant = await prisma.productVariant.findFirst({
          where: {
            productId: product.id,
            OR: [{ name: sizeName }, { name: `Size: ${sizeName}` }],
          },
        });
        if (variant) {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: { stockQuantity: Math.max(0, qty) },
          });
        }
      }
    }

    revalidatePath("/");
    revalidatePath(`/product/${product.slug}`);
    revalidatePath("/admin/products");

    return { success: true, slug: product.slug };
  } catch (error: unknown) {
    console.error("updateProductAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update product." };
  }
}

export async function deleteProductAction(slug: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const cleanSlug = slug.trim().toLowerCase();
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug: cleanSlug }, { slug: cleanSlug.replace(/-/g, "") }],
      },
    });

    if (!product) {
      return { success: false, error: `Product '${slug}' not found.` };
    }

    // Check if product has orders
    const hasOrders = await prisma.orderItem.count({
      where: { productId: product.id },
    });

    if (hasOrders > 0) {
      // Safe deactivation instead of foreign key constraint failure
      await prisma.product.update({
        where: { id: product.id },
        data: { isActive: false },
      });
      revalidatePath("/");
      revalidatePath("/admin/products");
      return { success: true, message: "Product has order history; deactivated instead of deleted." };
    }

    await prisma.product.delete({
      where: { id: product.id },
    });

    revalidatePath("/");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (error: unknown) {
    console.error("deleteProductAction failed:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete product." };
  }
}
