import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openpayFetch, passthroughOpenpayError } from "@/server/openpay.server";
import { getPayableOrder, orderCustomer } from "@/server/openpay-order.server";

const bodySchema = z.object({ order_id: z.string().uuid() });

/** Starts the Openpay PSE redirect. Amount and customer data come from the order. */
export const Route = createFileRoute("/api/openpay/pse")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = bodySchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json({ error_code: "invalid_input", description: "order_id inválido" }, { status: 400 });
          }
          const payable = await getPayableOrder(parsed.data.order_id);
          if (!payable) return Response.json({ error_code: "not_found", description: "Pedido no encontrado" }, { status: 404 });
          if ("error" in payable) return Response.json({ error_code: payable.error, description: "El pedido ya fue pagado" }, { status: 409 });

          const response = await openpayFetch("/pse", {
            method: "POST",
            body: {
              country: "COL",
              amount: payable.amount,
              currency: "COP",
              iva: "0",
              description: `Pedido ${payable.order.id}`,
              order_id: payable.order.id,
              customer: orderCustomer(payable.order),
            },
          });
          if (!response.ok) return passthroughOpenpayError(response);
          const data = await response.json();
          if (!data?.redirect_url) {
            return Response.json({ error_code: "missing_redirect", description: "Openpay no devolvió redirect_url" }, { status: 502 });
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("payments").insert({
            order_id: payable.order.id,
            openpay_charge_id: data?.id ?? null,
            status: data?.status ?? "in_progress",
            raw: data,
          });
          return Response.json({ id: data?.id, redirectUrl: data.redirect_url });
        } catch (error: any) {
          if (error instanceof Response) return error;
          return Response.json({ error_code: "server_error", description: error?.message ?? "Error inesperado" }, { status: 500 });
        }
      },
    },
  },
});
