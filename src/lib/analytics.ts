// Thin wrapper around window.gtag (GA4). No-op on SSR / when gtag missing.
// Emits standard GA4 ecommerce events so the Analytics funnel shows real data.

type Gtag = (...args: any[]) => void;

function gtag(): Gtag | null {
  if (typeof window === "undefined") return null;
  const g = (window as any).gtag as Gtag | undefined;
  return typeof g === "function" ? g : null;
}

export type GA4Product = {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_brand?: string;
  item_category?: string;
};

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  const g = gtag();
  if (!g) return;
  try {
    g("event", name, params);
  } catch {
    /* noop */
  }
}

export function trackViewItem(p: GA4Product) {
  trackEvent("view_item", { currency: "COP", value: p.price, items: [p] });
}

export function trackAddToCart(p: GA4Product) {
  trackEvent("add_to_cart", {
    currency: "COP",
    value: (p.price || 0) * (p.quantity || 1),
    items: [{ ...p, quantity: p.quantity || 1 }],
  });
}

export function trackBeginCheckout(items: GA4Product[], value: number) {
  trackEvent("begin_checkout", { currency: "COP", value, items });
}

export function trackPurchase(opts: {
  transaction_id: string;
  value: number;
  items: GA4Product[];
  payment_method?: string;
}) {
  trackEvent("purchase", {
    transaction_id: opts.transaction_id,
    currency: "COP",
    value: opts.value,
    payment_type: opts.payment_method,
    items: opts.items,
  });
}

export function trackSearch(term: string, results?: number) {
  trackEvent("search", { search_term: term, results });
}

export function trackZeroResults(term: string) {
  trackEvent("search_zero_results", { search_term: term });
}

export function trackWhatsAppClick(source: string, extra: Record<string, unknown> = {}) {
  trackEvent("whatsapp_click", { source, ...extra });
}
