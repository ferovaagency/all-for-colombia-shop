import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Eres "Ali", la asesora digital de All For All (allforall.com.co), tienda colombiana de tecnología y electrónica con marcas oficiales (Lenovo, MSI, Honor, Motorola, Wacom, Viewsonic, Gigabyte, Polycon, Ferrenovo y más).

TU MISIÓN
Ayudar a cada visitante a encontrar el producto correcto y llevarlo a la compra. Asesoras de forma directa, profesional y sin rodeos.

REGLAS ABSOLUTAS
1. SOLO usas información que esté en el contexto que recibes (productos del catálogo, blogs, info de la empresa). Si no está ahí, NO LO INVENTAS.
2. Cuando el usuario describa una necesidad, identificas el caso de uso real (no solo las palabras literales) y sugieres productos del catálogo que aparecen en el contexto.
3. Sugieres SIEMPRE productos como tarjeta clickeable usando este formato exacto al final de tu respuesta:
   [PRODUCT_SUGGESTIONS: id1,id2,id3]
   Donde id1, id2, id3 son los IDs reales de los productos del catálogo. Máximo 3 productos por respuesta.
4. Respondes directo, sin frases de relleno tipo "¡Excelente pregunta!" ni "Permíteme ayudarte". Vas al grano.
5. Si recomiendas un producto, explica EN UNA FRASE por qué es la mejor opción para el caso descrito.
6. NUNCA prometes precios, plazos de entrega, garantías o stock que no estén en el contexto.
7. NUNCA inventas marcas, modelos, especificaciones ni características.
8. Si el usuario pregunta algo de la empresa que no está en el contexto (políticas específicas, casos especiales, datos comerciales sensibles), escalas a WhatsApp.
9. Si el usuario pide hablar con un humano, escalas a WhatsApp.
10. Si después de 2 intentos no logras orientarlo, escalas a WhatsApp.

CUÁNDO ESCALAR A WHATSAPP
Para escalar agregas al final de tu respuesta:
[ESCALATE_WHATSAPP]
El sistema generará automáticamente el link con el resumen del chat y los productos sugeridos.

ESCALAS CUANDO:
- El usuario pide explícitamente hablar con asesor / humano / persona
- El usuario pregunta algo que NO está en el contexto (precio especial, condiciones particulares, descuentos por volumen, garantías extendidas no estándar, productos que no tenemos)
- El usuario muestra intención clara de compra y necesita confirmación de stock o coordinación de pago/envío
- El usuario lleva 2+ mensajes sin que puedas resolverle

ESTILO DE RESPUESTA
- Máximo 3 párrafos cortos
- Sin emojis salvo el primer saludo (👋)
- Tono cercano pero profesional
- Cierras con pregunta de cualificación o invitación a la acción
- En español de Colombia (uso de "tú", expresiones locales naturales)`;

interface ChatRequest {
  session_id: string;
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { session_id, message, history }: ChatRequest = await req.json();

    if (!session_id || !message) {
      return new Response(JSON.stringify({ error: 'session_id y message son obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const searchTerms = message.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);

    const { data: products } = await supabase
      .from('products')
      .select('id, name, slug, brand, price, sale_price, short_description, description, stock, specs, category_id, categories(name, slug)')
      .eq('active', true)
      .gt('stock', 0)
      .limit(80);

    const relevantProducts = (products || []).filter((p: any) => {
      const searchable = [
        p.name, p.brand, p.short_description, p.description,
        p.categories?.name, JSON.stringify(p.specs || {})
      ].join(' ').toLowerCase();
      return searchTerms.some((term: string) => searchable.includes(term));
    }).slice(0, 15);

    const productsContext = relevantProducts.length > 0 ? relevantProducts : (products || []).slice(0, 10);

    const { data: blogs } = await supabase
      .from('blogs')
      .select('h1, slug, resumen_intro, keyword_principal')
      .eq('publicado', true)
      .limit(20);

    const STATIC_INFO = `INFORMACIÓN DE ALL FOR ALL:
- Sitio: allforall.com.co
- Ubicación: Colombia (envíos a todo el país)
- WhatsApp comercial: +57 321 828 0762
- Email: ventas.marketplace@allforall.com.co
- Métodos de pago: tarjetas, PSE, transferencia bancaria, Bancolombia, Addi
- Garantía: oficial del fabricante (mínimo 12 meses)
- Programa B2B: portal de distribuidores en /distribuidores con precios mayoristas
- Categorías: computadores, laptops, smartphones, monitores, accesorios, audio, gaming, redes
- Marcas oficiales: Lenovo, MSI, Honor, Motorola, Wacom, Viewsonic, Gigabyte, Polycon, Ferrenovo`;

    const catalogContext = productsContext.map((p: any) => {
      const finalPrice = p.sale_price || p.price;
      return `ID:${p.id} | ${p.name} | Marca:${p.brand || 'N/A'} | $${Number(finalPrice).toLocaleString('es-CO')} COP | ${p.short_description || ''} | Stock:${p.stock} | Cat:${p.categories?.name || 'N/A'}`;
    }).join('\n');

    const blogsContext = (blogs || []).map((b: any) =>
      `${b.h1} (/blog/${b.slug}) — ${b.resumen_intro?.slice(0, 120) || ''}`
    ).join('\n');

    const fullContext = `${STATIC_INFO}

PRODUCTOS DISPONIBLES EN EL CATÁLOGO (usar SOLO estos IDs en [PRODUCT_SUGGESTIONS]):
${catalogContext || 'Sin productos disponibles.'}

BLOGS PUBLICADOS:
${blogsContext || 'Sin blogs disponibles.'}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY no configurada');

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `CONTEXTO ACTUAL DEL SITIO:\n\n${fullContext}` },
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 800,
        temperature: 0.4,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429)
        return new Response(JSON.stringify({ error: 'Demasiadas consultas. Intenta en un momento.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (aiResponse.status === 402)
        return new Response(JSON.stringify({ error: 'Servicio temporalmente no disponible' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const err = await aiResponse.text();
      console.error('AI Gateway:', aiResponse.status, err);
      throw new Error(`AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let assistantText: string = aiData?.choices?.[0]?.message?.content || '';

    const productMatch = assistantText.match(/\[PRODUCT_SUGGESTIONS:\s*([^\]]+)\]/);
    const escalateMatch = assistantText.match(/\[ESCALATE_WHATSAPP\]/);

    let suggestedProductIds: string[] = [];
    if (productMatch) {
      suggestedProductIds = productMatch[1].split(',').map((id: string) => id.trim()).filter(Boolean);
      assistantText = assistantText.replace(/\[PRODUCT_SUGGESTIONS:[^\]]+\]/, '').trim();
    }

    const shouldEscalate = !!escalateMatch;
    if (shouldEscalate) {
      assistantText = assistantText.replace(/\[ESCALATE_WHATSAPP\]/g, '').trim();
    }

    let suggestedProducts: any[] = [];
    if (suggestedProductIds.length > 0) {
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, slug, brand, price, sale_price, short_description, images, stock')
        .in('id', suggestedProductIds.slice(0, 3))
        .eq('active', true)
        .gt('stock', 0);
      suggestedProducts = prods || [];
    }

    const newHistory = [
      ...history,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantText, timestamp: new Date().toISOString() },
    ];

    await supabase.from('ai_conversations').upsert(
      {
        session_id,
        messages: newHistory,
        escalated: shouldEscalate,
        escalated_at: shouldEscalate ? new Date().toISOString() : null,
        suggested_products: suggestedProductIds.length > 0 ? suggestedProductIds : undefined,
      },
      { onConflict: 'session_id' }
    );

    let whatsappUrl: string | null = null;
    if (shouldEscalate) {
      const PHONE = '573218280762';

      const chatSummary = newHistory.slice(-8).map((m: any) => {
        const role = m.role === 'user' ? 'Cliente' : 'Ali (IA)';
        return `${role}: ${m.content.slice(0, 200)}`;
      }).join('\n\n');

      const productsBlock = suggestedProducts.length > 0
        ? '\n\nProductos que la IA sugirió:\n' + suggestedProducts.map((p: any) =>
            `• ${p.name} — $${Number(p.sale_price || p.price).toLocaleString('es-CO')} COP\n  https://allforall.com.co/producto/${p.slug}`
          ).join('\n')
        : '';

      const fullMsg = `Hola, vengo del chat de la web con Ali (asesora IA) y necesito ayuda de un asesor humano.

📋 Resumen de mi conversación:

${chatSummary}${productsBlock}

¿Pueden ayudarme a continuar desde aquí?`;

      whatsappUrl = `https://wa.me/${PHONE}?text=${encodeURIComponent(fullMsg)}`;
    }

    return new Response(JSON.stringify({
      reply: assistantText,
      suggested_products: suggestedProducts,
      escalate: shouldEscalate,
      whatsapp_url: whatsappUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Error sales-chat:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
