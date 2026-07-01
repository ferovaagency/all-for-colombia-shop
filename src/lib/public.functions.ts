import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Save a public chat conversation (anonymous web chat). Uses service role
// since chat_conversations is no longer publicly writable.
export const saveChatConversation = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        session_id: z.string().min(1).max(128),
        messages: z.array(z.any()).max(500),
        page_url: z.string().max(2048).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("chat_conversations").upsert(
        {
          session_id: data.session_id,
          messages: data.messages,
          page_url: data.page_url ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id" },
      );
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (error) {
      console.error("Error saving chat conversation:", error);
      return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });

// Recent completed orders for the social-proof popup, sanitized:
// only first name, city and product name. No emails, phones, totals, etc.
export const getSocialProofOrders = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("customer_name, items, shipping_address, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);

    const sanitized = (data ?? []).map((row: any) => {
      const firstName =
        typeof row.customer_name === "string" && row.customer_name.trim()
          ? row.customer_name.trim().split(/\s+/)[0]
          : "Alguien";

      const addr = row.shipping_address;
      let city: string | null = null;
      if (addr && typeof addr === "object") {
        const a = addr as Record<string, unknown>;
        for (const c of [a.city, a.ciudad, a.locality, a.town]) {
          if (typeof c === "string" && c.trim()) {
            city = c.trim();
            break;
          }
        }
      }

      let productName: string | null = null;
      if (Array.isArray(row.items) && row.items.length > 0) {
        const first = row.items[0] as Record<string, unknown>;
        for (const c of [first?.name, first?.product_name, first?.title]) {
          if (typeof c === "string" && c.trim()) {
            productName = c.trim();
            break;
          }
        }
      }

      return productName ? { firstName, city, productName } : null;
    });

    return { orders: sanitized.filter((o): o is NonNullable<typeof o> => o !== null) };
  } catch (error) {
    // If Supabase is unavailable, return empty orders instead of crashing
    console.error("Error fetching social proof orders:", error);
    return { orders: [] };
  }
});

// Look up a single guest order by full UUID + matching email.
export const lookupGuestOrder = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email().max(255),
        order_id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("id, status, items, total, created_at, payment_method")
        .eq("id", data.order_id)
        .eq("customer_email", data.email.toLowerCase().trim())
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { order: order ?? null };
    } catch (error) {
      console.error("Error looking up guest order:", error);
      return { order: null, error: error instanceof Error ? error.message : "Unknown error" };
    }
  });