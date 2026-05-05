import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://allforall.com.co';

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const urlEntry = (loc: string, lastmod?: string, changefreq = 'weekly', priority = '0.7') =>
  `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod.split('T')[0]}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
          const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
          const supabase = createClient(url, key);

          const urls: string[] = [];
          urls.push(urlEntry(`${SITE_URL}/`, undefined, 'daily', '1.0'));
          urls.push(urlEntry(`${SITE_URL}/tienda`, undefined, 'daily', '0.9'));
          urls.push(urlEntry(`${SITE_URL}/blog`, undefined, 'weekly', '0.8'));
          urls.push(urlEntry(`${SITE_URL}/categorias`, undefined, 'weekly', '0.7'));
          urls.push(urlEntry(`${SITE_URL}/ventas-corporativas`, undefined, 'monthly', '0.6'));
          urls.push(urlEntry(`${SITE_URL}/contacto`, undefined, 'monthly', '0.5'));
          urls.push(urlEntry(`${SITE_URL}/nosotros`, undefined, 'monthly', '0.5'));
          urls.push(urlEntry(`${SITE_URL}/legal`, undefined, 'yearly', '0.3'));

          const { data: products } = await supabase
            .from('products').select('slug, updated_at').eq('active', true)
            .order('updated_at', { ascending: false });
          (products || []).forEach((p: any) => {
            urls.push(urlEntry(`${SITE_URL}/producto/${p.slug}`, p.updated_at, 'weekly', '0.8'));
          });

          const { data: cats } = await supabase
            .from('categories_with_products' as any).select('slug');
          (cats || []).forEach((c: any) => {
            urls.push(urlEntry(`${SITE_URL}/tienda?categoria=${c.slug}`, undefined, 'weekly', '0.7'));
          });

          const { data: blogs } = await supabase
            .from('blogs' as any).select('slug, fecha_publicacion, updated_at')
            .eq('publicado', true);
          (blogs || []).forEach((b: any) => {
            const lastmod = b.updated_at || b.fecha_publicacion;
            urls.push(urlEntry(`${SITE_URL}/blog/${b.slug}`, lastmod, 'monthly', '0.7'));
          });

          const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

          return new Response(xml, {
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
              'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            },
          });
        } catch (e) {
          console.error('sitemap error', e);
          return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
            status: 500, headers: { 'Content-Type': 'application/xml' },
          });
        }
      },
    },
  },
});
