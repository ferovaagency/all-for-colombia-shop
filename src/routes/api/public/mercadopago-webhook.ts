import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/mercadopago-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!accessToken) return new Response("not configured", { status: 200 });

        let payload: any = {};
        try {
          payload = await request.json();
        } catch {
          return new Response("ok", { status: 200 });
        }

        // MP envía { type:"payment", data:{ id } } o ?topic=payment&id=...
        const url = new URL(request.url);
        const paymentId =
          payload?.data?.id ||
          payload?.resource ||
          url.searchParams.get("id") ||
          url.searchParams.get("data.id");
        const topic = payload?.type || url.searchParams.get("topic") || url.searchParams.get("type");

        if (!paymentId || (topic && topic !== "payment")) {
          return new Response("ignored", { status: 200 });
        }

        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return new Response("payment lookup failed", { status: 200 });

        const payment = (await res.json()) as {
          status?: string;
          external_reference?: string;
        };
        const orderId = payment.external_reference;
        if (!orderId) return new Response("no external_reference", { status: 200 });

        const statusMap: Record<string, string> = {
          approved: "paid",
          pending: "pending",
          in_process: "pending",
          rejected: "failed",
          cancelled: "cancelled",
          refunded: "refunded",
        };
        const newStatus = statusMap[payment.status ?? ""] ?? "pending";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("orders").update({ status: newStatus }).eq("id", orderId);

        return new Response("ok", { status: 200 });
      },
    },
  },
});
