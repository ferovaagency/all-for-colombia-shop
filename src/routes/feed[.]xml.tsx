import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://allforall.com.co';

// Remove characters that are illegal in XML 1.0, then escape the rest.
const escapeXml = (s: string) =>
  String(s ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const stripHtml = (s: string) =>
  String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Google Merchant Center only accepts new | refurbished | used.
const CONDITION_MAP: Record<string, string> = {
  nuevo: 'new',
  new: 'new',
  usado: 'used',
  used: 'used',
  'segunda mano': 'used',
  reacondicionado: 'refurbished',
  reacondicionada: 'refurbished',
  renovado: 'refurbished',
  reformado: 'refurbished',
  refurbished: 'refurbished',
};

const isHttpUrl = (u: unknown): u is string =>
  typeof u === 'string' && /^https?:\/\/.+/i.test(u.trim());

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
            .not('price', 'is', null)
            .gt('price', 0)
            .order('updated_at', { ascending: false })
            .limit(5000);

          const items = (products || [])
            .map((p: any) => {
              // id: required + unique, no surrounding whitespace.
              const sku = p.sku ? String(p.sku).trim() : '';
              const gid = sku || (p.id ? String(p.id).trim() : '');
              if (!gid || !p.slug) return '';

              const price = Number(p.price || 0);
              if (!price || price <= 0) return '';
              const sale = p.sale_price ? Number(p.sale_price) : null;

              const link = `${SITE_URL}/producto/${p.slug}`;

              // image_link: must be an absolute http(s) URL. Pick the first
              // valid one; fall back to the site OG image so the item stays valid.
              const imageCandidates = Array.isArray(p.images)
                ? p.images
                : [p.images];
              const validImage = imageCandidates.find(isHttpUrl);
              const image = validImage
                ? validImage.trim()
                : `${SITE_URL}/og-image.jpg`;

              const availability =
                (p.stock ?? 0) > 0 ? 'in_stock' : 'out_of_stock';
              const desc = (
                stripHtml(p.description || p.short_description || p.name) ||
                p.name ||
                ''
              ).slice(0, 4900);
              const title = String(p.name || '').trim().slice(0, 150);
              const condition =
                CONDITION_MAP[String(p.condition || '').trim().toLowerCase()] ||
                'new';
              const brand = p.brand || 'All For All';
              const salePriceTag =
                sale && sale > 0 && sale < price
                  ? `      <g:sale_price>${sale.toFixed(2)} COP</g:sale_price>\n`
                  : '';
              // When an SKU exists we expose it as MPN so identifier_exists=yes
              // is backed by a real identifier tag.
              const mpnTag = sku
                ? `      <g:mpn>${escapeXml(sku)}</g:mpn>\n`
                : '';
              return `    <item>
      <g:id>${escapeXml(gid)}</g:id>
      <title>${escapeXml(title)}</title>
      <description>${escapeXml(desc)}</description>
      <link>${escapeXml(link)}</link>
      <g:image_link>${escapeXml(image)}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>${price.toFixed(2)} COP</g:price>
${salePriceTag}      <g:condition>${condition}</g:condition>
      <g:brand>${escapeXml(brand)}</g:brand>
${mpnTag}      <g:identifier_exists>${sku ? 'yes' : 'no'}</g:identifier_exists>
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
