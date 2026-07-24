import { useMemo, useRef, useState } from "react";
import { Check, Move3d } from "lucide-react";
import { LOGITECH_PRODUCTS, type LogitechProduct } from "@/lib/logitech-variants";
import { cn } from "@/lib/utils";

const SPACE = { fontFamily: "'Space Grotesk', 'Inter', sans-serif" };

/**
 * Visor interactivo de las líneas Logitech.
 *
 * Las fotos del fabricante son tomas fijas de catálogo, no secuencias de giro,
 * así que no hay un 360° real. Lo que sí aportan es el producto en todos sus
 * colores: el visor deja cambiar de color al instante y añade una inclinación
 * en perspectiva que sigue al puntero para dar sensación de volumen.
 */
export function LogitechColorViewer({ className }: { className?: string }) {
  // Sin al menos dos colores no hay nada que elegir.
  const products = useMemo(() => LOGITECH_PRODUCTS.filter((p) => p.variants.length > 1), []);

  const [productKey, setProductKey] = useState(products[0]?.key ?? "");
  const product = products.find((p) => p.key === productKey) ?? products[0];
  const [variantSlug, setVariantSlug] = useState(product?.variants[0]?.slug ?? "");

  if (!product) return null;

  const variant = product.variants.find((v) => v.slug === variantSlug) ?? product.variants[0];

  const selectProduct = (p: LogitechProduct) => {
    setProductKey(p.key);
    setVariantSlug(p.variants[0].slug);
  };

  return (
    <section className={cn("bg-white", className)}>
      <div className="container mx-auto px-6 lg:px-10 py-12 md:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-neutral-500">
            Explora en detalle
          </span>
          <h2
            style={SPACE}
            className="mt-2 text-3xl md:text-5xl font-bold tracking-[-0.03em] text-neutral-950"
          >
            Elige tu color
          </h2>
          <p className="mt-3 text-neutral-600">
            Cada Logitech viene en varios acabados. Cámbialos aquí y mueve el ratón sobre la imagen
            para verlo desde otro ángulo.
          </p>
        </div>

        {/* Selector de producto */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-1 overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {products.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => selectProduct(p)}
                className={cn(
                  "shrink-0 px-4 md:px-5 py-2 text-sm md:text-base whitespace-nowrap border-b-2 transition-colors",
                  p.key === product.key
                    ? "border-neutral-950 text-neutral-950 font-bold"
                    : "border-transparent text-neutral-500 hover:text-neutral-900",
                )}
              >
                {p.name.replace("Logitech ", "")}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1.25fr_1fr] gap-8 lg:gap-12 items-center">
          <TiltStage
            key={product.key}
            src={variant.image}
            alt={`${product.name} — ${variant.label}`}
          />

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
              Serie {product.serie}
            </p>
            <h3
              style={SPACE}
              className="mt-2 text-3xl md:text-4xl font-bold tracking-[-0.03em] text-neutral-950"
            >
              {product.name}
            </h3>
            <p className="mt-2 text-neutral-600">{product.subtitle}</p>

            <div className="mt-8">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm font-bold text-neutral-950">Color</p>
                <p className="text-sm text-neutral-500">{variant.label}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2.5">
                {product.variants.map((v) => {
                  const active = v.slug === variant.slug;
                  return (
                    <button
                      key={v.slug}
                      type="button"
                      onClick={() => setVariantSlug(v.slug)}
                      aria-label={v.label}
                      aria-pressed={active}
                      title={v.label}
                      className={cn(
                        "relative h-10 w-10 rounded-full border transition-all",
                        active
                          ? "border-neutral-950 scale-110 shadow-md"
                          : "border-neutral-200 hover:border-neutral-400 hover:scale-105",
                      )}
                      style={{ backgroundColor: v.color }}
                    >
                      {active && (
                        <Check
                          className="absolute inset-0 m-auto h-4 w-4 drop-shadow"
                          style={{ color: contrastOn(v.color) }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-xs text-neutral-500">
                {product.variants.length} colores disponibles. La disponibilidad puede variar según
                inventario.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Escena con inclinación en perspectiva que sigue al puntero.
 *
 * Usa CSS en vez de framer-motion a propósito: son un fundido y una rotación
 * muy simples, y así el visor no carga la librería de animación ni depende de
 * su ciclo de hidratación.
 */
function TiltStage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -ny * 10, y: nx * 14 });
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className="relative rounded-3xl bg-[#f5f5f7] overflow-hidden aspect-[4/3] select-none"
      style={{ perspective: "1000px" }}
    >
      <div
        className="absolute inset-0 transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* El fundido se dispara al remontar la imagen (cambia `key`).
            Se hace con una animación CSS y no con onLoad porque ese evento no
            llega a dispararse cuando la foto ya está en caché del navegador. */}
        <img
          key={src}
          src={src}
          alt={alt}
          draggable={false}
          style={{ animation: "logi-fade 0.35s ease-out both" }}
          className="absolute inset-0 h-full w-full object-contain p-8 md:p-12"
        />
      </div>

      <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur px-3 py-1.5 text-[11px] font-medium text-neutral-600 shadow-sm">
        <Move3d className="h-3.5 w-3.5" />
        Mueve el cursor para inclinar
      </span>
    </div>
  );
}

/** Blanco o negro según el brillo del color, para que el check se vea siempre. */
function contrastOn(hex: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 150 ? "#111" : "#fff";
}
