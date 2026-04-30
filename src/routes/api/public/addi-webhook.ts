import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Addi posts status updates here. We update the order status based on
// the application state. (Sandbox doesn't sign payloads consistently;
// we double-check by querying Addi if needed.)
export const Route = createFileRoute("/api/public/addi-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: any;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const applicationId =
          payload?.applicationId || payload?.id || payload?.data?.applicationId;
        const status =
          payload?.status || payload?.state || payload?.data?.status;
        const allyReference =
          payload?.allyReference || payload?.data?.allyReference;

        if (!applicationId && !allyReference) {
          return new Response("Missing identifiers", { status: 400 });
        }

        const orderStatus = mapAddiStatusToOrder(String(status || "").toUpperCase());

        const query = supabaseAdmin.from("orders").update({
          addi_status: status || null,
          ...(orderStatus ? { status: orderStatus } : {}),
        });

        const { error } = allyReference
          ? await query.eq("id", allyReference)
          : await query.eq("addi_application_id", applicationId);

        if (error) {
          console.error("Addi webhook update error:", error);
          return new Response("DB error", { status: 500 });
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      GET: async () => new Response("ok"),
    },
  },
});

function mapAddiStatusToOrder(status: string): string | null {
  if (["APPROVED", "DISBURSED", "COMPLETED", "PAID"].includes(status)) return "paid";
  if (["REJECTED", "CANCELED", "CANCELLED", "EXPIRED", "FAILED"].includes(status)) return "cancelled";
  if (["PENDING", "IN_REVIEW", "PROCESSING"].includes(status)) return "pending";
  return null;
}
