import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LOGITECH_ADVISORY_KNOWLEDGE } from "./logitech-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = "https://allforall.com.co";
const WHATSAPP_PHONE = "573134977955";
const MAX_HISTORY = 12;
const MAX_MESSAGE_LENGTH = 1200;

type ChatMessage = { role: "user" | "assistant"; content: string };

interface ChatRequest {
  session_id: string;
  message: string;
  history?: ChatMessage[];
}

interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  brand: string | null;
  price: number;
  sale_price: number | null;
  short_description: string | null;
  description: string | null;
  images?: string[] | null;
  stock: number | null;
  specs: unknown;
  categories: { name?: string; slug?: string } | null;
  brands: { name?: string; slug?: string } | null;
}

const STOP_WORDS = new Set([
  "algo",
  "algun",
  "alguna",
  "algunas",
  "algunos",
  "busca",
  "buscar",
  "buscando",
  "como",
  "comprar",
  "con",
  "cual",
  "cuales",
  "dame",
  "del",
  "donde",
  "encontrar",
  "esta",
  "este",
  "esto",
  "hay",
  "las",
  "los",
  "mejor",
  "muestre",
  "necesito",
  "para",
  "pero",
  "podria",
  "puede",
  "quiero",
  "recomienda",
  "recomendacion",
  "sea",
  "sirva",
  "tenga",
  "tener",
  "tienes",
  "tipo",
  "un",
  "una",
  "uno",
  "unos",
  "ver",
  "xyz",
]);

// Equivalencias comerciales comunes. Ali debe entender cómo habla un comprador,
// no exigir que use el mismo nombre de la ficha de producto.
const SYNONYM_GROUPS = [
  ["chasis", "gabinete", "case", "caja", "torre"],
  ["portatil", "laptop", "notebook", "computador portatil"],
  ["computador", "pc", "equipo", "ordenador"],
  ["pantalla", "monitor", "display"],
  ["audifonos", "auriculares", "headset", "diadema"],
  ["mouse", "raton"],
  ["teclado", "keyboard"],
  ["impresora", "impresion"],
  ["plotter", "ploter", "gran formato"],
  ["celular", "telefono", "smartphone", "movil"],
  ["disco", "ssd", "almacenamiento"],
  ["memoria", "ram"],
  ["tarjeta grafica", "grafica", "gpu", "video"],
  ["fuente", "fuente poder", "power supply", "psu"],
  ["aire acondicionado", "aire", "climatizacion"],
  ["gaming", "gamer", "juegos"],
];

const HUMAN_REQUEST_RE =
  /\b(asesor|asesora|agente|humano|humana|persona|whatsapp|hablar con alguien)\b/i;

const LOGITECH_ADVISORY_RE =
  /\b(logitech|logi|mouse|raton|teclado|keyboard|combo|presentador|presentaciones|trackball|easy switch|logi bolt|unifying|mx master|mx keys|pebble|lift vertical|wave keys|m\s?\d{2,4}|k\s?\d{2,4}|mk\s?\d{2,4}|g\s?\d{3,4})\b/i;

const normalize = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function tokenize(query: string): string[] {
  const normalized = normalize(query);
  const base = normalized
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
  const expanded = new Set(base);

  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map(normalize);
    if (normalizedGroup.some((term) => normalized.includes(term))) {
      normalizedGroup.forEach((term) => term.split(" ").forEach((token) => expanded.add(token)));
    }
  }

  return [...expanded];
}

function levenshtein(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    for (let j = 0; j <= b.length; j++) previous[j] = current[j];
  }
  return previous[b.length];
}

function tokenMatchScore(field: string, token: string): number {
  if (!field || !token) return 0;
  if (field === token) return 12;
  if (field.startsWith(`${token} `) || field.includes(` ${token} `)) return 9;
  if (field.includes(token)) return token.length >= 4 ? 6 : 2;

  if (token.length >= 5) {
    const words = field.split(" ");
    if (
      words.some(
        (word) => Math.abs(word.length - token.length) <= 1 && levenshtein(word, token) <= 1,
      )
    ) {
      return 3;
    }
  }
  return 0;
}

function scoreProduct(product: CatalogProduct, query: string): number {
  const normalizedQuery = normalize(query);
  const tokens = tokenize(query);
  if (!tokens.length) return 0;

  const fields = {
    name: normalize(product.name),
    sku: normalize(product.sku),
    brand: normalize(product.brand || product.brands?.name),
    category: normalize(`${product.categories?.name ?? ""} ${product.categories?.slug ?? ""}`),
    short: normalize(product.short_description),
    description: normalize(product.description),
    specs: normalize(JSON.stringify(product.specs ?? {})),
  };

  let score = 0;
  if (fields.name.includes(normalizedQuery)) score += 80;
  if (fields.sku && normalizedQuery.includes(fields.sku)) score += 100;
  if (fields.brand && normalizedQuery.includes(fields.brand)) score += 25;

  for (const token of tokens) {
    score += tokenMatchScore(fields.sku, token) * 7;
    score += tokenMatchScore(fields.name, token) * 5;
    score += tokenMatchScore(fields.category, token) * 4;
    score += tokenMatchScore(fields.brand, token) * 3;
    score += tokenMatchScore(fields.short, token) * 2;
    score += tokenMatchScore(fields.specs, token) * 2;
    score += tokenMatchScore(fields.description, token);
  }

  const matchedTokens = tokens.filter((token) =>
    Object.values(fields).some((field) => tokenMatchScore(field, token) > 0),
  ).length;
  score += matchedTokens * 8;
  if (matchedTokens === tokens.length) score += 20;

  const effectivePrice = Number(product.sale_price || product.price || 0);
  const budget = extractBudget(query);
  if (budget && effectivePrice > 0) {
    if (effectivePrice <= budget) score += 18;
    else if (effectivePrice <= budget * 1.12) score += 5;
    else score -= 12;
  }

  if ((product.stock ?? 0) > 0) score += 5;
  return score;
}

function extractBudget(message: string): number | null {
  const normalized = String(message)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9$.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Solo interpreta una cifra como presupuesto si hay una señal monetaria.
  // Así, modelos como RTX 4060 o K380 no se confunden con dinero.
  const match = normalized.match(
    /(?:presupuesto(?: de)?|hasta|maximo|menos de|entre|por debajo de)\s*\$?\s*(\d+(?:[.,]\d+)*)\s*(millones?|millon|palos?|k|mil)?|\$\s*(\d+(?:[.,]\d+)*)\s*(millones?|millon|palos?|k|mil)?|\b(\d+(?:[.,]\d+)*)\s*(millones?|millon|palos?|k|mil)\b/i,
  );
  if (!match) return null;
  const raw = match[1] || match[3] || match[5];
  const unit = match[2] || match[4] || match[6] || "";
  let amount = /millon|palo/.test(unit)
    ? Number(raw.replace(",", ".")) * 1_000_000
    : Number(raw.replace(/[.,]/g, ""));
  if (!Number.isFinite(amount) || amount < 10) return null;
  if (unit === "k" || unit === "mil") amount *= 1_000;
  return amount;
}

function rankProducts(products: CatalogProduct[], query: string) {
  return products
    .map((product) => ({ product, score: scoreProduct(product, query) }))
    .filter(({ score }) => score >= 18)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
}

function buildWhatsAppUrl(history: ChatMessage[], products: CatalogProduct[]): string {
  const summary = history
    .slice(-10)
    .map((item) => `${item.role === "user" ? "Cliente" : "Ali"}: ${item.content.slice(0, 240)}`)
    .join("\n\n");
  const productLines = products
    .slice(0, 3)
    .map((product) => `- ${product.name}: ${SITE_URL}/producto/${product.slug}`)
    .join("\n");
  const body = [
    "Hola, vengo del chat con Ali y quiero continuar con un asesor de All For All.",
    "Resumen de mi solicitud:",
    summary,
    productLines
      ? `Opciones revisadas:\n${productLines}`
      : "Ali no encontró una coincidencia exacta en el catálogo.",
  ].join("\n\n");
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(body)}`;
}

const SYSTEM_PROMPT = `Eres Ali, la asesora de ventas con IA de All For All, una tienda colombiana de tecnología. Tu trabajo no es conversar por conversar: entiendes la necesidad, recomiendas productos reales y ayudas a avanzar hacia la compra.

FORMA DE VENDER
- Habla como una asesora experta, natural, cercana y directa. Español de Colombia, sin lenguaje robótico.
- Responde en máximo dos párrafos cortos. No empieces con “excelente pregunta”, “claro que sí” ni otras frases de relleno.
- Haz como máximo UNA pregunta por turno y pide un solo dato que realmente cambie la recomendación.
- Si ya hay información suficiente, recomienda de una vez; no conviertas la conversación en un interrogatorio.
- Para una necesidad amplia, prioriza este orden: uso principal, presupuesto y preferencia crítica. No repitas datos ya dados.
- Compara máximo tres opciones con diferencias concretas: económica, equilibrada y superior, solo cuando existan opciones reales.
- Precio, stock, marca, modelo y especificaciones solo pueden salir del contexto. Nunca inventes.

CATÁLOGO Y RECOMENDACIONES
- Recibirás PRODUCTOS ENCONTRADOS, ordenados por relevancia. Usa únicamente esos productos.
- Cuando recomiendes productos, termina con [PRODUCT_SUGGESTIONS:id1,id2] usando IDs exactos. Máximo tres.
- Explica en una frase por qué cada opción encaja. No listes especificaciones que no ayudan a decidir.
- Si PRODUCTOS ENCONTRADOS está vacío, dilo con naturalidad. No afirmes que All For All no vende esa categoría; solo que no encontraste una coincidencia publicada.
- Si falta un dato esencial para buscar mejor, pregunta solo ese dato. Si la referencia es específica o el usuario ya explicó suficientemente la necesidad, ofrece pasar el requerimiento a WhatsApp y agrega [ESCALATE_WHATSAPP].
- Si el usuario pide una persona, asesor o WhatsApp, deja de preguntar y agrega [ESCALATE_WHATSAPP].
- También recibirás CONOCIMIENTO DE ASESORÍA. Puedes usarlo para explicar y comparar referencias, pero no prueba que All For All venda esas referencias.

CIERRE
- Cuando haya una opción clara, invita a abrir la ficha o pregunta cuál de las opciones prefiere.
- No presiones ni prometas disponibilidad futura. Ali es una IA y una persona puede confirmar casos especiales.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as ChatRequest;
    const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
    const message =
      typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (item): item is ChatMessage =>
              !!item &&
              (item.role === "user" || item.role === "assistant") &&
              typeof item.content === "string",
          )
          .slice(-MAX_HISTORY)
          .map((item) => ({ role: item.role, content: item.content.slice(0, MAX_MESSAGE_LENGTH) }))
      : [];

    if (!sessionId || !message) {
      return new Response(JSON.stringify({ error: "session_id y message son obligatorios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: products, error: catalogError } = await supabase
      .from("products")
      .select(
        "id, name, slug, sku, brand, price, sale_price, short_description, description, images, stock, specs, categories(name, slug), brands(name, slug)",
      )
      .eq("active", true)
      .limit(1200);
    if (catalogError) throw catalogError;

    // La búsqueda usa el mensaje actual más los últimos requisitos del cliente.
    const recentUserNeeds = history
      .filter((item) => item.role === "user")
      .slice(-3)
      .map((item) => item.content)
      .join(" ");
    const searchQuery = `${recentUserNeeds} ${message}`.trim();
    const ranked = rankProducts((products || []) as CatalogProduct[], searchQuery);
    const candidates = ranked.map(({ product }) => product);
    const advisoryContext = LOGITECH_ADVISORY_RE.test(normalize(searchQuery))
      ? `\n\nCONOCIMIENTO DE ASESORÍA LOGITECH (NO ES INVENTARIO):\n${LOGITECH_ADVISORY_KNOWLEDGE}`
      : "";

    const catalogContext = ranked
      .map(({ product, score }) => {
        const price = Number(product.sale_price || product.price || 0).toLocaleString("es-CO");
        const specs = JSON.stringify(product.specs ?? {}).slice(0, 600);
        return [
          `ID:${product.id}`,
          `relevancia:${score}`,
          `nombre:${product.name}`,
          `SKU:${product.sku || "N/D"}`,
          `marca:${product.brand || product.brands?.name || "N/D"}`,
          `categoría:${product.categories?.name || "N/D"}`,
          `precio:${price} COP`,
          `stock:${product.stock ?? "consultar"}`,
          `descripción:${product.short_description || product.description || "Sin descripción"}`,
          `especificaciones:${specs}`,
          `url:/producto/${product.slug}`,
        ].join(" | ");
      })
      .join("\n");

    const fullHistory = [...history, { role: "user" as const, content: message }];
    if (HUMAN_REQUEST_RE.test(message)) {
      const reply =
        "Te conecto con un asesor para que continúe desde aquí con todo el contexto de la conversación.";
      return new Response(
        JSON.stringify({
          reply,
          suggested_products: [],
          escalate: true,
          whatsapp_url: buildWhatsAppUrl(
            [...fullHistory, { role: "assistant", content: reply }],
            [],
          ),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY no configurada");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "system",
            content: `DATOS COMERCIALES:\nSitio: ${SITE_URL}\nEnvíos: Colombia\nMedios de pago publicados: tarjetas, PSE, transferencia, Bancolombia, Openpay y Addi.${advisoryContext}\n\nPRODUCTOS ENCONTRADOS EN ALL FOR ALL (${candidates.length}):\n${catalogContext || "No hubo coincidencias confiables para esta búsqueda."}`,
          },
          ...history,
          { role: "user", content: message },
        ],
        max_tokens: 650,
        temperature: 0.25,
      }),
    });

    if (!aiResponse.ok) {
      const detail = await aiResponse.text();
      console.error("AI gateway error", aiResponse.status, detail);
      throw new Error(`AI gateway: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let reply = String(aiData?.choices?.[0]?.message?.content || "").trim();
    const suggestionMatch = reply.match(/\[PRODUCT_SUGGESTIONS:\s*([^\]]+)\]/i);
    const escalate = /\[ESCALATE_WHATSAPP\]/i.test(reply);
    const allowedIds = new Set(candidates.map((product) => product.id));
    const requestedIds = suggestionMatch
      ? suggestionMatch[1]
          .split(",")
          .map((id: string) => id.trim())
          .filter((id: string) => allowedIds.has(id))
          .slice(0, 3)
      : [];
    reply = reply
      .replace(/\[PRODUCT_SUGGESTIONS:[^\]]+\]/gi, "")
      .replace(/\[ESCALATE_WHATSAPP\]/gi, "")
      .trim();

    const suggestedProducts = requestedIds
      .map((id: string) => candidates.find((product) => product.id === id))
      .filter(Boolean);
    const conversation = [...fullHistory, { role: "assistant" as const, content: reply }];

    const { error: saveError } = await supabase.from("ai_conversations").upsert(
      {
        session_id: sessionId,
        messages: conversation,
        escalated: escalate,
        escalated_at: escalate ? new Date().toISOString() : null,
        suggested_products: requestedIds.length ? requestedIds : undefined,
      },
      { onConflict: "session_id" },
    );
    if (saveError) console.error("Could not save AI conversation", saveError);

    return new Response(
      JSON.stringify({
        reply: reply || "No pude completar la respuesta. Puedo pasar tu solicitud a un asesor.",
        suggested_products: suggestedProducts,
        escalate,
        whatsapp_url: escalate
          ? buildWhatsAppUrl(conversation, suggestedProducts as CatalogProduct[])
          : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("sales-chat error", error);
    return new Response(JSON.stringify({ error: "Ali no pudo responder en este momento." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
