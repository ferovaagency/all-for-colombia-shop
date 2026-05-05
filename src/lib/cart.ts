import { useEffect, useState, useCallback } from "react";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  sku?: string;
};

const KEY = "afa_cart";

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("afa_cart_change"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(readCart());
    const handler = () => setItems(readCart());
    window.addEventListener("afa_cart_change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("afa_cart_change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const add = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    const cur = readCart();
    const found = cur.find((i) => i.id === item.id);
    if (found) {
      found.quantity += qty;
    } else {
      cur.push({ ...item, quantity: qty });
    }
    writeCart(cur);
  }, []);

  const remove = useCallback((id: string) => {
    writeCart(readCart().filter((i) => i.id !== id));
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    const cur = readCart()
      .map((i) => (i.id === id ? { ...i, quantity: Math.max(1, qty) } : i))
      .filter((i) => i.quantity > 0);
    writeCart(cur);
  }, []);

  const clear = useCallback(() => writeCart([]), []);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return { items, add, remove, setQty, clear, count, subtotal };
}

export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export const WHATSAPP_NUMBER = "573218280762"; // Updated to the one used in product page
export const CONTACT_EMAIL = "ventas.marketplace@allforall.com.co";
export const SITE_DOMAIN = "https://allforall.co";

export function whatsappUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
