import { createFileRoute } from "@tanstack/react-router";

// Addi webhook (Online Application Callback).
// Requirements from Addi:
//  - Credentials configured in Addi's portal, stored here as
//    ADDI_WEBHOOK_USER / ADDI_WEBHOOK_PASS. Addi may send them either as
//    Basic Auth or as explicit headers, so we accept both formats.
//  - Respond HTTP 200 echoing the exact same JSON body received.
//  - Retries every 30 min for up to 24 h if the response is not 200.
export const Route = createFileRoute("/api/public/addi-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = process.env.ADDI_WEBHOOK_USER?.trim();
        const pass = process.env.ADDI_WEBHOOK_PASS?.trim();
        if (user && pass) {
          if (!isAuthorizedAddiWebhook(request.headers, user, pass)) {
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

function isAuthorizedAddiWebhook(headers: Headers, expectedUser: string, expectedPass: string) {
  const authorization = headers.get("authorization")?.trim() || "";
  if (authorization.toLowerCase().startsWith("basic ")) {
    const encoded = authorization.slice(6).trim();
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const separatorIndex = decoded.indexOf(":");
      if (separatorIndex >= 0) {
        const headerUser = decoded.slice(0, separatorIndex);
        const headerPass = decoded.slice(separatorIndex + 1);
        if (safeEqual(headerUser, expectedUser) && safeEqual(headerPass, expectedPass)) return true;
      }
    } catch {
      return false;
    }
  }

  const headerUser = firstHeader(headers, [
    "x-addi-webhook-user",
    "x-addi-user",
    "x-webhook-user",
    "x-webhook-username",
    "webhook-user",
    "username",
    "user",
  ]);
  const headerPass = firstHeader(headers, [
    "x-addi-webhook-pass",
    "x-addi-webhook-password",
    "x-addi-pass",
    "x-addi-password",
    "x-webhook-pass",
    "x-webhook-password",
    "webhook-pass",
    "password",
    "pass",
  ]);

  return Boolean(
    headerUser &&
      headerPass &&
      safeEqual(headerUser.trim(), expectedUser) &&
      safeEqual(headerPass.trim(), expectedPass),
  );
}

function firstHeader(headers: Headers, names: string[]) {
  for (const name of names) {
    const value = headers.get(name);
    if (value) return value;
  }
  return null;
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.subtle
    ? a === b
    : a === b;
}
