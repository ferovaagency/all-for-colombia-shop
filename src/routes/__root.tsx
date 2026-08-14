import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import appCss from "../styles.css?url";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { Toaster } from "@/components/ui/sonner";
import { Canonical } from "@/components/seo/Canonical";
import { COOKIE_PREFS_KEY, LEGAL_VERSIONS } from "@/lib/legal-versions";

const AIAssistant = lazy(() =>
  import("@/components/chat/AIAssistant").then((module) => ({ default: module.AIAssistant })),
);
const SocialProofPopup = lazy(() =>
  import("@/components/layout/SocialProofPopup").then((module) => ({
    default: module.SocialProofPopup,
  })),
);
const DiscountWheel = lazy(() =>
  import("@/components/DiscountWheel").then((module) => ({ default: module.DiscountWheel })),
);

/**
 * Google Consent Mode v2 en estado denegado por defecto.
 *
 * Se inyecta como primer script del documento: GTM y gtag.js se cargan después,
 * de modo que ninguna etiqueta puede escribir cookies de analítica o publicidad
 * hasta que el visitante lo autorice. Si ya había decidido en una visita previa
 * (y la Política de Cookies sigue en la misma versión) restauramos su elección
 * de inmediato para no perder mediciones que sí autorizó.
 */
const CONSENT_MODE_BOOTSTRAP = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  analytics_storage:'denied',
  personalization_storage:'denied',
  functionality_storage:'granted',
  security_storage:'granted',
  wait_for_update: 500
});
try {
  var raw = localStorage.getItem(${JSON.stringify(COOKIE_PREFS_KEY)});
  if (raw) {
    var p = JSON.parse(raw);
    if (p && p.version === ${JSON.stringify(LEGAL_VERSIONS.cookies)}) {
      var g = function(v){ return v ? 'granted' : 'denied'; };
      gtag('consent','update',{
        ad_storage: g(p.marketing),
        ad_user_data: g(p.marketing),
        ad_personalization: g(p.marketing),
        analytics_storage: g(p.analytics),
        personalization_storage: g(p.functional)
      });
    }
  }
} catch (e) {}
`.trim();

const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "All For All",
  description:
    "Tienda online de tecnología, hogar, equipos corporativos, aires acondicionados y plóters en Colombia.",
  url: "https://allforall.com.co",
  telephone: "+57-300-000-0000",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
  ],
  areaServed: "CO",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bogotá",
    addressCountry: "CO",
  },
};

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe o ha sido movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "All For All — Todo lo que necesitas, para todos" },
      {
        name: "description",
        content:
          "Tienda online de tecnología, hogar, equipos corporativos, aires acondicionados y plóters en Colombia. Envíos a todo el país.",
      },
      { name: "author", content: "All For All" },
      { name: "theme-color", content: "#0a1f44" },
      {
        name: "robots",
        content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
      },
      { name: "googlebot", content: "index, follow" },
      { property: "og:title", content: "All For All — Todo lo que necesitas, para todos" },
      {
        property: "og:description",
        content:
          "Tienda online en Colombia: tecnología, hogar, equipos corporativos, aires acondicionados y plóters. Envíos a todo el país.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "All For All" },
      { property: "og:locale", content: "es_CO" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "All For All — Todo lo que necesitas, para todos" },
      {
        name: "twitter:description",
        content:
          "Tienda online en Colombia: tecnología, hogar, equipos corporativos, aires acondicionados y plóters. Envíos a todo el país.",
      },
      { property: "og:image", content: "https://allforall.com.co/og-image.jpg" },
      { name: "twitter:image", content: "https://allforall.com.co/og-image.jpg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
    scripts: [
      // 1) Consent Mode v2 — TODO denegado por defecto. Debe ejecutarse ANTES
      //    de GTM/gtag para que ninguna etiqueta escriba cookies sin permiso.
      //    Si el visitante ya decidió antes, restauramos su elección aquí mismo
      //    para no perder mediciones autorizadas durante la carga.
      {
        children: CONSENT_MODE_BOOTSTRAP,
      },
      {
        children: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-K6D544TK');`,
      },
      {
        async: true,
        src: "https://www.googletagmanager.com/gtag/js?id=G-9TM1T01X40",
      },
      {
        children: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-9TM1T01X40');`,
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(ORG_SCHEMA),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <head>
        <HeadContent />
      </head>
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-K6D544TK"
            height={0}
            width={0}
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const location = useLocation();
  const [loadEngagementTools, setLoadEngagementTools] = useState(false);
  const hiddenRoutes = ["/checkout", "/admin", "/distribuidores/portal"];
  const showChat = !hiddenRoutes.some((r) => location.pathname.startsWith(r));

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const id = win.requestIdleCallback
      ? win.requestIdleCallback(() => setLoadEngagementTools(true), { timeout: 2500 })
      : window.setTimeout(() => setLoadEngagementTools(true), 1500);
    return () => {
      if (win.cancelIdleCallback) win.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);

  return (
    <>
      <ScrollToTop />
      <Canonical />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      <WhatsAppButton />
      {loadEngagementTools && (
        <Suspense fallback={null}>
          {showChat && <AIAssistant />}
          <SocialProofPopup />
          <DiscountWheel />
        </Suspense>
      )}
      <CookieBanner />
      <Toaster richColors position="top-right" />
    </>
  );
}
