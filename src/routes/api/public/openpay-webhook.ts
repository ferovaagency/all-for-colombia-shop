import { createFileRoute } from "@tanstack/react-router";

const STATUS_MAP: Record<string, "paid" | "failed" | "refunded"> = {
  "charge.succeeded": "paid",
  "charge.failed": "failed",
  "charge.cancelled": "failed",
  "charge.refunded": "refunded",
};

function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Openpay notification endpoint. Configure its Basic Auth credentials in Openpay. */
export const Route = createFileRoute("/api/public/openpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = process.env.OPENPAY_WEBHOOK_USER;
        const pass = process.env.OPENPAY_WEBHOOK_PASS;
        if (!user || !pass) return new Response("Webhook credentials are not configured", { status: 503 });
        const expected = `Basic ${btoa(`${user}:${pass}`)}`;
        if (!timingSafeEqualStr(request.headers.get("authorization") ?? "", expected)) {
          return new Response("Unauthorized", { status: 401 });
        }

        let event: any;
        try { event = await request.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
        if (event?.type === "verification") return Response.json({ verification_code: event.verification_code });

        const orderId = event?.transaction?.order_id;
        const nextStatus = STATUS_MAP[event?.type as string];
        if (orderId && nextStatus) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("orders").update({ status: nextStatus }).eq("id", orderId);
            await supabaseAdmin.from("payments").update({ status: event.type, raw: event }).eq("order_id", orderId);
          } catch (error) {
            console.error("openpay-webhook processing error", error);
            return new Response("Processing failed", { status: 500 });
          }
        }
        return new Response("ok", { status: 200 });
      },
      GET: async () => Response.json({
        ok: true,
        endpoint: "openpay-webhook",
        configured: Boolean(process.env.OPENPAY_WEBHOOK_USER && process.env.OPENPAY_WEBHOOK_PASS),
      }),
    },
  },
});
