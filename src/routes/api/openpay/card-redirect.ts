import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openpayFetch, passthroughOpenpayError } from "@/server/openpay.server";

const bodySchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive().max(50_000_000),
  description: z.string().trim().min(3).max(250).default("Pago con tarjeta"),
  redirect_url: z.string().url().max(500),
  customer: z.object({
    name: z.string().trim().min(1).max(80),
    last_name: z.string().trim().min(1).max(80),
    phone_number: z.string().trim().min(5).max(30),
    email: z.string().trim().email().max(120),
  }),
  send_email: z.boolean().optional().default(false),
});

/**
 * POST /api/openpay/card-redirect
 * Creates a card charge with redirect to Openpay payment form.
 * According to Openpay docs: POST /charges with confirm: false and redirect_url
 * This is useful when you don't have a tokenized card.
 */
export const Route = createFileRoute("/api/openpay/card-redirect")({
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

          // Load service-role client
          try {
            const supabaseModule = await import("@/integrations/supabase/client.server");
            supabaseAdmin = supabaseModule.supabaseAdmin;
          } catch (dbError) {
            console.error("Failed to load Supabase client:", dbError);
            return Response.json(
              { error_code: "db_connection_error", description: "No se puede conectar a la base de datos." },
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
              { error_code: "db_query_error", description: "Error al consultar la base de datos." },
              { status: 503 }
            );
          }

          if (!order) {
            return Response.json({ error_code: "not_found", description: "Order not found" }, { status: 404 });
          }
          if (order.status === "paid") {
            return Response.json({ error_code: "already_paid", description: "Order already paid" }, { status: 409 });
          }

          const amount = Number(order.total);
          if (!Number.isFinite(amount) || amount <= 0) {
            return Response.json({ error_code: "invalid_amount", description: "Order total is invalid" }, { status: 422 });
          }

          const payload = {
            method: "card",
            amount,
            currency: "COP",
            iva: "0",
            description: d.description,
            order_id: order.id,
            customer: d.customer,
            confirm: false, // Required for redirect flow
            send_email: d.send_email,
            redirect_url: d.redirect_url,
          };

          const res = await openpayFetch("/charges", { method: "POST", body: payload });
          if (!res.ok) return passthroughOpenpayError(res);
          const charge = await res.json();

          // Record the payment attempt
          try {
            await supabaseAdmin.from("payments").insert({
              order_id: order.id,
              openpay_charge_id: charge?.id ?? null,
              status: charge?.status ?? null,
              raw: charge,
            });
          } catch (recordError) {
            console.error("Failed to record payment (non-critical):", recordError);
          }

          // Redirect flow
          if (charge?.payment_method?.type === "redirect" && charge?.payment_method?.url) {
            return Response.json({
              redirect_url: charge.payment_method.url,
              charge_id: charge.id,
              status: charge.status,
            });
          }

          return Response.json(
            {
              error_code: "no_redirect",
              description: "Openpay no devolvió URL de redirección para el pago",
              charge_id: charge?.id,
              status: charge?.status,
            },
            { status: 502 },
          );
        } catch (e: any) {
          if (e instanceof Response) return e;
          console.error("Unexpected error in card-redirect:", e);
          return Response.json(
            { error_code: "server_error", description: e?.message ?? "Unexpected error" },
            { status: 500 },
          );
        }
      },
    },
  },
});