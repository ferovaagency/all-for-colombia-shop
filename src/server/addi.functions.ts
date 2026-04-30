import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createAddiApplication } from "./addi.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  orderId: z.string().uuid(),
  origin: z.string().url(),
});

export const startAddiCheckout = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();

    if (error || !order) {
      return { ok: false as const, error: "Pedido no encontrado" };
    }

    const items = (order.items as any[]) || [];
    const shipping = (order.shipping_address as any) || {};

    try {
      const result = await createAddiApplication({
        orderId: order.id,
        totalCop: Number(order.total),
        customer: {
          name: order.customer_name || "",
          email: order.customer_email || "",
          phone: order.customer_phone || "",
        },
        items: items.map((it) => ({
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          sku: it.sku,
        })),
        shippingAddress: shipping.address
          ? { address: shipping.address, city: shipping.city || "" }
          : undefined,
        callbackUrl: `${data.origin}/api/public/addi-webhook`,
      });

      await supabaseAdmin
        .from("orders")
        .update({
          addi_application_id: result.applicationId,
          addi_status: result.status || "PENDING",
          addi_checkout_url: result.redirectUrl || null,
        })
        .eq("id", order.id);

      return {
        ok: true as const,
        redirectUrl: result.redirectUrl,
        applicationId: result.applicationId,
      };
    } catch (e: any) {
      console.error("Addi checkout error:", e);
      return { ok: false as const, error: e?.message || "Error con Addi" };
    }
  });
