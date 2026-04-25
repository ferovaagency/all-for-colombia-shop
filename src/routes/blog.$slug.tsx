import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPostPage,
});

function BlogPostPage() {
  const { slug } = Route.useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("blog_posts").select("*").eq("slug", slug).eq("published", true).maybeSingle()
      .then(({ data }) => { setPost(data); setLoading(false); });
  }, [slug]);

  if (loading) return <div className="container mx-auto px-4 py-12">Cargando...</div>;
  if (!post) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-2">Artículo no encontrado</h1>
      <Link to="/blog" className="text-secondary hover:underline">Volver al blog</Link>
    </div>
  );

  return (
    <article className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/blog" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver al blog
      </Link>
      {post.category && <p className="text-secondary font-medium mb-2">{post.category}</p>}
      <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
      {post.excerpt && <p className="text-lg text-muted-foreground mb-8">{post.excerpt}</p>}
      {post.cover_image && (
        <img src={post.cover_image} alt={post.title} className="w-full aspect-video object-cover rounded-xl mb-8" />
      )}
      <div className="prose prose-lg max-w-none whitespace-pre-wrap">{post.content}</div>
    </article>
  );
}
