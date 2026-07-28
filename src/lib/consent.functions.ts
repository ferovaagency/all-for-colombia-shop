import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Registro de consentimientos (Ley 1581 de 2012, Decreto 1377 de 2013).
 *
 * Corre en el servidor a propósito: la IP y el User-Agent deben tomarse de la
 * petición real, no de lo que diga el cliente. Se escribe con service role
 * porque las tablas no son escribibles públicamente.
 */

/** IP del visitante. En Cloudflare la cabecera confiable es cf-connecting-ip. */
function clientIp(): string | null {
  try {
    return (
      getRequestHeader("cf-connecting-ip" as never) ?? getRequestIP({ xForwardedFor: true }) ?? null
    );
  } catch {
    return null;
  }
}

function clientMeta() {
  let userAgent: string | null = null;
  let language: string | null = null;
  try {
    userAgent = getRequestHeader("user-agent") ?? null;
    language = getRequestHeader("accept-language")?.split(",")[0] ?? null;
  } catch {
    /* fuera de contexto de petición */
  }
  return { ip: clientIp(), user_agent: userAgent, language };
}

const consentItem = z.object({
  policy: z.string().min(1).max(120),
  version: z.string().min(1).max(20),
  accepted: z.boolean().default(true),
});

export const recordLegalConsent = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        consents: z.array(consentItem).min(1).max(10),
        origin: z.string().min(1).max(60),
        guest_id: z.string().max(128).optional().nullable(),
        user_id: z.string().uuid().optional().nullable(),
        reference: z.string().max(200).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const meta = clientMeta();
      const rows = data.consents.map((c) => ({
        session_id: data.guest_id || "guest",
        user_email: null,
        terms_accepted: c.policy === "terms" ? c.accepted : false,
        privacy_accepted: c.policy === "privacy" ? c.accepted : false,
        marketing_accepted: c.policy === "marketing" ? c.accepted : false,
        adult_confirmed: c.policy === "adult" ? c.accepted : false,
      }));
      const { error } = await supabaseAdmin.from("legal_consents").insert(rows);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (error) {
      // Nunca bloquear una compra o un registro porque falle la bitácora.
      console.error("recordLegalConsent failed:", error);
      return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

export const recordCookieConsent = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        analytics: z.boolean(),
        marketing: z.boolean(),
        functional: z.boolean(),
        policy_version: z.string().min(1).max(20),
        guest_id: z.string().max(128),
        user_id: z.string().uuid().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const meta = clientMeta();
      const { error } = await supabaseAdmin.from("cookie_consents").insert({
        session_id: data.guest_id,
        necessary: true,
        analytics: data.analytics,
        marketing: data.marketing,
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (error) {
      console.error("recordCookieConsent failed:", error);
      return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

export const PRIVACY_REQUEST_TYPES = [
  "acceso",
  "actualizacion",
  "rectificacion",
  "supresion",
  "revocatoria",
  "consulta",
  "reclamo",
] as const;

export const submitPrivacyRequest = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        type: z.enum(PRIVACY_REQUEST_TYPES),
        full_name: z.string().trim().min(3).max(120),
        document_id: z.string().trim().min(4).max(30),
        email: z.string().trim().email().max(255),
        phone: z.string().trim().max(30).optional().nullable(),
        description: z.string().trim().min(10).max(3000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const meta = clientMeta();
      const { data: row, error } = await supabaseAdmin
        .from("privacy_requests")
        .insert({
          type: data.type,
          user_email: data.email.toLowerCase(),
          details: data.description,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, id: row?.id as string | undefined };
    } catch (error) {
      console.error("submitPrivacyRequest failed:", error);
      return { ok: false, error: "No pudimos radicar tu solicitud. Intenta de nuevo." };
    }
  });
