import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Blog {
  id: number; slug: string; h1: string; resumen_intro: string;
  imagen_portada: string | null; imagen_alt: string | null;
  industria: string; fecha_publicacion: string | null; autor: string;
}

const FALLBACK = '/placeholder.svg';

function BlogIndex() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Blog | All For All';
    (supabase.from('blogs' as any) as any)
      .select('*').eq('publicado', true)
      .order('fecha_publicacion', { ascending: false })
      .then(({ data }: any) => { setBlogs((data as Blog[]) || []); setLoading(false); });
  }, []);

  return (
    <main className="container mx-auto px-4 py-10 max-w-6xl">
      <h1 className="text-4xl md:text-5xl font-bold mb-2 text-foreground">Blog</h1>
      <p className="text-muted-foreground mb-10">Guías, comparativas y tendencias en tecnología</p>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted h-80 rounded-lg" />
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <p className="text-muted-foreground py-20 text-center">Aún no hay artículos publicados.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((b) => (
            <Link key={b.id} to="/blog/$slug" params={{ slug: b.slug }}
              className="group rounded-lg border bg-card hover:shadow-lg transition-shadow overflow-hidden">
              <div className="aspect-video bg-muted overflow-hidden">
                <img src={b.imagen_portada || FALLBACK} alt={b.imagen_alt || b.h1}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }} />
              </div>
              <div className="p-5">
                <p className="text-xs uppercase text-muted-foreground tracking-wide mb-2">{b.industria}</p>
                <h2 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary">{b.h1}</h2>
                <p className="text-sm text-muted-foreground line-clamp-3">{b.resumen_intro}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  {b.autor} · {b.fecha_publicacion ? new Date(b.fecha_publicacion).toLocaleDateString('es-CO') : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

export const Route = createFileRoute('/blog')({
  head: () => ({
    meta: [
      { title: 'Blog — All For All' },
      { name: 'description', content: 'Guías, comparativas y tendencias en tecnología.' },
    ],
  }),
  component: BlogIndex,
});
