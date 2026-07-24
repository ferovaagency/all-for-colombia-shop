import { Fragment, type ReactNode } from "react";

/**
 * Renderizador mínimo de Markdown para los documentos legales.
 *
 * Sólo soporta lo que usan esos documentos: encabezados, negrita, enlaces,
 * listas con viñeta y numeradas, separadores y citas. No ejecuta HTML crudo,
 * así que el contenido no puede inyectar marcado en la página.
 */

type Block =
  | { type: "h"; level: number; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "hr" };

function parse(md: string): Block[] {
  const lines = md.split(/\r?\n/);
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "p", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    if (/^-{3,}$/.test(line) || /^_{3,}$/.test(line)) {
      flushParagraph();
      blocks.push({ type: "hr" });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ type: "h", level: heading[1].length, text: heading[2].trim() });
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      blocks.push({ type: "quote", text: line.replace(/^>\s?/, "") });
      continue;
    }

    // Lista con viñeta: "* texto" o "- texto"
    if (/^[*-]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^[*-]\s+/.test(lines[i].trim())) {
        items.push(
          lines[i]
            .trim()
            .replace(/^[*-]\s+/, "")
            .replace(/;$/, ""),
        );
        i++;
      }
      i--;
      blocks.push({ type: "ul", items });
      continue;
    }

    // Lista numerada: "1. texto"
    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      i--;
      blocks.push({ type: "ol", items });
      continue;
    }

    paragraph.push(line);
  }
  flushParagraph();

  return blocks;
}

/** Convierte negritas y enlaces en nodos React. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // [texto](url) y **texto**
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${n++}`;

    if (m[1] !== undefined) {
      const label = m[1].replace(/\*\*/g, "");
      const href = m[2];
      nodes.push(
        <a
          key={key}
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
          className="text-secondary underline underline-offset-2 hover:text-secondary/80 break-words"
        >
          {label}
        </a>,
      );
    } else {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {m[3]}
        </strong>,
      );
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function LegalMarkdown({ content }: { content: string }) {
  const blocks = parse(content);

  return (
    <div className="text-muted-foreground leading-relaxed">
      {blocks.map((b, i) => {
        const key = `b${i}`;
        switch (b.type) {
          case "h": {
            if (b.level <= 2)
              return (
                <h2
                  key={key}
                  id={slugify(b.text)}
                  className="scroll-mt-28 text-xl md:text-2xl font-bold text-foreground mt-10 mb-3 first:mt-0"
                >
                  {inline(b.text, key)}
                </h2>
              );
            return (
              <h3
                key={key}
                id={slugify(b.text)}
                className="scroll-mt-28 text-base md:text-lg font-bold text-foreground mt-6 mb-2"
              >
                {inline(b.text, key)}
              </h3>
            );
          }
          case "p":
            return (
              <p key={key} className="mb-3">
                {inline(b.text, key)}
              </p>
            );
          case "ul":
            return (
              <ul key={key} className="list-disc pl-6 space-y-1 mb-4">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="list-decimal pl-6 space-y-1 mb-4">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `${key}-${j}`)}</li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote
                key={key}
                className="border-l-4 border-secondary/40 bg-muted/40 pl-4 py-2 my-4 italic"
              >
                {inline(b.text, key)}
              </blockquote>
            );
          case "hr":
            return <hr key={key} className="my-6 border-border/60" />;
          default:
            return <Fragment key={key} />;
        }
      })}
    </div>
  );
}

/** Índice de secciones (H1/H2) para la navegación lateral del documento. */
export function extractHeadings(content: string) {
  return parse(content)
    .filter((b): b is Extract<Block, { type: "h" }> => b.type === "h")
    .filter((h) => h.level <= 2)
    .map((h) => ({ id: slugify(h.text), text: stripMarkup(h.text) }));
}

function stripMarkup(s: string) {
  return s
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function slugify(s: string) {
  let out = "";
  for (const ch of stripMarkup(s).normalize("NFD")) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x0300 && code <= 0x036f) continue;
    out += ch;
  }
  return out
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}
