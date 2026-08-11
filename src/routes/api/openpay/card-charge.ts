import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openpayFetch, passthroughOpenpayError } from "@/server/openpay.server";

const bodySchema = z.object({
  order_id: z.string().uuid(),
  token_id: z.string().min(1).max(200),
  device_session_id: z.string().min(1).max(200),
  customer: z.object({
    name: z.string().trim().min(1).max(80),
    last_name: z.string().trim().min(1).max(80),
    phone_number: z.string().trim().min(5).max(30),
    email: z.string().trim().email().max(120),
  }),
  // Return URL for the 3-D Secure challenge redirect.
  redirect_url: z.string().url().max(400).optional(),
});

/**
 * POST /api/openpay/card-charge
 * Creates a card charge for an existing order using a pre-tokenized card.
 * Never accept card PANs here — only Openpay tokens.
 */
export const Route = createFileRoute("/api/openpay/card-charge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let supabaseAdmin: any = null;
        try {
          const raw = await request.json();
          const parsed = bodySchema.safeParse(raw);
          if (!parsed.success) {
            return Response.json(
              { error_code: "invalid_input", description: parsed.error.issues[0]?.message ?? "Invalid body" },
              { status: 400 },
            );
          }
          const d = parsed.data;

          // Load service-role client only inside handler (never at module scope in a route file).
          try {
            const supabaseModule = await import("@/integrations/supabase/client.server");
            supabaseAdmin = supabaseModule.supabaseAdmin;
          } catch (dbError) {
            console.error("Failed to load Supabase client:", dbError);
            return Response.json(
              { error_code: "db_connection_error", description: "No se puede conectar a la base de datos. Intente nuevamente." },
              { status: 503 }
            );
          }

          let order: any = null;
          try {
            const { data: orderData, error: orderErr } = await supabaseAdmin
              .from("orders")
              .select("id, total, status")
              .eq("id", d.order_id)
              .maybeSingle();

            if (orderErr) {
              return Response.json({ error_code: "db_error", description: orderErr.message }, { status: 500 });
            }
            order = orderData;
          } catch (dbError) {
            console.error("Database query error:", dbError);
            return Response.json(
              { error_code: "db_query_error", description: "Error al consultar la base de datos. Intente nuevamente." },
              { status: 503 }
            );
          }

          if (!order) {
            return Response.json({ error_code: "not_found", description: "Order not found" }, { status: 404 });
          }
          if (order.status === "paid") {
            return Response.json({ error_code: "already_paid", description: "Order already paid" }, { status: 409 });
          }

          // Backend is the source of truth for amount.
          const amount = Number(order.total);
          if (!Number.isFinite(amount) || amount <= 0) {
            return Response.json({ error_code: "invalid_amount", description: "Order total is invalid" }, { status: 422 });
          }

          const payload = {
            method: "card",
            source_id: d.token_id,
            amount,
            currency: "COP",
            iva: "0",
            description: `Pedido ${order.id}`,
            order_id: order.id,
            device_session_id: d.device_session_id,
            customer: d.customer,
            // Enforce 3-D Secure authentication (Openpay certification req.).
            use_3d_secure: true,
            redirect_url: d.redirect_url,
          };

          const res = await openpayFetch("/charges", { method: "POST", body: payload });
          if (!res.ok) return passthroughOpenpayError(res);
          const charge = await res.json();

          // Record the payment attempt (non-critical if this fails).
          try {
            await supabaseAdmin.from("payments").insert({
              order_id: order.id,
              openpay_charge_id: charge?.id ?? null,
              status: charge?.status ?? null,
              raw: charge,
            });
          } catch (recordError) {
            console.error("Failed to record payment (non-critical):", recordError);
            // Continue anyway - the charge was successful
          }

          // 3DS redirect flow.
          if (charge?.payment_method?.type === "redirect" && charge?.payment_method?.url) {
            return Response.json({
              redirect_url: charge.payment_method.url,
              charge_id: charge.id,
              status: charge.status,
            });
          }

          if (charge?.status === "completed") {
            try {
              await supabaseAdmin
                .from("orders")
                .update({ status: "paid" })
                .eq("id", order.id);
            } catch (updateError) {
              console.error("Failed to update order status (non-critical):", updateError);
              // Continue anyway - the charge was successful
            }
            return Response.json({ status: "completed", charge_id: charge.id });
          }

          return Response.json(
            {
              error_code: "charge_not_completed",
              status: charge?.status ?? "unknown",
              description: charge?.error_message ?? "El cargo no se completó",
              charge_id: charge?.id,
            },
            { status: 402 },
          );
        } catch (e: any) {
          if (e instanceof Response) return e;
          console.error("Unexpected error in card-charge:", e);
          return Response.json(
            { error_code: "server_error", description: e?.message ?? "Unexpected error" },
            { status: 500 },
          );
        }
      },
    },
  },
});