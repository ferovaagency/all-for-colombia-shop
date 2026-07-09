import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://allforall.com.co';

const escapeXml = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const stripHtml = (s: string) =>
  String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const Route = createFileRoute('/feed.xml')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
          const key =
            process.env.SUPABASE_ANON_KEY ||
            process.env.SUPABASE_PUBLISHABLE_KEY ||
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
          const supabase = createClient(url, key);

          const { data: products } = await supabase
            .from('products')
            .select(
              'id, slug, name, description, short_description, price, sale_price, stock, images, brand, category, sku, condition'
            )
            .eq('active', true)
            .order('updated_at', { ascending: false })
            .limit(5000);

          const items = (products || [])
            .map((p: any) => {
              const link = `${SITE_URL}/producto/${p.slug}`;
              const image =
                Array.isArray(p.images) && p.images[0]
                  ? p.images[0]
                  : `${SITE_URL}/og-image.jpg`;
              const price = Number(p.price || 0);
              const sale = p.sale_price ? Number(p.sale_price) : null;
              if (!price || price <= 0) return '';
              const availability =
                (p.stock ?? 0) > 0 ? 'in stock' : 'out of stock';
              const desc =
                stripHtml(p.description || p.short_description || p.name) ||
                p.name;
              const condition = (p.condition || 'new').toLowerCase();
              const brand = p.brand || 'All For All';
              const gid = p.sku || p.id;
              const salePriceTag =
                sale && sale > 0 && sale < price
                  ? `      <g:sale_price>${sale.toFixed(2)} COP</g:sale_price>\n`
                  : '';
              return `    <item>
      <g:id>${escapeXml(gid)}</g:id>
      <title>${escapeXml(p.name)}</title>
      <description>${escapeXml(desc).slice(0, 4990)}</description>
      <link>${escapeXml(link)}</link>
      <g:image_link>${escapeXml(image)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price.toFixed(2)} COP</g:price>
${salePriceTag}      <g:condition>${escapeXml(condition)}</g:condition>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:identifier_exists>${p.sku ? 'yes' : 'no'}</g:identifier_exists>
      <g:product_type>${escapeXml(p.category || 'General')}</g:product_type>
    </item>`;
            })
            .filter(Boolean)
            .join('\n');

          const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>All For All Colombia</title>
    <link>${SITE_URL}</link>
    <description>Catálogo de productos All For All Colombia</description>
${items}
  </channel>
</rss>`;

          return new Response(xml, {
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
              'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            },
          });
        } catch (e) {
          console.error('feed error', e);
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>All For All</title></channel></rss>`,
            {
              status: 500,
              headers: { 'Content-Type': 'application/xml; charset=utf-8' },
            }
          );
        }
      },
    },
  },
});
