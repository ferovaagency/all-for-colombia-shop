/**
 * Prepara las fotos oficiales de Logitech para el microsite.
 *
 * De cada variante de color toma la foto principal (producto sobre fondo
 * blanco), la reduce a 900px y la convierte a WebP, y calcula el color
 * dominante del producto para pintar el selector de color.
 *
 * Uso:  node scripts/build-logitech-assets.mjs "C:/ruta/a/Downloads"
 *
 * Salida:
 *   public/logitech/<producto>/<variante>.webp
 *   src/lib/logitech-variants.ts
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DOWNLOADS = process.argv[2] || "C:/Users/mafe/Downloads";
const OUT_IMG = "public/logitech";
const OUT_JSON = "src/lib/logitech-variants.ts";

/** Productos del pack, con el nombre comercial y la serie a la que pertenecen. */
const PRODUCTS = [
  {
    key: "k380",
    hero: "1.jpg",
    name: "Logitech K380",
    subtitle: "Teclado Bluetooth multidispositivo",
    serie: "lifestyle",
    dir: "K380-20260724T034051Z-1-001/K380",
  },
  {
    key: "m650",
    hero: "1.jpg",
    name: "Logitech Signature M650",
    subtitle: "Mouse silencioso con SmartWheel",
    serie: "esencial",
    dir: "M650-20260724T033940Z-1-001/M650",
  },
  {
    key: "m185",
    hero: "1.jpg",
    name: "Logitech M185",
    subtitle: "Mouse inalámbrico compacto",
    serie: "esencial",
    dir: "M185-20260724T034018Z-1-001/M185",
  },
  {
    key: "m220",
    hero: "1.jpg",
    name: "Logitech M220 Silent",
    subtitle: "Mouse silencioso 90% menos ruido",
    serie: "esencial",
    dir: "M220-20260724T033951Z-1-001/M220",
  },
  {
    key: "m190",
    hero: "1b.jpg",
    name: "Logitech M190",
    subtitle: "Mouse inalámbrico de tamaño completo",
    serie: "esencial",
    dir: "M190-20260724T034027Z-1-001/M190",
  },
  {
    key: "mk220",
    hero: "1.jpg",
    name: "Logitech MK220",
    subtitle: "Combo teclado y mouse inalámbrico",
    serie: "esencial",
    dir: "MK220-20260724T034042Z-1-001/MK220",
  },
];

/** Nombres bonitos para las carpetas de variante. */
const LABELS = {
  GRIS: "Gris",
  WHITE: "Blanco",
  "OFF WHITE": "Blanco hueso",
  BLACK: "Negro",
  BLUE: "Azul",
  RED: "Rojo",
  ROSA: "Rosa",
  ROSE: "Rosa",
  SAND: "Arena",
  LAVENDER: "Lavanda",
  CHARCOAL: "Grafito",
  GRAPHITE: "Grafito",
  "MID GREY": "Gris medio",
};

function prettyLabel(raw) {
  const clean = raw
    .replace(/\/(LARGE|MEDIUM|LEFT|RIGHT)/g, "")
    .replace(/-\s*[KT]\b/gi, "")
    .replace(/GLOSSY/gi, "")
    .replace(/CHAROCAL/gi, "CHARCOAL")
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  if (LABELS[clean]) return LABELS[clean];
  const first = clean.split(" ")[0];
  if (LABELS[first]) return LABELS[first];
  return clean.charAt(0) + clean.slice(1).toLowerCase();
}

/** Recorre hasta las carpetas hoja (las que ya no tienen subcarpetas). */
function leafDirs(dir, rel = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const subs = entries.filter((e) => e.isDirectory());
  if (subs.length === 0) return [rel];
  return subs.flatMap((s) => leafDirs(path.join(dir, s.name), rel ? `${rel}/${s.name}` : s.name));
}

/**
 * Proporción de píxeles de fondo blanco. Sirve para distinguir la foto de
 * catálogo (producto recortado sobre blanco) de las lifestyle y las que
 * llevan texto quemado sobre fondos de color.
 */
async function whiteRatio(file) {
  const { data, info } = await sharp(file)
    .resize(40, 40, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let white = 0,
    total = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const R = data[i],
      G = data[i + 1],
      B = data[i + 2];
    if (R > 240 && G > 240 && B > 240) white++;
    total++;
  }
  return total ? white / total : 0;
}

/**
 * Foto principal de cada variante, indicada por producto en `hero`.
 *
 * Se eligió a mano tras revisar los packs: la detección automática no es
 * fiable porque los diagramas de instrucciones también van sobre blanco y
 * puntúan alto. Se valida que tenga fondo blanco y se avisa si no.
 */
async function heroFile(dir, heroName) {
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f));
  const hero = files.find((f) => f.toLowerCase() === heroName.toLowerCase());
  if (!hero) return { file: null, warn: `no existe ${heroName}` };

  const ratio = await whiteRatio(path.join(dir, hero));
  return {
    file: hero,
    warn: ratio < 0.4 ? `${hero} no parece foto sobre blanco (${ratio.toFixed(2)})` : null,
  };
}

/**
 * Color dominante del producto: promedia los píxeles descartando el fondo
 * blanco y las sombras, para que el chip refleje el color real.
 */
async function dominantColor(file) {
  const { data, info } = await sharp(file)
    .resize(48, 48, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const R = data[i],
      G = data[i + 1],
      B = data[i + 2];
    const max = Math.max(R, G, B);
    const min = Math.min(R, G, B);
    if (max > 235 && max - min < 12) continue; // fondo blanco
    if (max < 22) continue; // negro puro de sombras duras
    r += R;
    g += G;
    b += B;
    n++;
  }
  if (n === 0) return "#9ca3af";
  const hex = (v) =>
    Math.round(v / n)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .split("")
    .filter((c) => {
      const code = c.codePointAt(0);
      return !(code >= 0x0300 && code <= 0x036f);
    })
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const manifest = [];
let written = 0;
const skipped = [];

for (const product of PRODUCTS) {
  const root = path.join(DOWNLOADS, product.dir);
  if (!fs.existsSync(root)) {
    skipped.push(`${product.key}: carpeta no encontrada`);
    continue;
  }

  const outDir = path.join(OUT_IMG, product.key);
  fs.mkdirSync(outDir, { recursive: true });

  const variants = [];
  const seen = new Set();

  for (const rel of leafDirs(root)) {
    const dir = rel ? path.join(root, rel) : root;
    const { file: hero, warn } = await heroFile(dir, product.hero);
    if (warn) skipped.push(`${product.key}/${rel || "(raíz)"}: ${warn}`);
    if (!hero) continue;

    const label = rel ? prettyLabel(rel) : "Estándar";
    // Varias rutas (LARGE/MEDIUM, LEFT/RIGHT) son el mismo color: una sola vez.
    if (seen.has(label)) continue;
    seen.add(label);

    const fileSlug = slug(label);
    const outFile = path.join(outDir, `${fileSlug}.webp`);
    const srcPath = path.join(dir, hero);

    await sharp(srcPath)
      .resize(900, 900, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outFile);

    variants.push({
      label,
      slug: fileSlug,
      color: await dominantColor(srcPath),
      image: `/logitech/${product.key}/${fileSlug}.webp`,
    });
    written++;
  }

  if (variants.length === 0) {
    skipped.push(`${product.key}: sin variantes utilizables`);
    continue;
  }

  manifest.push({
    key: product.key,
    name: product.name,
    subtitle: product.subtitle,
    serie: product.serie,
    variants,
  });
}

const header = `// ARCHIVO GENERADO — no editar a mano.
// Se regenera con: node scripts/build-logitech-assets.mjs "<carpeta de packs>"
// Las imágenes viven en public/logitech/.

export type LogitechVariant = {
  /** Nombre del color mostrado al usuario. */
  label: string;
  slug: string;
  /** Color dominante del producto, para el selector. */
  color: string;
  image: string;
};

export type LogitechProduct = {
  key: string;
  name: string;
  subtitle: string;
  serie: string;
  variants: LogitechVariant[];
};

export const LOGITECH_PRODUCTS: LogitechProduct[] = `;

fs.writeFileSync(OUT_JSON, header + JSON.stringify(manifest, null, 2) + ";\n");

const totalKb = manifest
  .flatMap((p) => p.variants)
  .reduce((s, v) => s + fs.statSync(path.join("public", v.image.replace(/^\//, ""))).size, 0);

console.log(`\n${written} imágenes generadas en ${OUT_IMG}`);
console.log(`Peso total: ${(totalKb / 1024 / 1024).toFixed(2)} MB`);
console.log(`Manifiesto: ${OUT_JSON}`);
for (const p of manifest) {
  console.log(
    `  ${p.key.padEnd(18)} ${p.variants.length} colores: ${p.variants.map((v) => v.label).join(", ")}`,
  );
}
if (skipped.length) {
  console.log("\nOmitidos:");
  for (const s of skipped) console.log("  - " + s);
}
