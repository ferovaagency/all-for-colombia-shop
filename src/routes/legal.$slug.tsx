import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LegalMarkdown, extractHeadings } from "@/components/legal/LegalMarkdown";
import { LEGAL_CONTACT, LEGAL_DOCS, formatEffectiveDate, getLegalDoc } from "@/lib/legal";

export const Route = createFileRoute("/legal/$slug")({
  loader: ({ params }) => {
    const doc = getLegalDoc(params.slug);
    if (!doc) throw notFound();
    return { slug: doc.slug };
  },
  head: ({ params }) => {
    const doc = getLegalDoc(params.slug);
    if (!doc) return {};
    return {
      meta: [
        { title: `${doc.title} — All For All` },
        { name: "description", content: doc.description },
        { property: "og:title", content: `${doc.title} — All For All` },
        { property: "og:description", content: doc.description },
        { property: "og:type", content: "article" },
        { name: "robots", content: "index, follow" },
      ],
    };
  },
  component: LegalDocPage,
});

function LegalDocPage() {
  const { slug } = Route.useLoaderData();
  const doc = getLegalDoc(slug)!;
  const headings = extractHeadings(doc.body);

  return (
    <div className="bg-background">
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-10 md:py-14 max-w-5xl">
          <Link
            to="/legal"
            className="inline-flex items-center gap-1.5 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors mb-5"
          >
            <ArrowLeft className="h-4 w-4" /> Centro Legal
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">{doc.title}</h1>
          <p className="mt-3 text-sm text-primary-foreground/70">
            {LEGAL_CONTACT.company} · NIT {LEGAL_CONTACT.nit}
          </p>
          <p className="text-sm text-primary-foreground/70">
            Versión {doc.version} · Vigente desde {formatEffectiveDate(doc.effectiveDate)}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 max-w-5xl grid lg:grid-cols-[220px_1fr] gap-10">
        {/* Índice del documento */}
        <aside className="hidden lg:block">
          <nav className="sticky top-28 max-h-[70vh] overflow-y-auto pr-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-3">
              Contenido
            </p>
            <ul className="space-y-1.5 border-l">
              {headings.map((h) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className="block text-xs text-muted-foreground hover:text-secondary border-l-2 border-transparent hover:border-secondary -ml-px pl-3 py-0.5 transition-colors"
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0">
          <LegalMarkdown content={doc.body} />

          <div className="mt-12 pt-6 border-t">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground mb-3">
              Otros documentos
            </p>
            <div className="flex flex-wrap gap-2">
              {LEGAL_DOCS.filter((d) => d.slug !== doc.slug).map((d) => (
                <Link
                  key={d.slug}
                  to="/legal/$slug"
                  params={{ slug: d.slug }}
                  className="text-xs px-3 py-1.5 rounded-full border hover:border-secondary hover:text-secondary transition-colors"
                >
                  {d.shortTitle}
                </Link>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
