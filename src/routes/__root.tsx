import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { AIAssistant } from "@/components/chat/AIAssistant";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { SocialProofPopup } from "@/components/layout/SocialProofPopup";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { DiscountWheel } from "@/components/DiscountWheel";
import { Toaster } from "@/components/ui/sonner";
import { Canonical } from "@/components/seo/Canonical";

const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "All For All",
  description:
    "Tienda online de tecnología, hogar, equipos corporativos, aires acondicionados y plóters en Colombia.",
  url: "https://allforall.com.co",
  telephone: "+57-300-000-0000",
  openingHoursSpecification: [{
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    opens: "08:00", closes: "18:00",
  }],
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
      { name: "robots", content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" },
      { name: "googlebot", content: "index, follow" },
      { property: "og:title", content: "All For All — Todo lo que necesitas, para todos" },
      { property: "og:description", content: "All For All is a comprehensive e-commerce web application for the Colombian market." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "es_CO" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "All For All — Todo lo que necesitas, para todos" },
      { name: "description", content: "All For All is a comprehensive e-commerce web application for the Colombian market." },
      { name: "twitter:description", content: "All For All is a comprehensive e-commerce web application for the Colombian market." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/40b31ddf-e583-4d47-9691-a4c98f953c5b/id-preview-07701f58--4229143a-4a79-4a73-a896-8046d45a1a6f.lovable.app-1777930017487.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/40b31ddf-e583-4d47-9691-a4c98f953c5b/id-preview-07701f58--4229143a-4a79-4a73-a896-8046d45a1a6f.lovable.app-1777930017487.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
    scripts: [
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
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const location = useLocation();
  const hiddenRoutes = ['/checkout', '/admin', '/distribuidores/portal'];
  const showChat = !hiddenRoutes.some((r) => location.pathname.startsWith(r));

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
      {showChat && <AIAssistant />}
      <SocialProofPopup />
      <DiscountWheel />
      <CookieBanner />
      <Toaster richColors position="top-right" />
    </>
  );
}
