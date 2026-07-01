import { createFileRoute } from "@tanstack/react-router";

// Addi webhook (Online Application Callback).
// Requirements from Addi:
//  - Basic Auth (credentials configured in Addi's portal, stored here as
//    ADDI_WEBHOOK_USER / ADDI_WEBHOOK_PASS).
//  - Respond HTTP 200 echoing the exact same JSON body received.
//  - Retries every 30 min for up to 24 h if the response is not 200.
export const Route = createFileRoute("/api/public/addi-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Basic Auth validation
        const user = process.env.ADDI_WEBHOOK_USER;
        const pass = process.env.ADDI_WEBHOOK_PASS;
        if (user && pass) {
          const header = request.headers.get("authorization") || "";
          const expected = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
          if (header !== expected) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        const raw = await request.text();
        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const applicationId =
          payload?.applicationId || payload?.id || payload?.data?.applicationId;
        const status = String(
          payload?.status || payload?.state || payload?.data?.status || "",
        ).toLowerCase();
        const allyReference =
          payload?.orderId || payload?.allyReference || payload?.data?.orderId || payload?.data?.allyReference;

        const orderStatus = mapAddiStatusToOrder(status);
        const update: { addi_status: string | null; status?: string } = {
          addi_status: status || null,
        };
        if (orderStatus) update.status = orderStatus;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const query = supabaseAdmin.from("orders").update(update);
        const { error } = allyReference
          ? await query.eq("id", allyReference)
          : applicationId
          ? await query.eq("addi_application_id", applicationId)
          : { error: new Error("Missing identifiers") } as any;

        if (error) {
          console.error("Addi webhook update error:", error);
          // Still echo the body so Addi doesn't keep retrying if DB is momentarily down.
        }

        // MUST echo the exact same body Addi sent us, with HTTP 200.
        return new Response(raw, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      GET: async () => new Response("ok"),
    },
  },
});

function mapAddiStatusToOrder(status: string): string | null {
  // Addi enum: approved, rejected, declined, abandoned
  if (["approved", "disbursed", "completed", "paid"].includes(status)) return "paid";
  if (["rejected", "declined", "abandoned", "canceled", "cancelled", "expired", "failed"].includes(status))
    return "cancelled";
  if (["pending", "in_review", "processing"].includes(status)) return "pending";
  return null;
}
