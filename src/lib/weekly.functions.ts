import { createServerFn } from "@tanstack/react-start";

// Historial del "Producto de la Semana".
//
// Los deals anteriores quedan is_active = false y, por RLS, no son visibles al
// cliente anónimo. Por eso el "muro de la fama" se lee con el cliente
// service-role desde el servidor. Solo devuelve campos públicos.
export const getPastWeeklyDeals = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("weekly_deals")
      .select(
        "id, discount_percent, reveal_at, ends_at, product:products(slug, name, price, images)",
      )
      .lt("ends_at", nowIso)
      .order("ends_at", { ascending: false })
      .limit(8);

    if (error) throw new Error(error.message);

    const past = ((data as any[]) ?? []).filter((d) => d.product);
    return { past };
  } catch (e) {
    console.error("getPastWeeklyDeals failed:", e);
    return { past: [] };
  }
});
