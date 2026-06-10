import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  orderId: z.string().uuid(),
  origin: z.string().url(),
});

export const startMercadoPagoCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return { ok: false as const, error: "MercadoPago no configurado" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, total, items, customer_email, customer_name")
      .eq("id", data.orderId)
      .maybeSingle();

    if (error || !order) {
      return { ok: false as const, error: "Pedido no encontrado" };
    }

    const items = Array.isArray(order.items) ? (order.items as any[]) : [];
    const preferenceItems = items.length
      ? items.map((it) => ({
          title: String(it.name ?? "Producto").slice(0, 250),
          quantity: Math.max(1, Number(it.quantity) || 1),
          unit_price: Number(it.price) || 0,
          currency_id: "COP",
        }))
      : [
          {
            title: `Pedido ${order.id.slice(0, 8)}`,
            quantity: 1,
            unit_price: Number(order.total) || 0,
            currency_id: "COP",
          },
        ];

    const body = {
      items: preferenceItems,
      external_reference: order.id,
      payer: order.customer_email
        ? { email: order.customer_email, name: order.customer_name ?? undefined }
        : undefined,
      back_urls: {
        success: `${data.origin}/resultado-pago?id=${order.id}&status=ok`,
        failure: `${data.origin}/resultado-pago?id=${order.id}&status=fail`,
        pending: `${data.origin}/resultado-pago?id=${order.id}&status=pending`,
      },
      auto_return: "approved",
      notification_url: `${data.origin}/api/public/mercadopago-webhook`,
      statement_descriptor: "ALL FOR ALL",
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("MercadoPago preference error", res.status, text);
      return { ok: false as const, error: `MercadoPago ${res.status}` };
    }

    const pref = (await res.json()) as { id: string; init_point?: string; sandbox_init_point?: string };
    const redirectUrl = pref.init_point || pref.sandbox_init_point;
    if (!redirectUrl) {
      return { ok: false as const, error: "MercadoPago no devolvió URL" };
    }

    await supabaseAdmin
      .from("orders")
      .update({ payment_method: "mercadopago" })
      .eq("id", order.id);

    return { ok: true as const, redirectUrl, preferenceId: pref.id };
  });
