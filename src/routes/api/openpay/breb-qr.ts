import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openpayFetch, passthroughOpenpayError } from "@/server/openpay.server";
import { getPayableOrder, orderCustomer } from "@/server/openpay-order.server";

const bodySchema = z.object({ order_id: z.string().uuid() });

/** Creates a Bre-B QR using the persisted order, never browser-supplied totals. */
export const Route = createFileRoute("/api/openpay/breb-qr")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = bodySchema.safeParse(await request.json());
          if (!parsed.success) return Response.json({ error_code: "invalid_input", description: "order_id inválido" }, { status: 400 });
          const payable = await getPayableOrder(parsed.data.order_id);
          if (!payable) return Response.json({ error_code: "not_found", description: "Pedido no encontrado" }, { status: 404 });
          if ("error" in payable) return Response.json({ error_code: payable.error, description: "El pedido ya fue pagado" }, { status: 409 });

          const response = await openpayFetch("/charges", {
            method: "POST",
            body: {
              method: "qr",
              amount: payable.amount,
              currency: "COP",
              description: `Pedido ${payable.order.id}`,
              order_id: payable.order.id,
              customer: orderCustomer(payable.order),
            },
          });
          if (!response.ok) return passthroughOpenpayError(response);
          const data = await response.json();
          const qrBase64 = data?.barcode_base64 ?? data?.payment_method?.barcode_base64;
          if (!qrBase64) return Response.json({ error_code: "missing_qr", description: "Openpay no devolvió el QR" }, { status: 502 });
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("payments").insert({ order_id: payable.order.id, openpay_charge_id: data?.id ?? null, status: data?.status, raw: data });
          return Response.json({ id: data?.id, qr_base64: qrBase64, status: data?.status });
        } catch (error: any) {
          if (error instanceof Response) return error;
          return Response.json({ error_code: "server_error", description: error?.message ?? "Error inesperado" }, { status: 500 });
        }
      },
    },
  },
});
