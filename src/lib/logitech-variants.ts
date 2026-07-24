// ARCHIVO GENERADO — no editar a mano.
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

export const LOGITECH_PRODUCTS: LogitechProduct[] = [
  {
    "key": "k380",
    "name": "Logitech K380",
    "subtitle": "Teclado Bluetooth multidispositivo",
    "serie": "lifestyle",
    "variants": [
      {
        "label": "Gris",
        "slug": "gris",
        "color": "#5f6469",
        "image": "/logitech/k380/gris.webp"
      },
      {
        "label": "Lavanda",
        "slug": "lavanda",
        "color": "#c8bbe0",
        "image": "/logitech/k380/lavanda.webp"
      },
      {
        "label": "Rosa",
        "slug": "rosa",
        "color": "#eccdc8",
        "image": "/logitech/k380/rosa.webp"
      },
      {
        "label": "Arena",
        "slug": "arena",
        "color": "#b7b2ac",
        "image": "/logitech/k380/arena.webp"
      },
      {
        "label": "Blanco",
        "slug": "blanco",
        "color": "#d2d2d2",
        "image": "/logitech/k380/blanco.webp"
      }
    ]
  },
  {
    "key": "m650",
    "name": "Logitech Signature M650",
    "subtitle": "Mouse silencioso con SmartWheel",
    "serie": "esencial",
    "variants": [
      {
        "label": "Grafito",
        "slug": "grafito",
        "color": "#5f5f5f",
        "image": "/logitech/m650/grafito.webp"
      },
      {
        "label": "Blanco hueso",
        "slug": "blanco-hueso",
        "color": "#d3d3d2",
        "image": "/logitech/m650/blanco-hueso.webp"
      },
      {
        "label": "Rosa",
        "slug": "rosa",
        "color": "#decaca",
        "image": "/logitech/m650/rosa.webp"
      }
    ]
  },
  {
    "key": "m185",
    "name": "Logitech M185",
    "subtitle": "Mouse inalámbrico compacto",
    "serie": "esencial",
    "variants": [
      {
        "label": "Negro",
        "slug": "negro",
        "color": "#353536",
        "image": "/logitech/m185/negro.webp"
      },
      {
        "label": "Azul",
        "slug": "azul",
        "color": "#426d76",
        "image": "/logitech/m185/azul.webp"
      },
      {
        "label": "Grafito",
        "slug": "grafito",
        "color": "#53575d",
        "image": "/logitech/m185/grafito.webp"
      },
      {
        "label": "Rojo",
        "slug": "rojo",
        "color": "#893743",
        "image": "/logitech/m185/rojo.webp"
      }
    ]
  },
  {
    "key": "m220",
    "name": "Logitech M220 Silent",
    "subtitle": "Mouse silencioso 90% menos ruido",
    "serie": "esencial",
    "variants": [
      {
        "label": "Negro",
        "slug": "negro",
        "color": "#505256",
        "image": "/logitech/m220/negro.webp"
      },
      {
        "label": "Azul",
        "slug": "azul",
        "color": "#3b5a8d",
        "image": "/logitech/m220/azul.webp"
      },
      {
        "label": "Rojo",
        "slug": "rojo",
        "color": "#9f323b",
        "image": "/logitech/m220/rojo.webp"
      },
      {
        "label": "Rosa",
        "slug": "rosa",
        "color": "#dfc8c7",
        "image": "/logitech/m220/rosa.webp"
      },
      {
        "label": "Blanco",
        "slug": "blanco",
        "color": "#dddddd",
        "image": "/logitech/m220/blanco.webp"
      }
    ]
  },
  {
    "key": "m190",
    "name": "Logitech M190",
    "subtitle": "Mouse inalámbrico de tamaño completo",
    "serie": "esencial",
    "variants": [
      {
        "label": "Azul",
        "slug": "azul",
        "color": "#4e5e77",
        "image": "/logitech/m190/azul.webp"
      },
      {
        "label": "Grafito",
        "slug": "grafito",
        "color": "#585858",
        "image": "/logitech/m190/grafito.webp"
      },
      {
        "label": "Gris medio",
        "slug": "gris-medio",
        "color": "#666666",
        "image": "/logitech/m190/gris-medio.webp"
      },
      {
        "label": "Rojo",
        "slug": "rojo",
        "color": "#76474a",
        "image": "/logitech/m190/rojo.webp"
      }
    ]
  },
  {
    "key": "mk220",
    "name": "Logitech MK220",
    "subtitle": "Combo teclado y mouse inalámbrico",
    "serie": "esencial",
    "variants": [
      {
        "label": "Estándar",
        "slug": "estandar",
        "color": "#535357",
        "image": "/logitech/mk220/estandar.webp"
      }
    ]
  }
];
