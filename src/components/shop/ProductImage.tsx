import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const FALLBACK_IMAGE = "/placeholder.svg";

type ProductImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
};

/** Mantiene fotografías de catálogo completas y con una escala visual consistente. */
export function ProductImage({ src, alt = "", className, onError, ...props }: ProductImageProps) {
  return (
    <img
      src={src || FALLBACK_IMAGE}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("h-full w-full object-contain p-3 md:p-4", className)}
      onError={(event) => {
        onError?.(event);
        const image = event.currentTarget;
        if (!image.src.endsWith(FALLBACK_IMAGE)) image.src = FALLBACK_IMAGE;
      }}
      {...props}
    />
  );
}
