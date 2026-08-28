import heroSummerImg from "@/assets/hero-summer.jpg";
import heroTeesImg from "@/assets/hero-tees.jpg";
import bannerOfferImg from "@/assets/banner-offer.jpg";
import catTshirtImg from "@/assets/cat-tshirt.jpg";
import catShirtImg from "@/assets/cat-shirt.jpg";
import catPanjabiImg from "@/assets/cat-panjabi.jpg";
import catHoodieImg from "@/assets/cat-hoodie.jpg";
import catTrouserImg from "@/assets/cat-trouser.jpg";

const heroSummer = typeof heroSummerImg === "string" ? heroSummerImg : heroSummerImg.src;
const heroTees = typeof heroTeesImg === "string" ? heroTeesImg : heroTeesImg.src;
const bannerOffer = typeof bannerOfferImg === "string" ? bannerOfferImg : bannerOfferImg.src;
const catTshirt = typeof catTshirtImg === "string" ? catTshirtImg : catTshirtImg.src;
const catShirt = typeof catShirtImg === "string" ? catShirtImg : catShirtImg.src;
const catPanjabi = typeof catPanjabiImg === "string" ? catPanjabiImg : catPanjabiImg.src;
const catHoodie = typeof catHoodieImg === "string" ? catHoodieImg : catHoodieImg.src;
const catTrouser = typeof catTrouserImg === "string" ? catTrouserImg : catTrouserImg.src;

export type Category = {
  id?: number;
  slug: string;
  name: string;
  image: string;
  blurb: string;
  parentCategoryId?: number | null;
  parentSlug?: string | null;
  parentName?: string | null;
  subCategories?: Category[];
};

export type Product = {
  id?: string;
  slug: string;
  name: string;
  category: string;
  subcategory?: string;
  categoryId?: number;
  subcategoryId?: number;
  categoryName?: string;
  subcategoryName?: string;
  price: number;
  compareAt?: number;
  mrp?: number;
  image: string;
  imageUrl?: string;
  sizes: string[];
  description: string;
  shortDescription?: string;
  discountNote?: string;
  badge?: string;
  purchaseRate: number;
  sizePrices?: Record<string, number>;
  sizeStock?: Record<string, number>;
  videoUrl?: string;
  returnPolicy?: string;
  isBundle?: boolean;
  bundleProducts?: string[];
  images?: string[];
  isActive?: boolean;
  acceptPreOrder?: boolean;
};

export const getSizePrice = (product: Product, size: string): number =>
  product.sizePrices?.[size] ?? product.price;

export const getSizeStock = (product: Product, size: string): number =>
  product.sizeStock?.[size] ?? 15;

/**
 * Checks if a specific size of a product is orderable based on:
 * 1) AvailableStock >= requestedQuantity
 * 2) OR Stock < requestedQuantity AND acceptPreOrder === true
 */
export const isSizeOrderable = (
  product: Product,
  size: string,
  requestedQty: number = 1
): boolean => {
  const stock = getSizeStock(product, size);
  if (stock >= requestedQty) return true;
  return !!product.acceptPreOrder;
};

/**
 * Checks if at least one size in the product is orderable or product has acceptPreOrder
 */
export const isProductOrderable = (product: Product): boolean => {
  if (product.acceptPreOrder) return true;
  if (!product.sizes || product.sizes.length === 0) return true;
  return product.sizes.some((s) => (product.sizeStock?.[s] ?? 15) > 0);
};

export const COLOR_MAP: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  navy: "#1e293b",
  blue: "#2563eb",
  "royal blue": "#1d4ed8",
  red: "#dc2626",
  crimson: "#991b1b",
  maroon: "#800000",
  green: "#16a34a",
  emerald: "#059669",
  olive: "#808000",
  yellow: "#ca8a04",
  amber: "#d97706",
  orange: "#ea580c",
  purple: "#9333ea",
  pink: "#db2777",
  charcoal: "#374151",
  grey: "#6b7280",
  gray: "#6b7280",
  beige: "#f5f5dc",
  brown: "#78350f",
  cream: "#fffdd0",
};

export const getColorHex = (colorNameOrHex: string): string => {
  if (!colorNameOrHex) return "#94a3b8";
  const trimmed = colorNameOrHex.trim();
  if (trimmed.startsWith("#") || trimmed.startsWith("rgb") || trimmed.startsWith("hsl")) {
    return trimmed;
  }
  const normalized = trimmed.toLowerCase();
  return COLOR_MAP[normalized] || "#64748b";
};

export const offerBanner = {
  image: bannerOffer,
  title: "Eid Bundle",
  subtitle: "Buy 2, save 20%",
};

export const categories: Category[] = [
  { id: 1, slug: "t-shirts", name: "T-Shirts", image: catTshirt, blurb: "Everyday heavyweight cotton", parentCategoryId: null, parentSlug: null },
  { id: 2, slug: "shirts", name: "Shirts", image: catShirt, blurb: "Linen, oxford & cotton", parentCategoryId: null, parentSlug: null },
  { id: 3, slug: "panjabi", name: "Panjabi", image: catPanjabi, blurb: "Festive & everyday", parentCategoryId: null, parentSlug: null },
  { id: 4, slug: "hoodies", name: "Hoodies", image: catHoodie, blurb: "Winter-ready fleece", parentCategoryId: null, parentSlug: null },
  { id: 5, slug: "trousers", name: "Trousers", image: catTrouser, blurb: "Chinos & joggers", parentCategoryId: null, parentSlug: null },
  // Sub-categories
  { id: 6, slug: "graphic-tees", name: "Graphic Tees", image: catTshirt, blurb: "Printed & graphic heavyweight tees", parentCategoryId: 1, parentSlug: "t-shirts", parentName: "T-Shirts" },
  { id: 7, slug: "heavyweight-tees", name: "Heavyweight Tees", image: catTshirt, blurb: "240 GSM dense cotton essentials", parentCategoryId: 1, parentSlug: "t-shirts", parentName: "T-Shirts" },
  { id: 8, slug: "linen-shirts", name: "Linen Shirts", image: catShirt, blurb: "Pure breathable linen wear", parentCategoryId: 2, parentSlug: "shirts", parentName: "Shirts" },
  { id: 9, slug: "formal-shirts", name: "Formal Shirts", image: catShirt, blurb: "Crisp cotton & oxford shirts", parentCategoryId: 2, parentSlug: "shirts", parentName: "Shirts" },
  { id: 10, slug: "heritage-panjabi", name: "Heritage Panjabi", image: catPanjabi, blurb: "Jacquard & premium festive panjabi", parentCategoryId: 3, parentSlug: "panjabi", parentName: "Panjabi" },
  { id: 11, slug: "stretch-chinos", name: "Stretch Chinos", image: catTrouser, blurb: "Comfortable flexible daily chinos", parentCategoryId: 5, parentSlug: "trousers", parentName: "Trousers" },
];

const SIZES = ["M", "L", "XL", "XXL"];

export const products: Product[] = [
  {
    slug: "midnight-heavy-tee",
    name: "Midnight Heavyweight Tee",
    category: "t-shirts",
    price: 790,
    compareAt: 990,
    mrp: 990,
    image: catTshirt,
    sizes: SIZES,
    description:
      "A 240 GSM combed cotton tee with a boxy fall, ribbed neck and pre-shrunk finish. Keeps its shape after every wash.",
    badge: "Best seller",
    purchaseRate: 450,
    sizePrices: { M: 790, L: 820, XL: 850, XXL: 890 },
    images: [catShirt, catPanjabi, catHoodie],
  },
  {
    slug: "arza-graphic-tee",
    name: "Arza Rooftop Graphic Tee",
    category: "t-shirts",
    price: 890,
    mrp: 1090,
    image: catTshirt,
    sizes: SIZES,
    description:
      "Oversized silhouette with a hand-drawn print, screen printed with water-based ink so the graphic stays soft.",
    purchaseRate: 520,
    sizePrices: { M: 890, L: 920, XL: 950, XXL: 990 },
    images: [catShirt, catHoodie],
  },
  {
    slug: "cloudlight-linen-shirt",
    name: "Cloudlight Linen Shirt",
    category: "shirts",
    price: 1490,
    compareAt: 1890,
    mrp: 1890,
    image: catShirt,
    sizes: SIZES,
    description:
      "Airy 100% linen weave with a soft collar and coconut buttons. Built for humid afternoons and long commutes.",
    badge: "New",
    purchaseRate: 980,
    sizePrices: { M: 1490, L: 1550, XL: 1590, XXL: 1650 },
    images: [catTshirt, catTrouser],
  },
  {
    slug: "oxford-everyday-shirt",
    name: "Everyday Oxford Shirt",
    category: "shirts",
    price: 1350,
    mrp: 1550,
    image: catShirt,
    sizes: SIZES,
    description:
      "Classic oxford cotton with a slightly relaxed fit. Works tucked in for the office and open over a tee.",
    purchaseRate: 850,
    sizePrices: { M: 1350, L: 1390, XL: 1450, XXL: 1490 },
    images: [catTshirt, catTrouser],
  },
  {
    slug: "noor-cotton-panjabi",
    name: "Noor Cotton Panjabi",
    category: "panjabi",
    price: 2390,
    compareAt: 2790,
    mrp: 2790,
    image: catPanjabi,
    sizes: SIZES,
    description:
      "Fine cotton panjabi with tonal chikan-style embroidery along the placket and cuffs. Festive without the fuss.",
    badge: "Eid pick",
    purchaseRate: 1650,
    sizePrices: { M: 2390, L: 2490, XL: 2590, XXL: 2690 },
    images: [catShirt, catHoodie],
  },
  {
    slug: "shomoy-panjabi",
    name: "Shomoy Slim Panjabi",
    category: "panjabi",
    price: 1990,
    mrp: 2290,
    image: catPanjabi,
    sizes: SIZES,
    description:
      "Slim-cut panjabi in breathable viscose-cotton with a mandarin collar and side vents for easy movement.",
    purchaseRate: 1300,
    sizePrices: { M: 1990, L: 2090, XL: 2150, XXL: 2190 },
    images: [catShirt, catHoodie],
  },
  {
    slug: "winterfold-hoodie",
    name: "Winterfold Fleece Hoodie",
    category: "hoodies",
    price: 1790,
    compareAt: 2190,
    mrp: 2190,
    image: catHoodie,
    sizes: SIZES,
    description:
      "Brushed fleece inside, dense knit outside, with a double-layer hood and kangaroo pocket that holds its shape.",
    purchaseRate: 1150,
    sizePrices: { M: 1790, L: 1850, XL: 1890, XXL: 1950 },
    images: [catTshirt, catTrouser],
  },
  {
    slug: "campus-chino",
    name: "Campus Stretch Chino",
    category: "trousers",
    price: 1690,
    mrp: 1990,
    image: catTrouser,
    sizes: ["30", "32", "34", "36", "38"],
    description:
      "Mid-rise chino in stretch twill with a tapered leg and deep pockets. Holds a crease, survives a rickshaw ride.",
    badge: "New",
    purchaseRate: 1050,
    sizePrices: { "30": 1690, "32": 1690, "34": 1750, "36": 1790, "38": 1850 },
    images: [catShirt, catTshirt],
  },
  {
    slug: "tshirt-trouser-combo",
    name: "T-Shirt & Trouser Combo",
    category: "t-shirts",
    price: 1290,
    mrp: 1680,
    image: catTshirt,
    sizes: ["M+32", "L+34", "XL+36"],
    description: "Pair our bestselling heavyweight tee with the active stretch trousers. A versatile combo.",
    badge: "Bundle Save",
    purchaseRate: 800,
    isBundle: true,
    bundleProducts: ["midnight-heavy-tee", "campus-chino"],
    images: [catTrouser],
  },
  {
    slug: "summer-linen-set",
    name: "Summer Linen Set",
    category: "shirts",
    price: 1800,
    mrp: 2380,
    image: catShirt,
    sizes: ["M", "L", "XL"],
    description: "Two premium light linen shirts to beat the summer heat.",
    badge: "Bundle Save",
    purchaseRate: 1100,
    isBundle: true,
    bundleProducts: ["cloudlight-linen-shirt", "cloudlight-linen-shirt"],
    images: [catShirt],
  },
  {
    slug: "premium-tee-trio",
    name: "Premium Tee Trio",
    category: "t-shirts",
    price: 1350,
    mrp: 1770,
    image: catTshirt,
    sizes: ["M", "L", "XL"],
    description: "Get 3 of our premium combed cotton tees in a single package.",
    badge: "Popular Bundle",
    purchaseRate: 900,
    isBundle: true,
    bundleProducts: ["midnight-heavy-tee", "arza-graphic-tee", "midnight-heavy-tee"],
    images: [catTshirt],
  },
];

export const formatBDT = (amount: number) => `${amount.toLocaleString("en-US")} TK`;

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
export const productsByCategory = (slug: string) =>
  products.filter((p) => p.category === slug);

export type ComboOffer = {
  slug: string;
  title: string;
  subtitle: string;
  items: string[];
  price: number;
  compareAt: number;
  image: string;
  description: string;
};

export const comboOffers: ComboOffer[] = [
  {
    slug: "summer-2pc",
    title: "Summer 2-Piece Combo",
    subtitle: "1 Tee + 1 Linen Shirt",
    items: ["midnight-heavy-tee", "cloudlight-linen-shirt"],
    price: 1990,
    compareAt: 2280,
    image: catShirt,
    description:
      "Pair our bestselling heavyweight tee with the breathable Cloudlight linen shirt. A versatile combo that takes you from a casual day out to an evening meetup.",
  },
  {
    slug: "eid-3pc",
    title: "Eid 3-Piece Combo",
    subtitle: "1 Panjabi + 1 Tee + 1 Chino",
    items: ["noor-cotton-panjabi", "arza-graphic-tee", "campus-chino"],
    price: 4490,
    compareAt: 4870,
    image: catPanjabi,
    description:
      "A complete festive look: the Noor cotton panjabi, an oversized graphic tee for layering, and stretch chinos for all-day comfort.",
  },
  {
    slug: "winter-2pc",
    title: "Winter 2-Piece Combo",
    subtitle: "1 Hoodie + 1 Chino",
    items: ["winterfold-hoodie", "campus-chino"],
    price: 2990,
    compareAt: 3480,
    image: catHoodie,
    description:
      "Brushed fleece hoodie paired with stretch chinos. Warm, structured, and ready for Dhaka's short winter.",
  },
];

export const getComboOffer = (slug: string) => comboOffers.find((c) => c.slug === slug);