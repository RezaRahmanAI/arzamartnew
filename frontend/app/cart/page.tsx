"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, Pencil } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatBDT, getSizePrice } from "@/lib/shop-data";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSettings } from "@/context/settings-context";

export default function CartPage() {
  const { detailedLines, subtotal, add, update, setQty, remove } = useCart();
  const { settings } = useSettings();

  // Delivery logic from centralized settings
  const freeShippingThreshold = settings?.shipping?.freeShippingThreshold ?? 5000;
  const enableFreeShipping = settings?.shipping?.enableFreeShipping ?? true;
  const defaultCharge = settings?.shipping?.rules?.[0]?.charge ?? 70;
  const delivery = subtotal === 0
    ? 0
    : (enableFreeShipping && subtotal >= freeShippingThreshold)
      ? 0
      : defaultCharge;

  // Edit State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editSize, setEditSize] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editQty, setEditQty] = useState(1);

  const activeEditItem = editingIndex !== null ? detailedLines[editingIndex] : null;
  const activeProduct = activeEditItem?.product;
  const unitPrice = activeProduct ? getSizePrice(activeProduct, editSize) : 0;

  const handleEditClick = (index: number) => {
    const item = detailedLines[index];
    if (!item) return;
    setEditingIndex(index);
    setEditSize(item.size);
    setEditColor(item.color);
    setEditQty(item.qty);
  };

  const handleSaveChanges = () => {
    if (editingIndex === null || !activeProduct) return;
    update(editingIndex, {
      slug: activeProduct.slug,
      size: editSize,
      color: editColor,
      qty: editQty,
    });
    toast.success("Cart item updated successfully");
    setEditingIndex(null);
  };

  const handleAddAsNew = () => {
    if (!activeProduct) return;
    add({
      slug: activeProduct.slug,
      size: editSize,
      color: editColor,
      qty: editQty,
    });
    toast.success(`${activeProduct.name} added to cart`, {
      description: `${editColor} · Size ${editSize} · Qty ${editQty}`,
    });
    setEditingIndex(null);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="section-title border-l-4 border-primary">Your Cart</h1>

      {detailedLines.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center shadow-card">
          <p className="text-sm text-muted-foreground">Your cart is empty right now.</p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <ul className="space-y-3">
            {detailedLines.map((line, i) => (
              <li
                key={`${line.slug}-${line.size}-${line.color}`}
                className="flex gap-4 rounded-xl border border-border bg-card p-3 shadow-card"
              >
                <img
                  src={line.product.image}
                  alt={line.product.name}
                  loading="lazy"
                  width={800}
                  height={800}
                  className="size-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{line.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {line.color} · Size {line.size}
                  </p>
                  <p className="mt-1 text-sm font-bold text-price">
                    {formatBDT(getSizePrice(line.product, line.size))}
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="flex items-center rounded-lg border border-border">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => setQty(i, line.qty - 1)}
                        className="grid size-8 place-items-center hover:text-primary cursor-pointer"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold">{line.qty}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => setQty(i, line.qty + 1)}
                        className="grid size-8 place-items-center hover:text-primary cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleEditClick(i)}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary cursor-pointer"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-display text-lg font-bold text-foreground">Order Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-semibold">{formatBDT(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-semibold">
                  {delivery === 0 ? "Free" : formatBDT(delivery)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-bold text-price">{formatBDT(subtotal + delivery)}</dd>
              </div>
            </dl>
            <Link
              href="/checkout"
              className="mt-5 block rounded-lg bg-primary py-3 text-center text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
            >
              Proceed to checkout
            </Link>
          </aside>
        </div>
      )}

      {/* Edit Options Popup */}
      <Dialog open={editingIndex !== null} onOpenChange={(open) => !open && setEditingIndex(null)}>
        {activeProduct && (
          <DialogContent className="max-w-[90vw] sm:max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-left font-display text-lg font-bold">
                Edit Options
              </DialogTitle>
              <DialogDescription className="text-left">
                Modify configurations or add another size/color of {activeProduct.name} to the cart.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex gap-4">
              <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-secondary border border-border">
                <img src={activeProduct.image} alt={activeProduct.name} className="size-full object-cover" />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="text-sm font-semibold text-foreground leading-snug">{activeProduct.name}</h4>
                <p className="mt-1 text-lg font-bold text-price">{formatBDT(unitPrice)}</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {/* Size Selector */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Size</span>
                  <span className="text-xs text-muted-foreground">
                    Price: <span className="font-bold text-price">{formatBDT(unitPrice)}</span>
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeProduct.sizes.map((s) => {
                    const sp = getSizePrice(activeProduct, s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditSize(s)}
                        className={`min-w-10 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          s === editSize
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:border-primary"
                        }`}
                      >
                        {s}
                        {activeProduct.sizePrices && activeProduct.sizePrices[s] !== undefined && (
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
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Colour</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeProduct.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        c === editColor
                          ? "border-primary bg-primary text-primary-foreground"
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
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantity</span>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-border bg-card">
                    <button
                      type="button"
                      onClick={() => setEditQty((q) => Math.max(1, q - 1))}
                      className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-foreground">
                      {editQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditQty((q) => q + 1)}
                      className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={handleSaveChanges}
                  className="flex-1 rounded-xl border border-primary bg-primary/10 text-primary py-2.5 text-xs font-bold hover:bg-primary/20 transition-colors cursor-pointer"
                >
                  Save changes
                </button>
                <button
                  onClick={handleAddAsNew}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Add as new size
                </button>
              </div>
              <button
                onClick={() => setEditingIndex(null)}
                className="w-full rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
