"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Minus, Plus, Search, Trash2, RotateCcw, ShoppingBag, X, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { generateOrderId, useOrders, type Order, type OrderItem } from "@/lib/orders";
import { getSizePrice, type Product } from "@/lib/shop-data";
import { useProducts } from "@/lib/products-store";
import { useSettings } from "@/context/settings-context";
import { CITY_AREAS_MAP as INITIAL_CITY_AREAS_MAP, DEFAULT_CITIES, DEFAULT_AREAS } from "@/lib/location-data";
import { getImageUrl, handleImageError } from "@/lib/utils";
import { getSavedNotesStore, saveNotesStore, type NoteRecord } from "@/components/admin/order-notes-modal";

// Source Pages & Social Pages are now managed from Settings > Social Media Links.
// Fallback defaults are kept in case settings haven't loaded yet.
const FALLBACK_SOURCES: Record<string, string[]> = {
  "Facebook Page": ["Alzeena Official FB Page"],
  "Instagram DM": ["Alzeena Main IG (@alzeena.official)"],
  "WhatsApp": ["WhatsApp Hotline 1 (01700-000000)"],
  "TikTok": ["Alzeena Official TikTok (@alzeena.bd)"],
  "Website": ["Alzeena Main Website (alzeena.com)"],
  "Phone Call": ["Hotline 1 (Sales Dept)"],
  "In-Store POS": ["Uttara Branch Outlet"],
};

type CartLine = {
  key: string;
  slug: string;
  name: string;
  size: string;
  color: string;
  qty: number;
  price: number;
  availableSizes?: string[];
  availableColors?: string[];
};

let uniqueKeyCounter = 0;

// Searchable Combobox Component
function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase().trim())
  );

  const searchTrim = search.trim();
  const exactMatch = options.some((o) => o.toLowerCase() === searchTrim.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-9 justify-between font-normal text-xs bg-background hover:bg-background/80"
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="size-3.5 opacity-50 shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-2 bg-popover shadow-md border border-border" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to search..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.length === 0 && !searchTrim && (
            <p className="text-xs text-muted-foreground text-center py-2">No options available</p>
          )}
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
                setSearch("");
              }}
              className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs text-left cursor-pointer transition-colors ${
                value === opt
                  ? "bg-primary/15 font-semibold text-primary"
                  : "hover:bg-secondary/60 text-foreground"
              }`}
            >
              <span className="truncate">{opt}</span>
              {value === opt && <Check className="size-3.5 text-primary shrink-0 ml-1" />}
            </button>
          ))}
          {searchTrim && !exactMatch && (
            <button
              type="button"
              onClick={() => {
                onChange(searchTrim);
                setOpen(false);
                setSearch("");
              }}
              className="flex w-full items-center gap-1 rounded px-2.5 py-1.5 text-xs text-left font-semibold text-primary hover:bg-primary/10 cursor-pointer"
            >
              <span>+ Use &ldquo;{searchTrim}&rdquo;</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AdminManualOrder() {
  const searchParams = useSearchParams();
  const editOrderId = searchParams ? searchParams.get("edit") : null;
  const { addOrder, generateNextOrderId, orders } = useOrders();
  const { products } = useProducts();
  const { settings } = useSettings();

  // Derive source pages from centralized settings
  const socialPageMapBySource = (settings.socialMedia.sources && Object.keys(settings.socialMedia.sources).length > 0)
    ? settings.socialMedia.sources
    : FALLBACK_SOURCES;
  const sourcePages = Object.keys(socialPageMapBySource);

  // Filter active products
  const activeProducts = products.filter((p) => p.isActive !== false);

  // Cart & Order Form state
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  // Dynamic Locations (City = District/City, Area = Thana/Upazila)
  const [cities, setCities] = useState<string[]>(DEFAULT_CITIES);
  const [cityAreasMap, setCityAreasMap] = useState<Record<string, string[]>>(INITIAL_CITY_AREAS_MAP);
  const [city, setCity] = useState("Dhaka");
  const [area, setArea] = useState("Uttara");
  const [sourcePage, setSourcePage] = useState("Facebook Page");
  const [socialSource, setSocialSource] = useState(socialPageMapBySource["Facebook Page"][0] || "");
  const [deliveryCharge, setDeliveryCharge] = useState(70);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("Internal");

  // Load existing order for editing if ?edit=ORD-xxx query is present
  useEffect(() => {
    if (editOrderId && orders && orders.length > 0) {
      const existing = orders.find((o) => o.id === editOrderId || o.id === `ORD-${editOrderId}`);
      if (existing) {
        setCustomer(existing.customer || "");
        setPhone(existing.phone || "");
        setAddress(existing.address || "");
        if (existing.city) setCity(existing.city);
        if (existing.area) setArea(existing.area);
        if (existing.delivery !== undefined) setDeliveryCharge(existing.delivery);
        if (existing.paid !== undefined) setPaid(existing.paid);
        if (existing.discount !== undefined) setDiscount(existing.discount);
        if (existing.note) setNote(existing.note);
        if (existing.items && existing.items.length > 0) {
          setLines(
            existing.items.map((it, idx) => {
              let rawName = it.name || "Product";
              let extractedSize = it.size && it.size !== "Standard" ? it.size.trim() : "";

              // Extract size from parenthetical suffix if name is "Midnight Heavyweight Tee (M)"
              const match = rawName.match(/\(([^)]+)\)$/);
              if (match) {
                if (!extractedSize || extractedSize === "Standard") {
                  extractedSize = match[1].trim();
                }
                rawName = rawName.replace(/\s*\([^)]+\)$/, "").trim();
              }

              const finalSize = extractedSize || "M";
              const matchedProd = products.find((p) => p.slug === it.slug || p.name.toLowerCase() === rawName.toLowerCase());

              return {
                key: `edit-${idx}-${it.slug}`,
                slug: it.slug,
                name: rawName,
                size: finalSize,
                color: it.color && it.color !== "Default" ? it.color : (matchedProd?.colors?.[0] || "Default"),
                qty: it.qty,
                price: it.price,
                availableSizes: matchedProd?.sizes && matchedProd.sizes.length > 0 ? matchedProd.sizes : ["S", "M", "L", "XL", "XXL"],
                availableColors: matchedProd?.colors && matchedProd.colors.length > 0 ? matchedProd.colors : ["Standard"],
              };
            })
          );
        }
        toast.info(`Editing Order #${existing.id}`);
      }
    }
  }, [editOrderId, orders]);

  // Source Page change handler -> automatically update Social Page dropdown options & default selected page
  const handleSourcePageChange = (newSourcePage: string) => {
    setSourcePage(newSourcePage);
    const pageOptions = socialPageMapBySource[newSourcePage] || [];
    setSocialSource(pageOptions[0] || "");
  };

  // Dynamic options list for Social Page dropdown based on selected Source Channel
  const currentSocialPageOptions = socialPageMapBySource[sourcePage] || [];

  // Fetch live BD Divisions -> Districts & Real Thanas/Upazilas from public API
  useEffect(() => {
    async function loadAllBDLocationsFromAPI() {
      try {
        const divList = ["dhaka", "chattogram", "rajshahi", "khulna", "barishal", "sylhet", "rangpur", "mymensingh"];
        const newCityAreas: Record<string, string[]> = {};
        const newCitiesSet = new Set<string>(DEFAULT_CITIES);

        const responses = await Promise.allSettled(
          divList.map((div) => fetch(`https://bdapis.com/api/v1.2/division/${div}`).then((r) => r.json()))
        );

        responses.forEach((res) => {
          if (res.status === "fulfilled" && res.value?.data && Array.isArray(res.value.data)) {
            res.value.data.forEach((distItem: { district: string; upazilla?: string[] }) => {
              const cityName = distItem.district;
              newCitiesSet.add(cityName);

              if (distItem.upazilla && Array.isArray(distItem.upazilla)) {
                const existing = INITIAL_CITY_AREAS_MAP[cityName] || [];
                const merged = Array.from(new Set([...existing, ...distItem.upazilla]));
                newCityAreas[cityName] = merged;
              }
            });
          }
        });

        if (newCitiesSet.size > 0) {
          setCities(Array.from(newCitiesSet));
          setCityAreasMap((prev) => ({
            ...prev,
            ...newCityAreas,
          }));
        }
      } catch (err) {
        console.warn("Using location fallback data:", err);
      }
    }

    loadAllBDLocationsFromAPI();
  }, []);

  // Current real areas (thanas/upazilas) list based on selected city
  const availableAreas = cityAreasMap[city] || INITIAL_CITY_AREAS_MAP[city] || DEFAULT_AREAS;

  // City change handler
  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const areasList = cityAreasMap[newCity] || INITIAL_CITY_AREAS_MAP[newCity] || DEFAULT_AREAS;
    setArea(areasList[0] || "Main Town / Sadar");

    // Auto-update delivery charge preset based on selected city
    if (newCity === "Dhaka") {
      setDeliveryCharge(70);
    } else if (["Gazipur", "Narayanganj", "Savar", "Keraniganj", "Manikganj", "Munshiganj"].includes(newCity)) {
      setDeliveryCharge(100);
    } else {
      setDeliveryCharge(130);
    }
  };

  // Product Options Modal state
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [modalSize, setModalSize] = useState("M");
  const [modalColor, setModalColor] = useState("Default");
  const [modalQty, setModalQty] = useState(1);

  // Product Catalog Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasSearched(true);
  };

  // Filter products by search query
  const filteredProducts = (!hasSearched && !searchQuery.trim())
    ? []
    : activeProducts.filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      });

  // Cart actions
  const clearCart = () => {
    setLines([]);
    toast.success("Cart cleared");
  };

  // Open website style select options modal popup
  const openSelectOptionsModal = (product: Product, initialSize?: string) => {
    setSelectedProductForModal(product);
    setModalSize(initialSize || product.sizes[0] || "M");
    setModalColor(product.colors[0] || "Default");
    setModalQty(1);
  };

  // Directly select size and add product to order lines without popup
  const addProductDirectly = (product: Product, size: string) => {
    const color = product.colors[0] || "Default";
    const unitPrice = getSizePrice(product, size);

    setLines((prev) => {
      const existingIdx = prev.findIndex(
        (l) => l.slug === product.slug && l.size === size && l.color === color
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          qty: next[existingIdx].qty + 1,
        };
        return next;
      }
      return [
        ...prev,
        {
          key: `cart-${uniqueKeyCounter++}`,
          slug: product.slug,
          name: product.name,
          size: size,
          color: color,
          qty: 1,
          price: unitPrice,
          availableSizes: product.sizes || ["S", "M", "L", "XL"],
          availableColors: product.colors || ["Standard"],
        },
      ];
    });

    toast.success(`Added ${product.name} (${size})`);
  };

  // Confirm options in modal and add to cart
  const confirmAddToCartFromModal = () => {
    if (!selectedProductForModal) return;
    const unitPrice = getSizePrice(selectedProductForModal, modalSize);

    setLines((prev) => {
      const existingIdx = prev.findIndex(
        (l) => l.slug === selectedProductForModal.slug && l.size === modalSize && l.color === modalColor
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          qty: next[existingIdx].qty + modalQty,
        };
        return next;
      }
      return [
        ...prev,
        {
          key: `cart-${uniqueKeyCounter++}`,
          slug: selectedProductForModal.slug,
          name: selectedProductForModal.name,
          size: modalSize,
          color: modalColor,
          qty: modalQty,
          price: unitPrice,
          availableSizes: selectedProductForModal.sizes || ["S", "M", "L", "XL"],
          availableColors: selectedProductForModal.colors || ["Standard"],
        },
      ];
    });

    toast.success(`Added ${selectedProductForModal.name} (${modalSize} · ${modalColor})`);
    setSelectedProductForModal(null);
  };

  const updateLineQty = (key: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.key === key) {
            const nextQty = l.qty + delta;
            return nextQty > 0 ? { ...l, qty: nextQty } : null;
          }
          return l;
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const updateLineSize = (key: string, newSize: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key === key) {
          const product = products.find((p) => p.slug === l.slug);
          const newPrice = product ? getSizePrice(product, newSize) : l.price;
          return { ...l, size: newSize, price: newPrice };
        }
        return l;
      })
    );
  };

  const updateLineColor = (key: string, newColor: string) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, color: newColor } : l))
    );
  };

  const updateLinePrice = (key: string, newPrice: number) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, price: newPrice } : l))
    );
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  // Calculations
  const subtotal = lines.reduce((acc, l) => acc + l.price * l.qty, 0);
  const itemCount = lines.reduce((acc, l) => acc + l.qty, 0);
  const total = Math.max(0, subtotal + deliveryCharge - discount);
  const due = Math.max(0, total - paid);

  // Submit order handler
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (!customer.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (lines.length === 0) {
      toast.error("Cart is empty! Add products from the right panel.");
      return;
    }

    const orderItems: OrderItem[] = lines.map((l) => ({
      slug: l.slug,
      name: l.name,
      size: l.size,
      color: l.color,
      qty: l.qty,
      price: l.price,
    }));

    const orderNotes = [
      sourcePage ? `Source: ${sourcePage}` : "",
      socialSource ? `Social: ${socialSource}` : "",
      area ? `Area: ${area}` : "",
      note ? `${noteType} Note: ${note}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const order: Order = {
      id: editOrderId || generateNextOrderId(),
      customer: customer.trim(),
      phone: phone.trim(),
      address: address.trim() ? `${address.trim()}, ${area}` : `${area}, ${city}`,
      city,
      area,
      note: orderNotes,
      payment: paid >= total ? "Paid" : paid > 0 ? "Partial Paid" : "Cash on delivery",
      items: orderItems,
      total,
      delivery: deliveryCharge,
      paid,
      discount,
      status: "pending",
      date: new Date().toISOString().slice(0, 10),
      source: "manual",
      hasNotes: !!note.trim(),
    };

    addOrder(order);

    // Persist note into localStorage notes store so it shows in Notes modal
    if (note.trim()) {
      const store = getSavedNotesStore();
      const noteRecord: NoteRecord = {
        id: `note-${Date.now()}`,
        text: note.trim(),
        noteType: noteType === "Customer" ? "Customer / Delivery Note" : "Internal Note",
        author: "Order Creation",
        timestamp: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      };
      store[order.id] = [...(store[order.id] || []), noteRecord];
      saveNotesStore(store);
    }

    toast.success("Order Created Successfully!", {
      description: `Order ID: ${order.id} · Customer: ${order.customer}`,
    });

    // Reset form
    setLines([]);
    setCustomer("");
    setPhone("");
    setAddress("");
    setSocialSource("");
    setDiscount(0);
    setPaid(0);
    setNote("");
    setNoteType("Internal");
  };  return (
    <div className="space-y-4">
      {/* Main 2-Column POS Layout (50/50 split on large screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        {/* LEFT COLUMN: Cart Table, Calculation Summary & Customer Info Form */}
        <div className="space-y-4">
          <form onSubmit={handleCreateOrder} className="space-y-4">
            {/* 1. Cart Table & Calculation Summary Section */}
            <div className="rounded-xl border border-border bg-card shadow-card p-4 space-y-3">
              {/* Only show top header bar when cart has items */}
              {lines.length > 0 && (
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="size-4 text-primary" />
                    <span className="font-bold text-sm text-foreground">Order Items ({lines.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="inline-flex items-center gap-1 text-xs text-destructive hover:underline font-medium cursor-pointer"
                  >
                    <RotateCcw className="size-3" />
                    Clear Cart
                  </button>
                </div>
              )}

              {/* Selected Products List or Empty State */}
              {lines.length === 0 ? (
                <div className="py-3 px-3 text-center border border-dashed border-border/80 rounded-lg bg-secondary/10 flex items-center justify-center gap-2">
                  <ShoppingBag className="size-4 text-muted-foreground opacity-60" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Cart is empty. Click on any product on the right to add items.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-semibold">
                        <th className="py-2 text-left font-semibold">Product</th>
                        <th className="py-2 text-center w-[90px] font-semibold">Qty</th>
                        <th className="py-2 text-left w-[70px] font-semibold">Size</th>
                        <th className="py-2 text-left w-[85px] font-semibold">Color</th>
                        <th className="py-2 text-right w-[80px] font-semibold">Price</th>
                        <th className="py-2 text-right w-[75px] font-semibold">Total</th>
                        <th className="py-2 text-center w-[35px] font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {lines.map((l) => (
                        <tr key={l.key} className="hover:bg-secondary/20">
                          <td className="py-2.5 pr-2 font-medium text-foreground truncate max-w-[130px] align-middle">
                            {l.name}
                          </td>
                          <td className="py-2.5 px-1 align-middle">
                            <div className="flex items-center justify-center gap-1 bg-secondary/50 rounded border border-border p-0.5 w-[84px] mx-auto">
                              <button
                                type="button"
                                onClick={() => updateLineQty(l.key, -1)}
                                className="size-5 flex items-center justify-center rounded hover:bg-background cursor-pointer text-muted-foreground hover:text-foreground shrink-0"
                              >
                                <Minus className="size-2.5" />
                              </button>
                              <span className="font-semibold text-xs min-w-[16px] text-center">{l.qty}</span>
                              <button
                                type="button"
                                onClick={() => updateLineQty(l.key, 1)}
                                className="size-5 flex items-center justify-center rounded hover:bg-background cursor-pointer text-muted-foreground hover:text-foreground shrink-0"
                              >
                                <Plus className="size-2.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-1 align-middle">
                            <select
                              value={l.size}
                              onChange={(e) => updateLineSize(l.key, e.target.value)}
                              className="h-7 w-[64px] rounded border border-border bg-background px-1 text-xs font-semibold text-left"
                            >
                              {(l.availableSizes || [l.size]).map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-1 align-middle">
                            <select
                              value={l.color}
                              onChange={(e) => updateLineColor(l.key, e.target.value)}
                              className="h-7 w-[78px] rounded border border-border bg-background px-1 text-xs font-medium text-left truncate"
                            >
                              {(l.availableColors && l.availableColors.length > 0 ? l.availableColors : [l.color || "Standard"]).map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-1 text-right align-middle">
                            <input
                              type="number"
                              value={l.price}
                              onChange={(e) => updateLinePrice(l.key, Number(e.target.value))}
                              className="h-7 w-[72px] text-right rounded border border-border bg-background px-1 text-xs font-medium ml-auto"
                            />
                          </td>
                          <td className="py-2.5 pl-1 text-right font-bold text-foreground align-middle">
                            ৳{l.price * l.qty}
                          </td>
                          <td className="py-2.5 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => removeLine(l.key)}
                              className="size-6 inline-flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer transition-colors"
                            >
                              <X className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary Calculations Grid (Only show when cart has items) */}
              {lines.length > 0 && (
                <div className="pt-2 border-t border-border/80 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-secondary/30 p-2 rounded border border-border flex items-center justify-between">
                      <span className="text-muted-foreground">Items</span>
                      <span className="font-bold text-foreground">{itemCount}</span>
                    </div>
                    <div className="bg-secondary/30 p-2 rounded border border-border flex items-center justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-bold text-foreground">৳{subtotal}</span>
                    </div>
                    <div className="bg-secondary/30 p-2 rounded border border-border flex items-center justify-between">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="font-bold text-foreground">৳{deliveryCharge}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-secondary/30 p-1.5 rounded border border-border flex items-center gap-1">
                      <span className="text-muted-foreground shrink-0">Dis</span>
                      <Input
                        type="number"
                        min="0"
                        value={discount || ""}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="h-6 text-right px-1 text-xs"
                        placeholder="0"
                      />
                    </div>
                    <div className="bg-secondary/30 p-1.5 rounded border border-border flex items-center gap-1">
                      <span className="text-muted-foreground shrink-0">Paid</span>
                      <Input
                        type="number"
                        min="0"
                        value={paid || ""}
                        onChange={(e) => setPaid(Number(e.target.value))}
                        className="h-6 text-right px-1 text-xs"
                        placeholder="0"
                      />
                    </div>
                    <div className="bg-secondary/30 p-2 rounded border border-border flex items-center justify-between">
                      <span className="text-muted-foreground">Due</span>
                      <span className="font-bold text-primary">৳{due}</span>
                    </div>
                  </div>

                  {/* Total Black Bar */}
                  <div className="bg-foreground text-background font-extrabold text-sm py-2 px-3 rounded flex items-center justify-between shadow-sm">
                    <span>Total</span>
                    <span>৳{total}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Customer Information & Delivery Form */}
            <div className="rounded-xl border border-border bg-card shadow-card p-4 space-y-3">
              <h2 className="font-bold text-sm text-foreground border-b border-border/60 pb-1.5 flex items-center gap-2">
                Customer & Delivery Info
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="m-phone" className="text-xs font-semibold">Phone *</Label>
                  <Input
                    id="m-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone number"
                    required
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="m-customer" className="text-xs font-semibold">Name *</Label>
                  <Input
                    id="m-customer"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder="Full name"
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="m-address" className="text-xs font-semibold">Address *</Label>
                <Textarea
                  id="m-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House, road, landmark address"
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Source Page</Label>
                  <select
                    value={sourcePage}
                    onChange={(e) => handleSourcePageChange(e.target.value)}
                    className="h-9 w-full rounded border border-border bg-background px-2 text-xs font-medium"
                  >
                    {sourcePages.map((sp) => (
                      <option key={sp} value={sp}>
                        {sp}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Social Page / Source</Label>
                  <SearchableSelect
                    options={currentSocialPageOptions}
                    value={socialSource}
                    onChange={setSocialSource}
                    placeholder="Search & select page..."
                  />
                </div>
              </div>

              {/* Searchable City & Area (Thana/Upazila) Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Select City</Label>
                  <SearchableSelect
                    options={cities}
                    value={city}
                    onChange={handleCityChange}
                    placeholder="Search & select city..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Select Area (Thana / Upazila)</Label>
                  <SearchableSelect
                    options={availableAreas}
                    value={area}
                    onChange={setArea}
                    placeholder="Search & select area..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Delivery Charge Preset</Label>
                <select
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                  className="h-9 w-full rounded border border-border bg-background px-2 text-xs font-medium"
                >
                  <option value={70}>Inside Dhaka — ৳70</option>
                  <option value={100}>Sub Dhaka (Dhaka Suburbs) — ৳100</option>
                  <option value={130}>Outside Dhaka — ৳130</option>
                  <option value={0}>Free Delivery — ৳0</option>
                </select>
              </div>

              <div className="space-y-1 pt-1">
                <div className="relative group">
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="h-9 w-full appearance-none rounded border border-border bg-background px-2 text-xs font-semibold cursor-pointer"
                  >
                    <option value="Internal">Internal Note</option>
                    <option value="Customer">Customer Note</option>
                  </select>
                  <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                </div>
                <Textarea
                  id="m-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Write a note..."
                  rows={2}
                  className="text-xs mt-1"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-bold text-sm cursor-pointer mt-2"
              >
                Create Order
              </Button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: POS Product Search & Catalog Grid (TALL HEIGHT TO ALIGN WITH LEFT COLUMN) */}
        <div className="h-full flex flex-col">
          <div className="rounded-xl border border-border bg-card shadow-card p-4 space-y-3 h-full flex flex-col min-h-[750px]">
            {/* Search Bar Form */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim() !== "") {
                      setHasSearched(true);
                    }
                  }}
                  placeholder="Search product by name, code or category..."
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <Button type="submit" className="h-9 px-4 text-xs font-bold cursor-pointer">
                Search
              </Button>
            </form>

            {/* Product Catalog Grid */}
            <div className="max-h-[820px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs space-y-2 border border-dashed border-border rounded-lg bg-secondary/10">
                  <Search className="size-6 text-muted-foreground mx-auto opacity-50" />
                  {!hasSearched && !searchQuery.trim() ? (
                    <p className="font-medium text-foreground">
                      Type in the search box or click <span className="font-bold text-primary">&ldquo;Search&rdquo;</span> to view all products.
                    </p>
                  ) : (
                    <p>No products found matching &ldquo;{searchQuery}&rdquo;.</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5">
                  {filteredProducts.map((product) => {
                    const minPrice =
                      product.sizePrices && Object.keys(product.sizePrices).length > 0
                        ? Math.min(...Object.values(product.sizePrices))
                        : product.price;

                    return (
                      <div
                        key={product.slug}
                        className="group relative rounded-lg border border-border bg-card overflow-hidden shadow-xs hover:border-primary transition-all flex flex-col justify-between p-1.5"
                      >
                        {/* Stock Badge */}
                        <div className="absolute top-1.5 left-1.5 z-10">
                          <span className="inline-flex items-center rounded bg-green-600/95 text-white px-1.5 py-0.5 text-[9px] font-extrabold shadow-xs">
                            Stock: 60
                          </span>
                        </div>

                        {/* Image & Main Card Click opens Select Options Modal */}
                        <div
                          onClick={() => openSelectOptionsModal(product)}
                          className="cursor-pointer space-y-1.5"
                        >
                          <div className="aspect-square w-full overflow-hidden rounded bg-secondary">
                            <img
                              src={getImageUrl(product.image)}
                              alt={product.name}
                              onError={handleImageError}
                              className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>

                          <div>
                            <h3 className="font-semibold text-[11px] text-foreground line-clamp-1 leading-tight" title={product.name}>
                              {product.name}
                            </h3>
                            <p className="font-extrabold text-xs text-primary mt-0.5">
                              ৳{minPrice}
                            </p>
                          </div>
                        </div>

                        {/* Size Stock Badges Grid directly selects size and adds to cart */}
                        <div className="pt-1.5 border-t border-border/40 mt-1">
                          <div className="grid grid-cols-3 gap-0.5">
                            {product.sizes.slice(0, 6).map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => addProductDirectly(product, sz)}
                                className="flex items-center justify-between bg-secondary/40 hover:bg-primary/20 hover:border-primary border border-border rounded px-1 py-0.5 text-[9px] cursor-pointer transition-colors"
                              >
                                <span className="font-bold text-foreground text-[9px]">{sz}</span>
                                <span className="text-[8.5px] text-green-700 font-semibold">20</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Website Style Select Options Modal Popup */}
      <Dialog
        open={!!selectedProductForModal}
        onOpenChange={(open) => {
          if (!open) setSelectedProductForModal(null);
        }}
      >
        {selectedProductForModal && (
          <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-left font-display text-lg font-bold">
                Select Options
              </DialogTitle>
              <DialogDescription className="text-left">
                Choose size, color and quantity for {selectedProductForModal.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex gap-4">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-secondary border border-border">
                <img
                  src={getImageUrl(selectedProductForModal.image)}
                  alt={selectedProductForModal.name}
                  onError={handleImageError}
                  className="size-full object-cover"
                />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="text-sm font-semibold text-foreground leading-snug">
                  {selectedProductForModal.name}
                </h4>
                <p className="mt-1 text-lg font-bold text-primary">
                  ৳{getSizePrice(selectedProductForModal, modalSize)}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {/* Size Selector */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Size
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Price:{" "}
                    <span className="font-bold text-primary">
                      ৳{getSizePrice(selectedProductForModal, modalSize)}
                    </span>
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedProductForModal.sizes.map((s) => {
                    const sp = getSizePrice(selectedProductForModal, s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setModalSize(s)}
                        className={`min-w-10 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          s === modalSize
                            ? "border-primary bg-primary text-primary-foreground font-bold"
                            : "border-border bg-card text-foreground hover:border-primary"
                        }`}
                      >
                        {s}
                        {selectedProductForModal.sizePrices &&
                          selectedProductForModal.sizePrices[s] !== undefined && (
                            <span className="ml-1 text-[9px] opacity-70">
                              ৳{sp}
                            </span>
                          )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Colour
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedProductForModal.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setModalColor(c)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        c === modalColor
                          ? "border-primary bg-primary text-primary-foreground font-bold"
                          : "border-border bg-card text-foreground hover:border-primary"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selector */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quantity
                </span>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-border bg-card">
                    <button
                      type="button"
                      onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                      className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-foreground">
                      {modalQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalQty((q) => q + 1)}
                      className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedProductForModal(null)}
                className="flex-1 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAddToCartFromModal}
                className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Add to Cart
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
