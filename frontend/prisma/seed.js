const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

function hashPassword(pass) {
  return crypto.createHash("sha256").update(pass).digest("hex");
}

async function main() {
  console.log("Seeding arzamart database...");

  // 1. Seed Brand
  let brand = await prisma.brand.findFirst();
  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        name: "ARZA",
        slug: "arza",
        isActive: true,
      },
    });
    console.log("Created brand: ARZA");
  }

  // 2. Seed Categories & Sub-Categories
  const categoryDefs = [
    { slug: "t-shirts", name: "T-Shirts", image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800", displayOrder: 1 },
    { slug: "shirts", name: "Shirts", image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800", displayOrder: 2 },
    { slug: "panjabi", name: "Panjabi", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800", displayOrder: 3 },
    { slug: "hoodies", name: "Hoodies", image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800", displayOrder: 4 },
    { slug: "trousers", name: "Trousers", image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800", displayOrder: 5 },
  ];

  const catMap = {};
  for (const c of categoryDefs) {
    let cat = await prisma.category.findFirst({ where: { slug: c.slug } });
    if (!cat) {
      cat = await prisma.category.create({
        data: {
          name: c.name,
          slug: c.slug,
          imageUrl: c.image,
          displayOrder: c.displayOrder,
          isActive: true,
        },
      });
      console.log(`Created category: ${c.name}`);
    } else {
      cat = await prisma.category.update({
        where: { id: cat.id },
        data: {
          name: c.name,
          imageUrl: c.image,
          displayOrder: c.displayOrder,
          isActive: true,
        },
      });
    }
    catMap[c.slug] = cat.id;
  }

  // 2.1 Seed Sub-Categories
  const subCategoryDefs = [
    { slug: "graphic-tees", name: "Graphic Tees", parentSlug: "t-shirts", image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800", displayOrder: 1 },
    { slug: "heavyweight-tees", name: "Heavyweight Tees", parentSlug: "t-shirts", image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800", displayOrder: 2 },
    { slug: "linen-shirts", name: "Linen Shirts", parentSlug: "shirts", image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800", displayOrder: 1 },
    { slug: "formal-shirts", name: "Formal Shirts", parentSlug: "shirts", image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800", displayOrder: 2 },
    { slug: "heritage-panjabi", name: "Heritage Panjabi", parentSlug: "panjabi", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800", displayOrder: 1 },
    { slug: "stretch-chinos", name: "Stretch Chinos", parentSlug: "trousers", image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800", displayOrder: 1 },
  ];

  for (const sc of subCategoryDefs) {
    const parentId = catMap[sc.parentSlug];
    let subCat = await prisma.category.findFirst({ where: { slug: sc.slug } });
    if (!subCat) {
      subCat = await prisma.category.create({
        data: {
          name: sc.name,
          slug: sc.slug,
          imageUrl: sc.image,
          parentCategoryId: parentId,
          displayOrder: sc.displayOrder,
          isActive: true,
        },
      });
      console.log(`Created sub-category: ${sc.name} (Parent: ${sc.parentSlug})`);
    } else {
      subCat = await prisma.category.update({
        where: { id: subCat.id },
        data: {
          name: sc.name,
          imageUrl: sc.image,
          parentCategoryId: parentId,
          displayOrder: sc.displayOrder,
          isActive: true,
        },
      });
    }
    catMap[sc.slug] = subCat.id;
  }

  // 3. Seed Products
  const products = [
    {
      slug: "midnight-heavy-tee",
      name: "Midnight Heavyweight Tee",
      categorySlug: "heavyweight-tees",
      price: 790,
      compareAt: 990,
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
      description: "A 240 GSM combed cotton tee with a boxy fall, ribbed neck and pre-shrunk finish. Keeps its shape after every wash.",
      badge: "Best seller",

      sizes: ["S", "M", "L", "XL", "XXL"],
    },
    {
      slug: "arza-graphic-tee",
      name: "Arza Rooftop Graphic Tee",
      categorySlug: "graphic-tees",
      price: 890,
      compareAt: 1090,
      image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
      description: "Oversized silhouette with a hand-drawn print, screen printed with water-based ink so the graphic stays soft.",
      badge: "New",

      sizes: ["S", "M", "L", "XL", "XXL"],
    },
    {
      slug: "cloudlight-linen-shirt",
      name: "Cloudlight Linen Shirt",
      categorySlug: "linen-shirts",
      price: 1390,
      compareAt: 1690,
      image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800",
      description: "Pure Belgian linen woven for breathable comfort in tropical humidity. Mother-of-pearl buttons, curved hem.",

      sizes: ["M", "L", "XL", "XXL"],
    },
    {
      slug: "festive-cotton-panjabi",
      name: "Heritage Jacquard Panjabi",
      categorySlug: "heritage-panjabi",
      price: 1890,
      compareAt: 2290,
      image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800",
      description: "Fine combed cotton with subtle jacquard weave, Mandarin collar, concealed placket and side pockets.",
      badge: "Festive",

      sizes: ["38", "40", "42", "44", "46"],
    },
    {
      slug: "heavy-fleece-hoodie",
      name: "360 GSM Heavy Fleece Hoodie",
      categorySlug: "hoodies",
      price: 1590,
      compareAt: 1990,
      image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800",
      description: "Heavyweight brushed fleece with a double-layered hood, ribbed cuffs and a kangaroo pocket built to last.",

      sizes: ["M", "L", "XL", "XXL"],
    },
    {
      slug: "stretch-chinos-black",
      name: "Everyday Stretch Chinos",
      categorySlug: "stretch-chinos",
      price: 1190,
      compareAt: 1490,
      image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800",
      description: "Tailored slim fit with 3% elastane for unrestricted movement. Deep pockets, YKK zipper, reinforced waistband.",

      sizes: ["28", "30", "32", "34", "36"],
    },
    // Combo / Bundle Products
    {
      slug: "tshirt-trouser-combo",
      name: "T-Shirt & Trouser Combo",
      categorySlug: "t-shirts",
      price: 1290,
      compareAt: 1680,
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
      description: "Pair our bestselling heavyweight tee with the active stretch trousers. A versatile combo.",
      badge: "Bundle Save",

      sizes: ["M+32", "L+34", "XL+36"],
      isBundle: true,
      bundleProducts: ["midnight-heavy-tee", "stretch-chinos-black"],
    },
    {
      slug: "summer-linen-set",
      name: "Summer Linen Set",
      categorySlug: "shirts",
      price: 1800,
      compareAt: 2380,
      image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800",
      description: "Two premium light linen shirts to beat the summer heat in classic shades.",
      badge: "Bundle Save",

      sizes: ["M", "L", "XL"],
      isBundle: true,
      bundleProducts: ["cloudlight-linen-shirt", "cloudlight-linen-shirt"],
    },
    {
      slug: "premium-tee-trio",
      name: "Premium Tee Trio",
      categorySlug: "t-shirts",
      price: 1350,
      compareAt: 1770,
      image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
      description: "Get 3 of our premium combed cotton tees in a single value pack.",
      badge: "Popular Bundle",

      sizes: ["M", "L", "XL"],
      isBundle: true,
      bundleProducts: ["midnight-heavy-tee", "arza-graphic-tee", "midnight-heavy-tee"],
    },
  ];

  for (const p of products) {
    const categoryId = catMap[p.categorySlug] || 1;
    const sku = `ARZA-${p.slug.toUpperCase().slice(0, 10)}`;

    let prod = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!prod) {
      prod = await prisma.product.create({
        data: {
          brandId: brand.id,
          categoryId,
          name: p.name,
          slug: p.slug,
          sku,
          shortDescription: p.description,
          fullDescription: p.description,
          basePrice: p.price,
          discountPrice: p.compareAt && p.compareAt > p.price ? p.compareAt : null,
          badge: p.badge || null,
          isFeatured: true,
          isActive: true,
          isBundle: p.isBundle || false,
          bundleProducts: p.bundleProducts ? JSON.stringify(p.bundleProducts) : null,
          averageRating: 5.0,
          reviewCount: 12,
        },
      });

      // Images
      await prisma.productImage.create({
        data: {
          productId: prod.id,
          imageUrl: p.image,
          isMain: true,
          displayOrder: 0,
        },
      });
      console.log(`Created product: ${p.name}`);
    } else {
      // Update existing product attributes if needed
      await prisma.product.update({
        where: { id: prod.id },
        data: {
          isBundle: p.isBundle || false,
          bundleProducts: p.bundleProducts ? JSON.stringify(p.bundleProducts) : null,
        },
      });
    }

    // Upsert / refresh variants and remove 'Standard' size if present
    await prisma.productVariant.deleteMany({
      where: {
        productId: prod.id,
        name: { in: ["Standard", "standard", "Default"] },
      },
    });

    for (let i = 0; i < p.sizes.length; i++) {
      const sizeName = p.sizes[i];
      const variantSku = `${sku}-${sizeName.replace(/[^a-zA-Z0-9]/g, "")}`;
      const existingVar = await prisma.productVariant.findFirst({
        where: { productId: prod.id, name: sizeName },
      });

      if (!existingVar) {
        await prisma.productVariant.create({
          data: {
            productId: prod.id,
            name: sizeName,
            sku: variantSku,
            stockQuantity: 50,
            isActive: true,
          },
        });
      }
    }
  }

  // 4. Seed Banners
  const bannerDefs = [
    {
      title: "Summer Drop",
      subtitle: "Heavyweight tees made for Dhaka heat.",
      imageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1600",
      targetUrl: "/category/t-shirts",
      position: "slider",
      displayOrder: 1,
    },
    {
      title: "Everyday Shirts",
      subtitle: "Breathable linen and premium cotton.",
      imageUrl: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=1600",
      targetUrl: "/category/shirts",
      position: "slider",
      displayOrder: 2,
    },
    {
      title: "Eid Bundle",
      subtitle: "Buy 2, save 20%",
      imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1200",
      targetUrl: "/offers",
      position: "offer",
      displayOrder: 1,
    },
  ];

  for (const b of bannerDefs) {
    const existing = await prisma.banner.findFirst({ where: { title: b.title } });
    if (!existing) {
      await prisma.banner.create({
        data: {
          title: b.title,
          subtitle: b.subtitle,
          imageUrl: b.imageUrl,
          targetUrl: b.targetUrl,
          position: b.position,
          displayOrder: b.displayOrder,
          isActive: true,
        },
      });
      console.log(`Created banner: ${b.title}`);
    }
  }

  // 5. Seed Website Settings
  const existingSettings = await prisma.websiteSettings.findFirst();
  if (!existingSettings) {
    const defaultSettings = {
      general: {
        websiteName: "ARZA",
        tagline: "Everyday Fashion in Bangladesh",
        description: "Cotton tees, linen shirts, panjabi and more. Cash on delivery nationwide.",
        websiteStatus: "live",
        maintenanceMessage: "We will be back shortly.",
        defaultLanguage: "en",
        defaultCurrency: "BDT",
        currencySymbol: "৳",
        timeZone: "Asia/Dhaka",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "12h",
      },
      branding: {
        headerLogo: "",
        footerLogo: "",
        darkLogo: "",
        lightLogo: "",
        favicon: "",
        mobileLogo: "",
        primaryColor: "#0f172a",
        secondaryColor: "#f1f5f9",
        accentColor: "#f43f5e",
        buttonColor: "#0f172a",
        borderRadius: "0.75rem",
        fontFamily: "DM Sans, sans-serif",
      },
      contact: {
        supportPhone: "+880 1800 000000",
        whatsAppNumber: "+880 1800 000000",
        supportEmail: "support@arzamart.com",
        officeAddress: "Dhaka, Bangladesh",
        googleMapEmbedUrl: "",
      },
      shipping: {
        rules: [
          { id: "inside-dhaka", name: "Inside Dhaka", charge: 70, estimatedDeliveryTime: "24-48 Hours", status: "active", displayOrder: 1 },
          { id: "dhaka-sub-area", name: "Dhaka Sub-Area", charge: 120, estimatedDeliveryTime: "24-72 Hours", status: "active", displayOrder: 2 },
          { id: "outside-dhaka", name: "Outside Dhaka", charge: 150, estimatedDeliveryTime: "2-3 Days", status: "active", displayOrder: 3 },
        ],
        defaultShippingMethodId: "inside-dhaka",
        enableFreeShipping: true,
        cashOnDeliveryAvailable: true,
        quantityOffers: [
          { id: "free-delivery-2", minQty: 2, offerType: "free_delivery", title: "২ পিস নিলে ডেলিভারি চার্জ ফ্রি!", active: true, applicableTo: ["normal", "combo"] },
          { id: "discount-200-2", minQty: 2, offerType: "fixed_discount", discountAmount: 200, title: "২ পিস নিলে ২০০ টাকা ছাড়!", active: true, applicableTo: ["normal", "combo"] },
          { id: "discount-300-3", minQty: 3, offerType: "fixed_discount", discountAmount: 300, title: "৩ পিস নিলে ৩০০ টাকা ছাড়!", active: true, applicableTo: ["normal", "combo"] },
        ],
      },
      navigation: {
        headerMenu: [
          { id: "1", label: "T-Shirts", url: "/category/t-shirts", target: "_self", active: true },
          { id: "2", label: "Shirts", url: "/category/shirts", target: "_self", active: true },
          { id: "3", label: "Panjabi", url: "/category/panjabi", target: "_self", active: true },
          { id: "4", label: "Hoodies", url: "/category/hoodies", target: "_self", active: true },
        ],
      },
      footer: {
        footerDescription: "Everyday premium fashion made in Bangladesh. Cash on delivery available nationwide.",
        copyrightText: `© ${new Date().getFullYear()} ARZA. All rights reserved.`,
      },
    };

    await prisma.websiteSettings.create({
      data: {
        siteName: "ARZA",
        logoUrl: "",
        supportEmail: "support@arzamart.com",
        supportPhone: "+880 1800 000000",
        currencySymbol: "৳",
        metaTitle: "ARZA — Everyday Fashion in Bangladesh",
        metaDescription: "Cotton tees, linen shirts, panjabi and more. Cash on delivery nationwide.",
        keywords: "fashion, clothing, bangladesh, tees, shirts",
        facebookUrl: "https://facebook.com/arzamart",
        instagramUrl: "https://instagram.com/arzamart",
        youtubeUrl: "",
        footerCopyright: `© ${new Date().getFullYear()} ARZA. All rights reserved.`,
        deliveryInsideDhaka: "60",
        deliveryOutsideDhaka: "120",
        settingsJson: JSON.stringify(defaultSettings),
      },
    });
    console.log("Created default website settings");
  }

  // 6. Seed Admin User
  const adminEmail = "admin@arzamart.com";
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashPassword("admin123"),
        firstName: "Super",
        lastName: "Admin",
        role: 1, // Admin
        isActive: true,
      },
    });
    console.log("Created admin user: admin@arzamart.com (password: admin123)");
  }

  // 7. Seed Bangladesh Courier Services
  const courierDefs = [
    {
      name: "Steadfast Courier",
      code: "steadfast",
      contactPerson: "Steadfast Support",
      phone: "09678-045045",
      email: "support@steadfast.com.bd",
      website: "https://steadfast.com.bd",
      apiStatus: "simulated",
      notes: "Nationwide express COD delivery partner with daily pickup.",
      isActive: true,
      displayOrder: 1,
    },
    {
      name: "Pathao Courier",
      code: "pathao",
      contactPerson: "Pathao Merchant Desk",
      phone: "09610-003030",
      email: "merchant@pathao.com",
      website: "https://merchant.pathao.com",
      apiStatus: "simulated",
      notes: "Fast delivery inside Dhaka and major divisional cities.",
      isActive: true,
      displayOrder: 2,
    },
    {
      name: "RedX Delivery",
      code: "redx",
      contactPerson: "RedX Business Team",
      phone: "09612-223344",
      email: "support@redx.com.bd",
      website: "https://redx.com.bd",
      apiStatus: "manual",
      notes: "Comprehensive doorstep delivery with automated tracking.",
      isActive: true,
      displayOrder: 3,
    },
    {
      name: "Paperfly",
      code: "paperfly",
      contactPerson: "Paperfly Logistics",
      phone: "09606-000555",
      email: "info@paperfly.com.bd",
      website: "https://paperfly.com.bd",
      apiStatus: "manual",
      notes: "Doorstep delivery across all union parishads in Bangladesh.",
      isActive: true,
      displayOrder: 4,
    },
    {
      name: "Sundarban Courier Service",
      code: "sundarban",
      contactPerson: "Sundarban Head Office",
      phone: "02-9568725",
      email: "info@sundarbancourier.com",
      website: "https://sundarbancourier.com",
      apiStatus: "manual",
      notes: "Branch-to-branch and condition parcel delivery.",
      isActive: false,
      displayOrder: 5,
    },
    {
      name: "SA Paribahan",
      code: "sa-paribahan",
      contactPerson: "SA Paribahan Desk",
      phone: "02-9333333",
      email: "info@saparibahan.com",
      website: "https://saparibahan.com",
      apiStatus: "manual",
      notes: "Condition parcel and cash delivery across countrywide stations.",
      isActive: false,
      displayOrder: 6,
    },
  ];

  for (const c of courierDefs) {
    const existing = await prisma.courier.findUnique({ where: { code: c.code } });
    if (!existing) {
      await prisma.courier.create({ data: c });
      console.log(`Created courier: ${c.name} (${c.isActive ? "Active" : "Inactive"})`);
    }
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
