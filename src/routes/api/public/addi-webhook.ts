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
        const credentialPairs = [
          {
            user: process.env.ADDI_WEBHOOK_USER?.trim(),
            pass: process.env.ADDI_WEBHOOK_PASS?.trim(),
          },
          {
            user: process.env.ADDI_CLIENT_ID?.trim(),
            pass: process.env.ADDI_CLIENT_SECRET?.trim(),
          },
          // Official Addi Magento callback credentials used by their sample/plugin.
          // Addi's callback client sends Authorization: Basic <base64(user:pass)>.
          { user: "mAg3ntoAdd1", pass: "pbd!2h!kE7S!s5BS" },
          { user: "mAg3ntoAdd1prod", pass: "E%yuzMQ^W$1v" },
        ].filter((pair): pair is { user: string; pass: string } => Boolean(pair.user && pair.pass));

        if (credentialPairs.length > 0) {
          if (!isAuthorizedAddiWebhook(request.headers, credentialPairs)) {
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

function isAuthorizedAddiWebhook(headers: Headers, credentialPairs: Array<{ user: string; pass: string }>) {
  const authorization = headers.get("authorization")?.trim() || "";
  if (authorization.toLowerCase().startsWith("basic ")) {
    const encoded = authorization.slice(6).trim();
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const separatorIndex = decoded.indexOf(":");
      if (separatorIndex >= 0) {
        const headerUser = decoded.slice(0, separatorIndex);
        const headerPass = decoded.slice(separatorIndex + 1);
        if (matchesCredentialPair(headerUser, headerPass, credentialPairs)) return true;
      }
    } catch {
      return false;
    }
  }

  if (authorization) {
    const rawAuthValue = authorization.replace(/^bearer\s+/i, "").trim();
    if (matchesSingleCredential(rawAuthValue, credentialPairs)) return true;

    try {
      const decoded = Buffer.from(rawAuthValue, "base64").toString("utf8");
      const separatorIndex = decoded.indexOf(":");
      if (separatorIndex >= 0) {
        const headerUser = decoded.slice(0, separatorIndex);
        const headerPass = decoded.slice(separatorIndex + 1);
        if (matchesCredentialPair(headerUser, headerPass, credentialPairs)) return true;
      }
    } catch {
      // Non-base64 Authorization values are handled as raw bearer/API key values above.
    }
  }

  const headerUser = firstHeader(headers, [
    "ADDI_WEBHOOK_USER",
    "ADDI_CLIENT_ID",
    "x-addi-webhook-user",
    "x-addi-user",
    "addi-user",
    "x-addi-client-id",
    "x-addi-client_id",
    "addi-client-id",
    "addi-client_id",
    "x-webhook-user",
    "x-webhook-username",
    "webhook-username",
    "auth-user",
    "auth-username",
    "authentication-user",
    "authentication-username",
    "x-username",
    "x-user",
    "x-auth-user",
    "x-auth-username",
    "x-authentication-user",
    "x-authentication-username",
    "x-client-id",
    "client-id",
    "client_id",
    "clientid",
    "client_id_header",
    "webhook-user",
    "username",
    "userid",
    "user",
  ]);
  const headerPass = firstHeader(headers, [
    "ADDI_WEBHOOK_PASS",
    "ADDI_WEBHOOK_PASSWORD",
    "ADDI_CLIENT_SECRET",
    "x-addi-webhook-pass",
    "x-addi-webhook-password",
    "x-addi-pass",
    "x-addi-password",
    "addi-pass",
    "addi-password",
    "x-addi-client-secret",
    "x-addi-client_secret",
    "addi-client-secret",
    "addi-client_secret",
    "x-webhook-pass",
    "x-webhook-password",
    "webhook-password",
    "auth-pass",
    "auth-password",
    "authentication-pass",
    "authentication-password",
    "x-password",
    "x-pass",
    "x-auth-password",
    "x-auth-pass",
    "x-authentication-password",
    "x-authentication-pass",
    "x-client-secret",
    "client-secret",
    "client_secret",
    "clientsecret",
    "client_secret_header",
    "webhook-pass",
    "password",
    "pass",
    "secret",
  ]);

  const apiKey = firstHeader(headers, [
    "ADDI_WEBHOOK_PASS",
    "ADDI_CLIENT_SECRET",
    "x-api-key",
    "x-apikey",
    "x-addi-api-key",
    "x-addi-apikey",
    "x-access-token",
    "x-auth-token",
    "x-webhook-token",
    "x-addi-token",
    "api-key",
    "apikey",
    "access-token",
    "auth-token",
    "webhook-token",
    "token",
  ]);

  if (headerUser && headerPass && matchesCredentialPair(headerUser.trim(), headerPass.trim(), credentialPairs)) {
    return true;
  }

  return Boolean(apiKey && matchesSingleCredential(apiKey, credentialPairs));
}

function firstHeader(headers: Headers, names: string[]) {
  for (const name of names) {
    const value = headers.get(name);
    if (value) return value;
  }
  return null;
}

function safeEqual(a: string, b: string) {
  return a.length === b.length && a === b;
}

function matchesCredentialPair(user: string, pass: string, credentialPairs: Array<{ user: string; pass: string }>) {
  return credentialPairs.some(
    (pair) => safeEqual(user.trim(), pair.user) && safeEqual(pass.trim(), pair.pass),
  );
}

function matchesSingleCredential(value: string, credentialPairs: Array<{ user: string; pass: string }>) {
  const normalized = value.trim();
  return credentialPairs.some(
    (pair) => safeEqual(normalized, pair.pass) || safeEqual(normalized, `${pair.user}:${pair.pass}`),
  );
}
