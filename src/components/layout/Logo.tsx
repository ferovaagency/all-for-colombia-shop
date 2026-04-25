import { cn } from "@/lib/utils";

/**
 * Logo de All For All.
 *
 * Para usar el logo oficial:
 *   1. Sube el archivo a `src/assets/logo.png` (o .svg)
 *   2. Descomenta el import y el <img /> abajo
 *   3. Comenta o elimina el fallback de texto
 */
// import logoUrl from "@/assets/logo.png";

export function Logo({
  className,
  variant = "light",
}: {
  className?: string;
  /** "light" para fondos oscuros (texto blanco), "dark" para fondos claros */
  variant?: "light" | "dark";
}) {
  // Cuando el archivo del logo esté disponible, reemplaza este bloque por:
  // return <img src={logoUrl} alt="All For All" className={cn("h-10 w-auto", className)} />;

  return (
    <span
      className={cn(
        "inline-flex items-baseline font-bold tracking-tight text-xl whitespace-nowrap",
        variant === "light" ? "text-brand-white" : "text-brand-dark",
        className,
      )}
    >
      All
      <span className={cn("mx-1 text-base font-medium", variant === "light" ? "text-brand-gray" : "text-brand-blue")}>
        For
      </span>
      All
    </span>
  );
}
