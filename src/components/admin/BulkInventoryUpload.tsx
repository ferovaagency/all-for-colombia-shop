import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Package,
  PlusCircle,
  MinusCircle,
} from "lucide-react";

type Row = Record<string, string | number | null | undefined>;
type Step = "upload" | "map" | "preview" | "done";

interface ExistingProduct {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  stock: number | null;
  norm: string;
}

interface PlanUpdate {
  id: string;
  name: string;
  currentPrice: number | null;
  newPrice: number | null;
  currentStock: number | null;
  newStock: number;
  score: number;
  sourceName: string;
}
interface PlanCreate {
  name: string;
  slug: string;
  price: number | null;
  stock: number;
}
interface PlanZero {
  id: string;
  name: string;
  currentStock: number | null;
}

// -------------- Utilities --------------

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const slugify = (s: string) =>
  normalize(s).replace(/\s+/g, "-").slice(0, 80).replace(/^-+|-+$/g, "");

// Dice coefficient on bigrams (0..1)
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = (s: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      map.set(bg, (map.get(bg) ?? 0) + 1);
    }
    return map;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  let sizeA = 0;
  let sizeB = 0;
  A.forEach((v) => (sizeA += v));
  B.forEach((v) => (sizeB += v));
  A.forEach((v, k) => {
    const w = B.get(k);
    if (w) inter += Math.min(v, w);
  });
  return (2 * inter) / (sizeA + sizeB || 1);
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const s = String(v).trim().replace(/[$\s]/g, "");
  // Handle "1.234,56" (es-CO) and "1,234.56"
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let normalized = s;
  if (hasComma && hasDot) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma && !hasDot) {
    normalized = s.replace(",", ".");
  }
  const n = parseFloat(normalized);
  return isFinite(n) ? n : null;
}

const MATCH_THRESHOLD = 0.72;

// -------------- Component --------------

export function BulkInventoryUpload() {
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [mapName, setMapName] = useState<string>("");
  const [mapPrice, setMapPrice] = useState<string>("");
  const [mapStock, setMapStock] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<{
    updates: PlanUpdate[];
    creates: PlanCreate[];
    zeros: PlanZero[];
  } | null>(null);
  const [result, setResult] = useState<{
    updated: number;
    created: number;
    zeroed: number;
    errors: string[];
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const guessColumn = (candidates: string[], cols: string[]) =>
    cols.find((c) => candidates.some((k) => normalize(c).includes(k))) ?? "";

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
      if (!data.length) {
        toast.error("El archivo está vacío.");
        return;
      }
      const cols = Object.keys(data[0]);
      setRows(data);
      setColumns(cols);
      setMapName(guessColumn(["nombre", "producto", "descripcion", "name"], cols));
      setMapPrice(guessColumn(["precio", "price", "valor"], cols));
      setMapStock(guessColumn(["stock", "cantidad", "existencia", "inventario", "qty"], cols));
      setStep("map");
    } catch (e) {
      toast.error("No se pudo leer el archivo. Verifica que sea CSV o Excel válido.");
      console.error(e);
    }
  };

  const buildPlan = async () => {
    if (!mapName || !mapPrice || !mapStock) {
      toast.error("Selecciona las columnas de Nombre, Precio y Stock.");
      return;
    }
    setLoading(true);
    try {
      const { data: existing, error } = await supabase
        .from("products")
        .select("id, name, slug, price, stock");
      if (error) throw error;

      const existingList: ExistingProduct[] = (existing ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price ?? null,
        stock: p.stock ?? null,
        norm: normalize(p.name),
      }));

      const updates: PlanUpdate[] = [];
      const creates: PlanCreate[] = [];
      const matchedIds = new Set<string>();
      const usedSlugs = new Set(existingList.map((p) => p.slug));

      for (const row of rows) {
        const rawName = String(row[mapName] ?? "").trim();
        if (!rawName) continue;
        const price = toNumber(row[mapPrice]);
        const stock = toNumber(row[mapStock]) ?? 0;
        const nm = normalize(rawName);

        let best: ExistingProduct | null = null;
        let bestScore = 0;
        for (const p of existingList) {
          if (matchedIds.has(p.id)) continue;
          const s = similarity(nm, p.norm);
          if (s > bestScore) {
            bestScore = s;
            best = p;
          }
        }

        if (best && bestScore >= MATCH_THRESHOLD) {
          matchedIds.add(best.id);
          updates.push({
            id: best.id,
            name: best.name,
            currentPrice: best.price,
            newPrice: price,
            currentStock: best.stock,
            newStock: Math.max(0, Math.floor(stock)),
            score: bestScore,
            sourceName: rawName,
          });
        } else {
          let slug = slugify(rawName);
          if (!slug) slug = `producto-${Date.now()}`;
          let unique = slug;
          let i = 2;
          while (usedSlugs.has(unique)) {
            unique = `${slug}-${i++}`;
          }
          usedSlugs.add(unique);
          creates.push({
            name: rawName,
            slug: unique,
            price,
            stock: Math.max(0, Math.floor(stock)),
          });
        }
      }

      const zeros: PlanZero[] = existingList
        .filter((p) => !matchedIds.has(p.id) && (p.stock ?? 0) > 0)
        .map((p) => ({ id: p.id, name: p.name, currentStock: p.stock }));

      setPlan({ updates, creates, zeros });
      setStep("preview");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error inesperado";
      toast.error(`Error al analizar: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const process = async () => {
    if (!plan) return;
    setLoading(true);
    const errors: string[] = [];
    let updated = 0;
    let created = 0;
    let zeroed = 0;

    // Updates in batches
    for (const u of plan.updates) {
      const payload: { stock: number; price?: number } = { stock: u.newStock };
      if (u.newPrice !== null) payload.price = u.newPrice;
      const { error } = await supabase.from("products").update(payload).eq("id", u.id);
      if (error) errors.push(`Actualizar "${u.name}": ${error.message}`);
      else updated++;
    }

    // Creates: bulk insert in chunks of 200
    const chunks: PlanCreate[][] = [];
    for (let i = 0; i < plan.creates.length; i += 200) {
      chunks.push(plan.creates.slice(i, i + 200));
    }
    for (const chunk of chunks) {
      const payload = chunk.map((c) => ({
        name: c.name,
        slug: c.slug,
        price: c.price,
        stock: c.stock,
        active: true,
      }));
      const { data, error } = await supabase.from("products").insert(payload).select("id");
      if (error) errors.push(`Crear productos: ${error.message}`);
      else created += data?.length ?? 0;
    }

    // Zero stock: bulk update by IDs (chunked)
    for (let i = 0; i < plan.zeros.length; i += 200) {
      const ids = plan.zeros.slice(i, i + 200).map((z) => z.id);
      if (!ids.length) break;
      const { error } = await supabase.from("products").update({ stock: 0 }).in("id", ids);
      if (error) errors.push(`Poner en stock 0: ${error.message}`);
      else zeroed += ids.length;
    }

    setResult({ updated, created, zeroed, errors });
    setStep("done");
    setLoading(false);
    if (errors.length === 0) {
      toast.success("Inventario actualizado correctamente.");
    } else {
      toast.warning(`Procesado con ${errors.length} error(es).`);
    }
  };

  const reset = () => {
    setStep("upload");
    setRows([]);
    setColumns([]);
    setFileName("");
    setMapName("");
    setMapPrice("");
    setMapStock("");
    setPlan(null);
    setResult(null);
  };

  const previewSample = useMemo(() => {
    if (!plan) return null;
    return {
      updates: plan.updates.slice(0, 8),
      creates: plan.creates.slice(0, 8),
      zeros: plan.zeros.slice(0, 8),
    };
  }, [plan]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Actualización masiva de inventario</h2>
        <p className="text-sm text-muted-foreground">
          Sube el archivo del proveedor (CSV o Excel). Se cruzará por nombre con búsqueda difusa,
          se crearán los productos nuevos y los que ya no aparezcan pasarán a stock 0.
        </p>
      </div>

      {/* STEP: UPLOAD */}
      {step === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/60"
          }`}
        >
          <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">Arrastra tu archivo aquí o haz clic para seleccionar</p>
          <p className="text-xs text-muted-foreground mt-1">Formatos: .xlsx, .xls, .csv</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </div>
      )}

      {/* STEP: MAP */}
      {step === "map" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" /> {fileName} · {rows.length} filas ·{" "}
            {columns.length} columnas
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <MapField label="Nombre del producto" value={mapName} onChange={setMapName} cols={columns} />
            <MapField label="Precio" value={mapPrice} onChange={setMapPrice} cols={columns} />
            <MapField label="Stock / Cantidad" value={mapStock} onChange={setMapStock} cols={columns} />
          </div>

          {mapName && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Nombre</th>
                    <th className="p-2 text-left">Precio</th>
                    <th className="p-2 text-left">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{String(r[mapName] ?? "")}</td>
                      <td className="p-2">{mapPrice ? String(r[mapPrice] ?? "") : "—"}</td>
                      <td className="p-2">{mapStock ? String(r[mapStock] ?? "") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
            <Button onClick={buildPlan} disabled={loading || !mapName || !mapPrice || !mapStock}>
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Analizar inventario
            </Button>
          </div>
        </div>
      )}

      {/* STEP: PREVIEW */}
      {step === "preview" && plan && previewSample && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              icon={<Package className="h-5 w-5 text-blue-600" />}
              label="Se actualizarán"
              value={plan.updates.length}
              tone="blue"
            />
            <SummaryCard
              icon={<PlusCircle className="h-5 w-5 text-green-600" />}
              label="Se crearán nuevos"
              value={plan.creates.length}
              tone="green"
            />
            <SummaryCard
              icon={<MinusCircle className="h-5 w-5 text-amber-600" />}
              label="Pasarán a stock 0"
              value={plan.zeros.length}
              tone="amber"
            />
          </div>

          <PreviewTable
            title={`Actualizaciones (${plan.updates.length})`}
            empty="Ninguna"
            headers={["Producto (BD)", "Coincidencia archivo", "Precio", "Stock", "Similitud"]}
            rows={previewSample.updates.map((u) => [
              u.name,
              u.sourceName,
              `${u.currentPrice ?? "—"} → ${u.newPrice ?? "—"}`,
              `${u.currentStock ?? 0} → ${u.newStock}`,
              `${Math.round(u.score * 100)}%`,
            ])}
          />

          <PreviewTable
            title={`Nuevos productos (${plan.creates.length})`}
            empty="Ninguno"
            headers={["Nombre", "Slug (URL)", "Precio", "Stock"]}
            rows={previewSample.creates.map((c) => [c.name, c.slug, c.price ?? "—", c.stock])}
          />

          <PreviewTable
            title={`A stock 0 (${plan.zeros.length})`}
            empty="Ninguno"
            headers={["Producto", "Stock actual"]}
            rows={previewSample.zeros.map((z) => [z.name, z.currentStock ?? 0])}
          />

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("map")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
            <Button onClick={process} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Procesar inventario
            </Button>
          </div>
        </div>
      )}

      {/* STEP: DONE */}
      {step === "done" && result && (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-green-50 border-green-200 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Proceso completado</p>
              <p className="text-sm text-green-700">
                Actualizados: {result.updated} · Creados: {result.created} · A stock 0:{" "}
                {result.zeroed}
              </p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-lg border p-4 bg-amber-50 border-amber-200">
              <div className="flex items-center gap-2 mb-2 text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <p className="font-medium">Errores ({result.errors.length})</p>
              </div>
              <ul className="text-xs text-amber-900 list-disc pl-5 space-y-1 max-h-48 overflow-auto">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <Button onClick={reset}>Cargar otro archivo</Button>
        </div>
      )}
    </div>
  );
}

function MapField({
  label,
  value,
  onChange,
  cols,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  cols: string[];
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Selecciona columna" />
        </SelectTrigger>
        <SelectContent>
          {cols.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "blue" | "green" | "amber";
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 border-blue-200"
      : tone === "green"
      ? "bg-green-50 border-green-200"
      : "bg-amber-50 border-amber-200";
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2">{icon}<span className="text-sm text-muted-foreground">{label}</span></div>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function PreviewTable({
  title,
  headers,
  rows,
  empty,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  empty: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="p-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  {r.map((c, j) => (
                    <td key={j} className="p-2">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
