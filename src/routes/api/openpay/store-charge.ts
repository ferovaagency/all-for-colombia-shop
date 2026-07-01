import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openpayFetch, passthroughOpenpayError } from "@/server/openpay.server";

const bodySchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive().max(50_000_000),
  description: z.string().trim().min(3).max(250).default("Pago en tienda"),
  customer: z.object({
    name: z.string().trim().min(1).max(80),
    last_name: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(120),
  }),
  due_date: z.string().optional(), // ISO 8601 format
});

/**
 * POST /api/openpay/store-charge
 * Creates a store charge for payment in convenience stores.
 * According to Openpay docs: POST https://sandbox-api.openpay.co/v1/{MERCHANT_ID}/charges with method: "store"
 */
export const Route = createFileRoute("/api/openpay/store-charge")({
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

          const payload: any = {
            method: "store",
            amount,
            currency: "COP",
            iva: "0",
            description: d.description,
            order_id: order.id,
            customer: d.customer,
          };

          // Optional due_date
          if (d.due_date) {
            payload.due_date = d.due_date;
          }

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

          // Store payment returns barcode and reference
          if (charge?.payment_method?.type === "store") {
            return Response.json({
              charge_id: charge.id,
              status: charge.status,
              reference: charge.payment_method.reference,
              barcode_url: charge.payment_method.barcode_url,
              paybin_reference: charge.payment_method.paybin_reference,
              due_date: charge.due_date,
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
          console.error("Unexpected error in store-charge:", e);
          return Response.json(
            { error_code: "server_error", description: e?.message ?? "Unexpected error" },
            { status: 500 },
          );
        }
      },
    },
  },
});