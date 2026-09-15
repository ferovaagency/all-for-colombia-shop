export type LogitechHeroVideo = {
  id: string;
  enabled: boolean;
  desktopSrc: string;
  mobileSrc?: string;
  poster: string;
  href: string;
  label: string;
};

/**
 * Videos principales del micrositio Logitech.
 * La versión móvil es opcional; estos materiales oficiales son 16:9 y se
 * muestran completos en todos los tamaños de pantalla.
 */
export const LOGITECH_HERO_VIDEOS: LogitechHeroVideo[] = [
  {
    id: "logitech-mk880",
    enabled: true,
    desktopSrc: "/logitech/banners/logitech-mk880-desktop.mp4",
    poster: "/logitech/banners/logitech-mk880-poster.webp",
    // Pendiente: reemplazar la pieza por una de la linea MX / ERGO.
    href: "#catalogo&serie=mx,ergo",
    label: "Descubre las series MX y ERGO de Logitech para trabajo y creatividad",
  },
  {
    id: "logitech-g321",
    enabled: true,
    desktopSrc: "/logitech/banners/logitech-g321-desktop.mp4",
    poster: "/logitech/banners/logitech-g321-poster.webp",
    // Pendiente: reemplazar la pieza por una de la linea PRO / timones.
    href: "#catalogo&serie=gamer-pro,racing",
    label: "Conoce la serie PRO y los timones de simulación Logitech G",
  },
  {
    id: "logitech-gaming-mice",
    enabled: true,
    desktopSrc: "/logitech/banners/logitech-gaming-mice-desktop.mp4",
    poster: "/logitech/banners/logitech-gaming-mice-poster.webp",
    href: "#gaming",
    label: "Descubre la nueva colección Logitech G para gaming",
  },
];
