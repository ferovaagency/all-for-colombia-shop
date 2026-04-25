import { cn } from "@/lib/utils";
import logoUrl from "@/assets/logo.png";

export function Logo({
  className,
  variant = "light",
}: {
  className?: string;
  /** "light" para fondos oscuros, "dark" para fondos claros (no afecta al PNG, se mantiene por compatibilidad) */
  variant?: "light" | "dark";
}) {
  return (
    <img
      src={logoUrl}
      alt="All For All"
      className={cn("h-10 w-auto object-contain", className)}
      data-variant={variant}
    />
  );
}
