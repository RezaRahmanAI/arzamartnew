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

  // 2. Seed Categories
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
    }
    catMap[c.slug] = cat.id;
  }

  // 3. Seed Products
  const products = [
    {
      slug: "midnight-heavy-tee",
      name: "Midnight Heavyweight Tee",
      categorySlug: "t-shirts",
      price: 790,
      compareAt: 990,
      image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
      description: "A 240 GSM combed cotton tee with a boxy fall, ribbed neck and pre-shrunk finish. Keeps its shape after every wash.",
      badge: "Best seller",
      purchaseRate: 450,
      sizes: ["M", "L", "XL", "XXL"],
    },
    {
      slug: "arza-graphic-tee",
      name: "Arza Rooftop Graphic Tee",
      categorySlug: "t-shirts",
      price: 890,
      compareAt: 1090,
      image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
      description: "Oversized silhouette with a hand-drawn print, screen printed with water-based ink so the graphic stays soft.",
      badge: "New",
      purchaseRate: 520,
      sizes: ["M", "L", "XL", "XXL"],
    },
    {
      slug: "cloudlight-linen-shirt",
      name: "Cloudlight Linen Shirt",
      categorySlug: "shirts",
      price: 1390,
      compareAt: 1690,
      image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800",
      description: "Pure Belgian linen woven for breathable comfort in tropical humidity. Mother-of-pearl buttons, curved hem.",
      purchaseRate: 850,
      sizes: ["M", "L", "XL", "XXL"],
    },
    {
      slug: "festive-cotton-panjabi",
      name: "Heritage Jacquard Panjabi",
      categorySlug: "panjabi",
      price: 1890,
      compareAt: 2290,
      image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800",
      description: "Fine combed cotton with subtle jacquard weave, Mandarin collar, concealed placket and side pockets.",
      badge: "Festive",
      purchaseRate: 1100,
      sizes: ["M", "L", "XL", "XXL"],
    },
    {
      slug: "heavy-fleece-hoodie",
      name: "360 GSM Heavy Fleece Hoodie",
      categorySlug: "hoodies",
      price: 1590,
      compareAt: 1990,
      image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800",
      description: "Heavyweight brushed fleece with a double-layered hood, ribbed cuffs and a kangaroo pocket built to last.",
      purchaseRate: 920,
      sizes: ["M", "L", "XL", "XXL"],
    },
    {
      slug: "stretch-chinos-black",
      name: "Everyday Stretch Chinos",
      categorySlug: "trousers",
      price: 1190,
      compareAt: 1490,
      image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800",
      description: "Tailored slim fit with 3% elastane for unrestricted movement. Deep pockets, YKK zipper, reinforced waistband.",
      purchaseRate: 700,
      sizes: ["30", "32", "34", "36"],
    },
  ];

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!existing) {
      const categoryId = catMap[p.categorySlug] || 1;
      const sku = `ARZA-${p.slug.toUpperCase().slice(0, 10)}`;

      const prod = await prisma.product.create({
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
          purchaseRate: p.purchaseRate,
          badge: p.badge || null,
          isFeatured: true,
          isActive: true,
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

      // Variants
      for (let i = 0; i < p.sizes.length; i++) {
        const sizeName = p.sizes[i];
        await prisma.productVariant.create({
          data: {
            productId: prod.id,
            name: sizeName,
            sku: `${sku}-${sizeName}`,
            stockQuantity: 50,
            isActive: true,
          },
        });
      }

      console.log(`Created product: ${p.name}`);
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
        websiteShortName: "ARZA",
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
        companyName: "ARZA Fashion",
        ownerName: "Arza Management",
        supportPhone: "+880 1800 000000",
        salesPhone: "+880 1800 000000",
        whatsAppNumber: "+880 1800 000000",
        emailAddress: "support@arzamart.com",
        supportEmail: "support@arzamart.com",
        officeAddress: "Dhaka, Bangladesh",
        googleMapEmbedUrl: "",
      },
      shipping: {
        rules: [
          { id: "inside-dhaka", name: "Inside Dhaka", charge: 60, estimatedDeliveryTime: "24-48 Hours", status: "active", displayOrder: 1 },
          { id: "outside-dhaka", name: "Outside Dhaka", charge: 120, estimatedDeliveryTime: "2-3 Days", status: "active", displayOrder: 2 },
        ],
        defaultShippingMethodId: "inside-dhaka",
        freeShippingThreshold: 1500,
        enableFreeShipping: true,
        cashOnDeliveryAvailable: true,
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
