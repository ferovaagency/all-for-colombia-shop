import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatCOP } from "@/lib/cart";
import { RefreshCw, AlertTriangle, CheckCircle2, PackageX, Clock, CloudDownload } from "lucide-react";

type InvProduct = {
  id: string;
  name: string;
  slug: string;
  inv_sku: string | null;
  inv_estado: string | null;
  inv_synced_at: string | null;
  stock: number | null;
  price: number | null;
  active: boolean | null;
};

function normalizeName(name: string) {
  return (name || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tiempo relativo en español: "hace 8 minutos". */
function relativeEs(iso: string | null): string {
  if (!iso) return "Sin datos";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "hace menos de un minuto";
  if (min === 1) return "hace 1 minuto";
  if (min < 60) return `hace ${min} minutos`;
  const h = Math.floor(min / 60);
  if (h === 1) return "hace 1 hora";
  if (h < 24) return `hace ${h} horas`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

function MetricCard({
  label,
  value,
  icon,
  warn,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  icon: React.ReactNode;
  warn?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`bg-card border rounded-xl p-4 ${warn ? "border-destructive/50 bg-destructive/5" : ""}`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
      </div>
      {value !== undefined && (
        <p className={`text-2xl font-bold ${warn ? "text-destructive" : ""}`}>{value}</p>
      )}
      {children}
    </div>
  );
}

export function InventoryPanel() {
  const [rows, setRows] = useState<InvProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id,name,slug,inv_sku,inv_estado,inv_synced_at,stock,price,active")
      .limit(2000);
    if (error) toast.error("No se pudo cargar el inventario: " + error.message);
    setRows((data as InvProduct[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    let vinculado = 0;
    let sin = 0;
    let ambiguo = 0;
    let last: string | null = null;
    for (const r of rows) {
      if (r.inv_estado === "vinculado") vinculado++;
      else if (r.inv_estado === "sin_inventario") sin++;
      else if (r.inv_estado === "ambiguo") ambiguo++;
      if (r.inv_synced_at && (!last || r.inv_synced_at > last)) last = r.inv_synced_at;
    }
    return { vinculado, sin, ambiguo, last };
  }, [rows]);

  const stale =
    !counts.last || Date.now() - new Date(counts.last).getTime() > 45 * 60 * 1000;

  const matches = useCallback(
    (r: InvProduct) => {
      const term = q.trim().toLowerCase();
      if (!term) return true;
      return (
        (r.name || "").toLowerCase().includes(term) ||
        (r.inv_sku || "").toLowerCase().includes(term)
      );
    },
    [q],
  );

  const lowStock = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            r.inv_estado === "vinculado" && (r.stock ?? 0) >= 1 && (r.stock ?? 0) <= 3 && matches(r),
        )
        .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0)),
    [rows, matches],
  );

  const outOfStock = useMemo(
    () => rows.filter((r) => r.inv_estado === "vinculado" && (r.stock ?? 0) === 0 && matches(r)),
    [rows, matches],
  );

  const duplicateGroups = useMemo(() => {
    const map = new Map<string, InvProduct[]>();
    for (const r of rows) {
      if (r.inv_estado !== "ambiguo" || !matches(r)) continue;
      const key = normalizeName(r.name);
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return Array.from(map.entries());
  }, [rows, matches]);

  const deactivate = async (id: string) => {
    const { error } = await supabase.from("products").update({ active: false }).eq("id", id);
    if (error) {
      toast.error("No se pudo desactivar: " + error.message);
      return;
    }
    toast.success("Producto desactivado");
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active: false } : r)));
  };

  const StockTable = ({ items }: { items: InvProduct[] }) => (
    <div className="bg-card border rounded-xl overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Precio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.inv_sku || "—"}</TableCell>
              <TableCell className="max-w-[420px]">{r.name}</TableCell>
              <TableCell className="text-right font-semibold">{r.stock ?? 0}</TableCell>
              <TableCell className="text-right">{formatCOP(r.price ?? 0)}</TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                {loading ? "Cargando..." : "Sin resultados"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Sincronizados con el Excel"
          value={counts.vinculado}
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
        />
        <MetricCard
          label="Sin respaldo en inventario"
          value={counts.sin}
          icon={<PackageX className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          label="Duplicados por revisar"
          value={counts.ambiguo}
          warn={counts.ambiguo > 0}
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
        />
        <MetricCard label="Última sincronización" icon={<Clock className="h-4 w-4" />} warn={stale}>
          <p className={`text-lg font-bold ${stale ? "text-destructive" : ""}`}>
            {relativeEs(counts.last)}
          </p>
          {stale && (
            <>
              <p className="text-xs text-destructive font-medium">
                La sincronización parece detenida
              </p>
              <a
                href={N8N_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-secondary inline-flex items-center gap-1 mt-1 underline"
              >
                Revisar en n8n <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </MetricCard>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <Input
          placeholder="Buscar por nombre o SKU..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-sm"
        />
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </Button>
      </div>

      <Tabs defaultValue="low">
        <TabsList>
          <TabsTrigger value="low">Stock bajo ({lowStock.length})</TabsTrigger>
          <TabsTrigger value="out">Agotados ({outOfStock.length})</TabsTrigger>
          <TabsTrigger value="dupes">Duplicados por revisar ({duplicateGroups.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="low" className="mt-4">
          <StockTable items={lowStock} />
        </TabsContent>

        <TabsContent value="out" className="mt-4">
          <StockTable items={outOfStock} />
        </TabsContent>

        <TabsContent value="dupes" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Estos productos están repetidos en el catálogo. Desactiva el que no corresponde para que
            el inventario del Excel pueda vincularse correctamente.
          </p>
          {duplicateGroups.map(([key, group]) => (
            <div key={key} className="bg-card border rounded-xl p-4">
              <p className="font-semibold mb-3">{group[0]?.name}</p>
              <div className="grid gap-3 md:grid-cols-2">
                {group.map((r) => (
                  <div key={r.id} className="border rounded-lg p-3 text-sm space-y-1">
                    <p className="font-mono text-[11px] text-muted-foreground break-all">{r.id}</p>
                    <p>
                      Stock: <span className="font-semibold">{r.stock ?? 0}</span>
                    </p>
                    <p>
                      Precio: <span className="font-semibold">{formatCOP(r.price ?? 0)}</span>
                    </p>
                    <p>
                      Estado:{" "}
                      <span className={r.active ? "text-green-700" : "text-muted-foreground"}>
                        {r.active ? "Activo" : "Inactivo"}
                      </span>
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      disabled={!r.active}
                      onClick={() => deactivate(r.id)}
                    >
                      Desactivar este
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {duplicateGroups.length === 0 && (
            <div className="bg-card border rounded-xl p-8 text-center text-muted-foreground">
              {loading ? "Cargando..." : "No hay duplicados pendientes"}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
