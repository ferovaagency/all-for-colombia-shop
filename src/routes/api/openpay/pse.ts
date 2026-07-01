import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openpayFetch, passthroughOpenpayError } from "@/server/openpay.server";

const bodySchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(120),
  docType: z.enum(["CC", "NIT", "CE"]),
  docNumber: z.string().trim().regex(/^[\d-]+$/).min(5).max(20),
  bankCode: z.string().min(1).max(10),
  amount: z.number().positive().max(50_000_000),
  description: z.string().trim().min(3).max(250).default("Pago en línea"),
  redirectUrl: z.string().url().max(500),
  orderId: z.string().optional(),
});

/**
 * POST /api/openpay/pse
 * Creates a PSE charge and returns { redirectUrl }.
 * According to Openpay docs: POST https://sandbox-api.openpay.co/v1/{MERCHANT_ID}/pse
 */
export const Route = createFileRoute("/api/openpay/pse")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.json();
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

          // According to Openpay documentation, PSE uses /pse endpoint, not /charges/pse
          const payload = {
            country: "COL", // Required field for Colombia
            amount: d.amount,
            currency: "COP",
            description: d.description,
            iva: "0",
            ...(d.orderId && { order_id: d.orderId }),
            customer: {
              name: d.firstName,
              last_name: d.lastName,
              email: d.email,
              phone_number: "0000000000", // Required but can be generic
              requires_account: false,
              customer_address: {
                department: "Bogota",
                city: "Bogota",
                additional: "N/A",
              },
            },
          };

          const res = await openpayFetch("/pse", { method: "POST", body: payload });
          if (!res.ok) return passthroughOpenpayError(res);
          const data = await res.json();

          // According to docs, PSE returns redirect_url directly, not in payment_method.url
          const redirectUrl: string | undefined = data?.redirect_url;
          if (!redirectUrl) {
            return new Response(
              JSON.stringify({
                error_code: "missing_redirect",
                description: "Openpay no devolvió redirect_url para PSE",
                debug: data,
              }),
              { status: 502, headers: { "Content-Type": "application/json" } },
            );
          }
          return Response.json({
            id: data?.orderId || data?.id,
            redirectUrl,
            fullResponse: data,
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