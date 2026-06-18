import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openpayFetch, passthroughOpenpayError } from "@/server/openpay.server";

const bodySchema = z.object({
  amount: z.number().positive().max(50_000_000),
  description: z.string().trim().min(3).max(250).default("Pago QR Bre-B"),
  customer: z
    .object({
      name: z.string().trim().min(2).max(60),
      last_name: z.string().trim().min(2).max(60),
      email: z.string().trim().email().max(120),
      phone_number: z.string().trim().max(20).optional(),
    })
    .optional(),
});

/**
 * POST /api/openpay/breb-qr
 * Creates a dynamic QR charge (Bre-B) and returns { id, qr_base64 }.
 */
export const Route = createFileRoute("/api/openpay/breb-qr")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => ({}));
          const parsed = bodySchema.safeParse(raw);
          if (!parsed.success) {
            return new Response(
              JSON.stringify({
                error_code: "invalid_input",
                description: parsed.error.issues[0]?.message ?? "Invalid body",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }
          const d = parsed.data;

          const payload: Record<string, unknown> = {
            method: "qr",
            amount: d.amount,
            currency: "COP",
            description: d.description,
          };
          if (d.customer) payload.customer = d.customer;

          const res = await openpayFetch("/charges", { method: "POST", body: payload });
          if (!res.ok) return passthroughOpenpayError(res);
          const data = await res.json();

          const qrBase64: string | undefined =
            data?.barcode_base64 ?? data?.payment_method?.barcode_base64;
          if (!qrBase64) {
            return new Response(
              JSON.stringify({
                error_code: "missing_qr",
                description: "Openpay no devolvió barcode_base64",
              }),
              { status: 502, headers: { "Content-Type": "application/json" } },
            );
          }

          return Response.json({
            id: data?.id,
            qr_base64: qrBase64,
            status: data?.status,
          });
        } catch (e: any) {
          if (e instanceof Response) return e;
          return new Response(
            JSON.stringify({ error_code: "server_error", description: e?.message ?? "Unexpected error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
