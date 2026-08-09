import { products, formatBDT } from "./shop-data";

export { formatBDT };

export type OrderStatus = "pending" | "confirmed" | "processing" | "packed" | "shipped" | "delivered" | "cancelled" | "refund" | "hold" | "preorder" | "return" | "exchange" | "return-process";

export type OrderItem = {
  slug: string;
  name: string;
  size: string;
  qty: number;
  price: number;
};

export type Order = {
  id: string;
  customer: string;
  phone: string;
  city: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  isPreOrder?: boolean;
  sourcePageName?: string;
  socialMediaSourceName?: string;
  hasNotes?: boolean;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  city: string;
  orders: number;
  spent: number;
  since: string;
};

const CITIES = ["Dhaka", "Chattogram", "Sylhet", "Khulna", "Rajshahi", "Cumilla"];
const NAMES = [
  "Nusrat Jahan",
  "Tanvir Ahmed",
  "Farhan Rahman",
  "Sadia Islam",
  "Rifat Hossain",
  "Mehjabin Chowdhury",
  "Arif Mahmud",
  "Zarin Tasnim",
  "Imran Kabir",
  "Sumaiya Akter",
  "Rakib Hasan",
  "Nafisa Karim",
];
const STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled", "refund", "hold", "preorder", "return", "exchange", "return-process"];

// Deterministic pseudo-random so SSR and client render identical demo data.
function seeded(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function buildOrders(): Order[] {
  return [];
}

export const orders: Order[] = [];

export const customers: Customer[] = [];

export const revenueSeries: { date: string; revenue: number; orders: number }[] = [];

export const categoryShare: { category: string; value: number }[] = [];

export const topProducts: { slug: string; name: string; units: number; revenue: number }[] = [];

export const kpis = {
  revenue: 0,
  orders: 0,
  customers: 0,
  avgOrder: 0,
  pending: 0,
  cancelled: 0,
};

export const inventory = products.map((p) => ({
  ...p,
  stock: 0,
  sold: 0,
  margin: p.price - (p.purchaseRate ?? 0),
}));

export const statusStyles: Record<OrderStatus, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  confirmed: "bg-emerald-500/15 text-emerald-600",
  processing: "bg-blue-500/15 text-blue-600",
  packed: "bg-cyan-500/15 text-cyan-600",
  shipped: "bg-violet-500/15 text-violet-600",
  delivered: "bg-emerald-500/15 text-emerald-600",
  cancelled: "bg-destructive/15 text-destructive",
  refund: "bg-destructive/15 text-destructive",
  hold: "bg-slate-500/15 text-slate-600",
  preorder: "bg-indigo-500/15 text-indigo-600",
  return: "bg-orange-500/15 text-orange-600",
  exchange: "bg-teal-500/15 text-teal-600",
  "return-process": "bg-orange-500/15 text-orange-600",
};

export const currentCustomer = {
  name: "",
  email: "",
  phone: "",
  address: "",
  points: 0,
};

export const myOrders: Order[] = [];

export const wishlist = [];