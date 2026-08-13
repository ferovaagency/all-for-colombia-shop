import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

const SYNONYM_GROUPS = [
  ["chasis", "gabinete", "case", "caja", "torre"],
  ["portatil", "laptop", "notebook", "computador portatil"],
  ["pantalla", "monitor", "display"],
  ["gaming", "gamer", "juegos"],
];

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function tokenize(query) {
  const normalized = normalize(query);
  const expanded = new Set(
    normalized.split(/\s+/).filter((token) => token.length >= 2 && !STOP_WORDS.has(token)),
  );
  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map(normalize);
    if (normalizedGroup.some((term) => normalized.includes(term))) {
      normalizedGroup.forEach((term) => term.split(" ").forEach((token) => expanded.add(token)));
    }
  }
  return [...expanded];
}

function extractBudget(message) {
  const normalized = String(message)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9$.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

assert.deepEqual(
  tokenize("Quiero un chasis para torre gamer xyz").sort(),
  ["caja", "case", "chasis", "gabinete", "gamer", "gaming", "juegos", "torre"].sort(),
);
assert(tokenize("Necesito un portatil para trabajar").includes("laptop"));
assert(tokenize("Busco una pantalla").includes("monitor"));
assert.equal(extractBudget("RTX 4060 para jugar"), null);
assert.equal(extractBudget("teclado Logitech K380"), null);
assert.equal(extractBudget("tengo hasta $2.000.000"), 2_000_000);
assert.equal(extractBudget("mi presupuesto es 2,5 millones"), 2_500_000);
assert.equal(extractBudget("máximo 800 mil"), 800_000);

const knowledge = readFileSync(
  new URL("../supabase/functions/sales-chat/logitech-knowledge.ts", import.meta.url),
  "utf8",
);
assert.match(knowledge, /no representa el inventario/i);
assert.match(knowledge, /Signature M650/);
assert.match(knowledge, /MX Master 3S/);
assert.match(knowledge, /Wave Keys/);
assert.match(knowledge, /MK850 Performance/);

console.log("Sales-chat search and Logitech knowledge tests: 12 passed");
