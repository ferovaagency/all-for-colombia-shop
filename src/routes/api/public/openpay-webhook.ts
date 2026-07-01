import { createFileRoute } from "@tanstack/react-router";

/**
 * POST /api/public/openpay-webhook
 * Source of truth for payment status. Verifies HTTP Basic auth against
 * OPENPAY_WEBHOOK_USER / OPENPAY_WEBHOOK_PASS. Never trusts the frontend.
 * Public prefix bypasses site auth; we authenticate the request ourselves.
 */
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

export const Route = createFileRoute("/api/public/openpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = process.env.OPENPAY_WEBHOOK_USER;
        const pass = process.env.OPENPAY_WEBHOOK_PASS;
        // Modo simulado: si aún no configuras user/pass, el webhook responde
        // igual (incluida la verificación) pero deja un aviso en logs. En cuanto
        // definas ambos secrets, la validación Basic Auth se activa sola.
        if (user && pass) {
          const expected = "Basic " + btoa(`${user}:${pass}`);
          const authHeader = request.headers.get("authorization") ?? "";
          if (!timingSafeEqualStr(authHeader, expected)) {
            return new Response("Unauthorized", { status: 401 });
          }
        } else {
          console.warn(
            "[openpay-webhook] running in SIMULATED mode: OPENPAY_WEBHOOK_USER/PASS not set — accepting requests without auth.",
          );
        }

        let event: any;
        try {
          event = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        // Verification handshake.
        if (event?.type === "verification") {
          return Response.json({ verification_code: event.verification_code });
        }

        try {
          const orderId: string | undefined = event?.transaction?.order_id;
          const nextStatus = STATUS_MAP[event?.type as string];
          if (orderId && nextStatus) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("orders").update({ status: nextStatus }).eq("id", orderId);
            await supabaseAdmin
              .from("payments")
              .update({ status: event.type, raw: event })
              .eq("order_id", orderId);
          }
        } catch (e) {
          // Never 5xx to Openpay — they'll keep retrying. Log-only.
          console.error("openpay-webhook processing error:", e);
        }

        return new Response("ok", { status: 200 });
      },
      GET: async () => {
        const configured = Boolean(process.env.OPENPAY_WEBHOOK_USER && process.env.OPENPAY_WEBHOOK_PASS);
        return Response.json({
          ok: true,
          endpoint: "openpay-webhook",
          mode: configured ? "authenticated" : "simulated",
          hint: configured
            ? "Basic Auth activo. Openpay debe enviar el header Authorization configurado."
            : "Sin OPENPAY_WEBHOOK_USER/PASS: acepta cualquier POST. Añade los secretos para activar Basic Auth.",
        });
      },
    },
  },
});
