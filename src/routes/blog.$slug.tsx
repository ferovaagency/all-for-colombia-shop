import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Blog {
  id: number; slug: string; h1: string;
  keyword_principal: string; industria: string;
  frase_inicial: string; resumen_intro: string;
  contenido_html: string; cierre_html: string;
  meta_title: string; meta_description: string;
  imagen_portada: string | null; imagen_alt: string | null;
  autor: string; fecha_publicacion: string | null;
}

function BlogPost() {
  const { slug } = Route.useParams();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (supabase.from('blogs' as any) as any)
      .select('*').eq('slug', slug).eq('publicado', true).maybeSingle()
      .then(({ data }: any) => {
        const b = data as Blog | null;
        setBlog(b);
        setLoading(false);
        if (b) {
          document.title = b.meta_title || b.h1;
          const setMeta = (selector: string, attr: string, key: string, content: string) => {
            let el = document.querySelector(selector) as HTMLMetaElement | null;
            if (!el) {
              el = document.createElement('meta');
              el.setAttribute(attr, key);
              document.head.appendChild(el);
            }
            el.setAttribute('content', content);
          };
          const desc = b.meta_description || b.resumen_intro;
          const img = b.imagen_portada || 'https://allforall.com.co/og-image.jpg';
          setMeta('meta[name="description"]', 'name', 'description', desc);
          setMeta('meta[property="og:title"]', 'property', 'og:title', b.meta_title || b.h1);
          setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
          setMeta('meta[property="og:type"]', 'property', 'og:type', 'article');
          setMeta('meta[property="og:image"]', 'property', 'og:image', img);
          setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', b.meta_title || b.h1);
          setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc);
          setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', img);
        }
      });
  }, [slug]);

  if (loading) return <div className="container mx-auto px-4 py-20"><div className="animate-pulse h-96 bg-muted rounded" /></div>;
  if (!blog) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">Artículo no encontrado</h1>
      <Link to="/blog" className="text-primary underline">Ver todos los artículos</Link>
    </div>
  );

  return (
    <main className="container mx-auto px-4 py-10 max-w-3xl">
      <Link to="/blog" className="text-sm text-muted-foreground hover:text-primary">← Blog</Link>

      {blog.imagen_portada && (
        <div className="aspect-video rounded-lg overflow-hidden my-6">
          <img src={blog.imagen_portada} alt={blog.imagen_alt || blog.h1}
            className="w-full h-full object-cover" />
        </div>
      )}

      <article className="prose prose-lg max-w-none">
        <h1>{blog.h1}</h1>
        <p className="text-xl font-semibold leading-relaxed">{blog.frase_inicial}</p>
        <p className="text-lg leading-relaxed">{blog.resumen_intro}</p>
        <div dangerouslySetInnerHTML={{ __html: blog.contenido_html }} />
        <hr className="my-8" />
        <div dangerouslySetInnerHTML={{ __html: blog.cierre_html }} />
      </article>

      <footer className="mt-12 pt-6 border-t text-sm text-muted-foreground">
        Por {blog.autor}
        {blog.fecha_publicacion && ` · ${new Date(blog.fecha_publicacion).toLocaleDateString('es-CO')}`}
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: blog.h1,
          author: { '@type': 'Organization', name: blog.autor },
          datePublished: blog.fecha_publicacion,
          image: blog.imagen_portada,
          publisher: { '@type': 'Organization', name: 'All For All' },
          description: blog.meta_description,
          keywords: blog.keyword_principal,
        }),
      }} />
    </main>
  );
}

export const Route = createFileRoute('/blog/$slug')({ component: BlogPost });
