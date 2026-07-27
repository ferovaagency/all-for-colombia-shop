import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getPayableOrder(orderId: string) {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, total, status, customer_name, customer_email, customer_phone, shipping_address")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error("No fue posible consultar el pedido.");
  if (!order) return null;
  if (order.status === "paid") return { error: "already_paid" as const };
  const amount = Number(order.total);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El total del pedido no es válido.");
  return { order, amount };
}

export function orderCustomer(order: any) {
  const parts = String(order.customer_name ?? "").trim().split(/\s+/).filter(Boolean);
  const shipping = (order.shipping_address ?? {}) as Record<string, unknown>;
  return {
    name: parts[0] ?? "Cliente",
    last_name: parts.slice(1).join(" ") || parts[0] || "Openpay",
    email: String(order.customer_email ?? ""),
    phone_number: String(order.customer_phone ?? "0000000000"),
    requires_account: false,
    customer_address: { department: "Bogotá", city: String(shipping.city ?? "Bogotá"), additional: String(shipping.address ?? "No aplica") },
  };
}
