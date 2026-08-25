import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSizePrice, type Product } from "./shop-data";
import { useProducts } from "./products-store";

export type CartLine = {
  slug: string;
  size: string;
  qty: number;
};

export type CartLineWithProduct = CartLine & { product: Product };

type CartContextValue = {
  lines: CartLine[];
  detailedLines: CartLineWithProduct[];
  count: number;
  subtotal: number;
  add: (line: CartLine) => void;
  setQty: (index: number, qty: number) => void;
  remove: (index: number) => void;
  clear: () => void;
  update: (index: number, line: CartLine) => void;
};

const STORAGE_KEY = "arza-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore quota errors */
    }
  }, [lines]);

  const add = useCallback((line: CartLine) => {
    setLines((prev) => {
      const i = prev.findIndex(
        (l) => l.slug === line.slug && l.size === line.size,
      );
      if (i === -1) return [...prev, line];
      const next = [...prev];
      const existing = prev[i]!;
      next[i] = { ...existing, qty: existing.qty + line.qty };
      return next;
    });
  }, []);

  const update = useCallback((index: number, line: CartLine) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = line;
      const duplicateIndex = next.findIndex(
        (l, i) => i !== index && l.slug === line.slug && l.size === line.size,
      );
      if (duplicateIndex !== -1) {
        next[duplicateIndex] = {
          ...next[duplicateIndex]!,
          qty: next[duplicateIndex]!.qty + line.qty,
        };
        return next.filter((_, i) => i !== index);
      }
      return next;
    });
  }, []);

  const setQty = useCallback((index: number, qty: number) => {
    setLines((prev) =>
      prev
        .map((l, i) => (i === index ? { ...l, qty: Math.max(0, qty) } : l))
        .filter((l) => l.qty > 0),
    );
  }, []);

  const remove = useCallback((index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const { products } = useProducts();

  const value = useMemo<CartContextValue>(() => {
    const detailedLines = lines.flatMap((line) => {
      const product = products.find((p) => p.slug === line.slug);
      return product ? [{ ...line, product }] : [];
    });
    return {
      lines,
      detailedLines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: detailedLines.reduce((sum, l) => sum + getSizePrice(l.product, l.size) * l.qty, 0),
      add,
      update,
      setQty,
      remove,
      clear,
    };
  }, [lines, products, add, update, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}