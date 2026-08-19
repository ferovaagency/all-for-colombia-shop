import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Consulta el stock actual de los productos del carrito.
 * Devuelve un mapa id -> stock (0 cuando es null) y si hay conflictos.
 */
export function useCartStock(items: { id: string; quantity: number }[]) {
  const [stockById, setStockById] = useState<Record<string, number>>({});
  const ids = items.map((i) => i.id).sort().join(",");

  useEffect(() => {
    let cancelled = false;
    const list = ids ? ids.split(",") : [];
    if (list.length === 0) {
      setStockById({});
      return;
    }
    (async () => {
      const { data } = await supabase.from("products").select("id,stock").in("id", list);
      if (cancelled || !data) return;
      const map: Record<string, number> = {};
      for (const r of data as { id: string; stock: number | null }[]) {
        map[r.id] = r.stock ?? 0;
      }
      setStockById(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const issues = items.filter((it) => {
    const s = stockById[it.id];
    return s !== undefined && s < it.quantity;
  });

  return { stockById, issues, hasIssues: issues.length > 0 };
}
