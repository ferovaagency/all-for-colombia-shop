import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — All For All" },
      { name: "description", content: "Guías, novedades y consejos sobre tecnología, hogar y soluciones empresariales." },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("blog_posts").select("*").eq("published", true).order("created_at", { ascending: false })
      .then(({ data }) => { setPosts(data || []); setLoading(false); });
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-2">Blog</h1>
      <p className="text-muted-foreground mb-10">Novedades, guías y consejos.</p>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="aspect-video bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-muted/40 border rounded-xl p-12 text-center text-muted-foreground">
          Aún no hay publicaciones. Vuelve pronto.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((p) => (
            <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="group bg-card border rounded-xl overflow-hidden hover:shadow-elevated transition-smooth">
              <div className="aspect-video bg-muted overflow-hidden">
                {p.cover_image && <img src={p.cover_image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-smooth" />}
              </div>
              <div className="p-5">
                {p.category && <p className="text-xs text-secondary font-medium mb-1">{p.category}</p>}
                <h2 className="font-semibold text-lg mb-2 group-hover:text-secondary transition-smooth">{p.title}</h2>
                {p.excerpt && <p className="text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
