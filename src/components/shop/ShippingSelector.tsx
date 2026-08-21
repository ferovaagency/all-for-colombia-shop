import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCOP } from "@/lib/cart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Truck, Check, AlertTriangle, MapPin } from "lucide-react";

export type CartLine = { id: string; quantity: number };
export type Courier = {
  id: string;
  name: string;
  imgUrl?: string;
  cost: number;
  days: number;
  score?: number;
};
export type ShippingPackage = {
  weight: number;
  width: number;
  length: number;
  height: number;
  quantity: number;
  declaredValue: number;
};
export type ShippingSelection = {
  city: string;
  destinyDaneCode: string;
  courier: Courier | null;
  pkg?: ShippingPackage;
};

// Defaults used when a product has no weight/dimensions yet (kg / cm).
const DEF = { weight: 0.5, width: 15, length: 15, height: 15 };

type Location = { locationName: string; locationCode: string; departmentOrStateName: string };

export function ShippingSelector({
  items,
  subtotal,
  value,
  onChange,
}: {
  items: CartLine[];
  subtotal: number;
  value: ShippingSelection;
  onChange: (s: ShippingSelection) => void;
}) {
  const [query, setQuery] = useState(value.city || "");
  const [opts, setOpts] = useState<Location[]>([]);
  const [openList, setOpenList] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // City autocomplete (debounced).
  useEffect(() => {
    if (!openList) return;
    if (debRef.current) clearTimeout(debRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setOpts([]);
      return;
    }
    debRef.current = setTimeout(async () => {
      setLoadingCities(true);
      try {
        const r = await fetch(`/api/mipaquete/locations?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        setOpts(Array.isArray(d.results) ? d.results : []);
      } catch {
        setOpts([]);
      } finally {
        setLoadingCities(false);
      }
    }, 300);
    return () => {
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [query, openList]);

  async function computePackage(): Promise<ShippingPackage> {
    const ids = items.map((i) => i.id);
    const dims: Record<string, any> = {};
    try {
      const { data } = await supabase
        .from("products")
        .select("id, weight_kg, length_cm, width_cm, height_cm")
        .in("id", ids);
      for (const p of data || []) dims[(p as any).id] = p;
    } catch {
      /* las columnas de peso/dim pueden no existir aún -> defaults */
    }
    let weight = 0;
    let width = DEF.width;
    let length = DEF.length;
    let height = DEF.height;
    let quantity = 0;
    for (const it of items) {
      const p = dims[it.id] || {};
      const w = Number(p.weight_kg) > 0 ? Number(p.weight_kg) : DEF.weight;
      weight += w * it.quantity;
      width = Math.max(width, Number(p.width_cm) || DEF.width);
      length = Math.max(length, Number(p.length_cm) || DEF.length);
      height = Math.max(height, Number(p.height_cm) || DEF.height);
      quantity += it.quantity;
    }
    return {
      weight: Math.max(0.5, Math.round(weight * 100) / 100),
      width,
      length,
      height,
      quantity: Math.max(1, quantity),
      declaredValue: Math.max(1, Math.round(subtotal)),
    };
  }

  async function quoteFor(dane: string, city: string) {
    setLoadingQuote(true);
    setQuoteError(null);
    setCouriers([]);
    try {
      const pkg = await computePackage();
      const r = await fetch("/api/mipaquete/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinyLocationCode: dane, ...pkg }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.description || "No se pudo cotizar el envío");
      const list: Courier[] = (d.options || [])
        .map((o: any) => ({
          id: o.id,
          name: o.deliveryCompanyName,
          imgUrl: o.deliveryCompanyImgUrl,
          cost: Number(o.shippingCost) || 0,
          days: Math.max(1, Math.round((Number(o.shippingTime) || 0) / 1440)),
          score: o.score,
        }))
        .filter((c: Courier) => c.cost > 0)
        .sort((a: Courier, b: Courier) => a.cost - b.cost);
      if (list.length === 0) throw new Error("No hay transportadoras disponibles para esa ciudad.");
      setCouriers(list);
      onChange({ city, destinyDaneCode: dane, courier: null, pkg });
    } catch (e: any) {
      setQuoteError(e?.message || "Error cotizando el envío");
      onChange({ city, destinyDaneCode: dane, courier: null });
    } finally {
      setLoadingQuote(false);
    }
  }

  function pickCity(o: Location) {
    setQuery(o.locationName);
    setOpenList(false);
    setOpts([]);
    quoteFor(o.locationCode, o.locationName);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Label>Ciudad de entrega *</Label>
        <div className="relative">
          <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenList(true);
            }}
            onFocus={() => setOpenList(true)}
            placeholder="Escribe tu ciudad (ej. Medellín)"
            autoComplete="off"
          />
        </div>
        {openList && (query.trim().length >= 2) && (
          <div className="absolute z-20 mt-1 w-full bg-card border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {loadingCities && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...
              </div>
            )}
            {!loadingCities && opts.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Sin coincidencias</div>
            )}
            {opts.map((o) => (
              <button
                key={o.locationCode}
                type="button"
                onClick={() => pickCity(o)}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
              >
                <span className="font-medium">{o.locationName}</span>
                <span className="text-muted-foreground"> · {o.departmentOrStateName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loadingQuote && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Cotizando el envío...
        </div>
      )}

      {quoteError && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {quoteError}
        </div>
      )}

      {couriers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Elige la transportadora
          </p>
          {couriers.map((c) => {
            const active = value.courier?.id === c.id;
            return (
              <label
                key={c.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  active ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="courier"
                  className="sr-only"
                  checked={active}
                  onChange={() => onChange({ ...value, courier: c })}
                />
                <span
                  className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    active ? "border-primary bg-primary text-white" : "border-muted-foreground/40"
                  }`}
                >
                  {active && <Check className="h-3 w-3" />}
                </span>
                {c.imgUrl ? (
                  <img src={c.imgUrl} alt={c.name} className="h-6 w-auto object-contain" />
                ) : (
                  <Truck className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Entrega ~{c.days} día{c.days !== 1 ? "s" : ""} hábil{c.days !== 1 ? "es" : ""}
                    {c.score ? ` · ${c.score.toFixed(1)}★` : ""}
                  </p>
                </div>
                <span className="font-bold whitespace-nowrap">{formatCOP(c.cost)}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ShippingSelector;
