import { createFileRoute, Link } from "@tanstack/react-router";
import { canonicalUrl, withCanonical } from "@/lib/seo";
import { ArrowUpRight, FileText, ShieldCheck } from "lucide-react";
import { LEGAL_CONTACT, LEGAL_DOCS, formatEffectiveDate } from "@/lib/legal";
import { Button } from "@/components/ui/button";
import { openCookiePreferences } from "@/lib/consent";

export const Route = createFileRoute("/legal/")({
  head: () => withCanonical(canonicalUrl("/legal"), {
    meta: [
      { title: "Centro Legal — All For All" },
      {
        name: "description",
        content:
          "Términos y Condiciones, Política de Privacidad, Cookies, Inteligencia Artificial, Envíos, Garantías y Retracto de All For All S.A.S.",
      },
      { property: "og:title", content: "Centro Legal — All For All" },
      {
        property: "og:description",
        content:
          "Consulta términos, privacidad, cookies, envíos, garantías y política de retracto de All For All S.A.S.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LegalIndex,
});

function LegalIndex() {
  return (
    <div className="bg-background">
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-14 md:py-20 max-w-4xl">
          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-primary-foreground/60">
            <ShieldCheck className="h-3.5 w-3.5" /> Centro Legal
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">
            Nuestras políticas, en claro
          </h1>
          <p className="mt-4 text-primary-foreground/75 max-w-2xl leading-relaxed">
            Aquí encuentras todos los documentos que regulan tu relación con {LEGAL_CONTACT.company}
            . Son de consulta libre: no necesitas iniciar sesión ni registrarte.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="grid gap-3 sm:grid-cols-2">
          {LEGAL_DOCS.map((doc) => (
            <Link
              key={doc.slug}
              to="/legal/$slug"
              params={{ slug: doc.slug }}
              className="group bg-card border rounded-2xl p-5 hover:border-secondary hover:shadow-card transition-all flex flex-col"
            >
              <div className="flex items-start justify-between gap-3">
                <FileText className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-secondary group-hover:rotate-45 transition-all" />
              </div>
              <h2 className="font-bold text-base mt-3 group-hover:text-secondary transition-colors">
                {doc.shortTitle}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-snug flex-1">
                {doc.description}
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-3">
                Versión {doc.version} · Vigente desde {formatEffectiveDate(doc.effectiveDate)}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <div className="bg-card border rounded-2xl p-5">
            <h3 className="font-bold mb-1.5">Preferencias de cookies</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Puedes cambiar en cualquier momento qué cookies analíticas, de marketing o de
              personalización autorizas.
            </p>
            <Button variant="outline" onClick={() => openCookiePreferences()}>
              Configurar cookies
            </Button>
          </div>

          <div className="bg-card border rounded-2xl p-5">
            <h3 className="font-bold mb-1.5">Ejerce tus derechos (PQRS)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Acceso, actualización, rectificación, supresión o revocatoria de tus datos personales
              conforme a la Ley 1581 de 2012.
            </p>
            <Button asChild variant="outline">
              <Link to="/pqrs">Radicar solicitud</Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border bg-muted/30 p-5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">{LEGAL_CONTACT.company}</p>
          <p>
            NIT {LEGAL_CONTACT.nit} · {LEGAL_CONTACT.city}
          </p>
          <p className="mt-1">
            Correo para asuntos legales y de privacidad:{" "}
            <a href={`mailto:${LEGAL_CONTACT.email}`} className="text-secondary underline">
              {LEGAL_CONTACT.email}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
