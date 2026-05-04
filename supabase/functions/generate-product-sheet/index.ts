import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Eres redactor experto de fichas de producto e-commerce siguiendo la GUÍA EDITORIAL FEROVA AGENCY para All For All.

REGLAS ABSOLUTAS:
1. SOLO 1 H1 con fórmula: "[Nombre] [Marca] [Modelo] – [Atributo diferenciador] | All For All" (máx 65 caracteres)
2. Jerarquía H1>H2>H3>H4 sin saltar niveles
3. Mínimo 800 palabras de contenido real
4. Tono conversado pero profesional, NUNCA "somos los mejores", "¡compra ya!", adjetivos vacíos
5. Mencionar "All For All" máximo 2 veces de forma contextual
6. Cada spec con su impacto real para el usuario
7. Beneficios = ganancias del comprador, NO features
8. Keyword principal en H1, primer párrafo y al menos un H2 (densidad máx 2-3%)
9. Las 3 reseñas son representativas (NO inventar nombres reales de personas conocidas) con nombre + inicial, ciudad colombiana, cargo profesional, 4-5 oraciones, beneficio específico medible
10. FAQ entre 5 y 8 preguntas con respuestas de 2-4 oraciones
11. NUNCA copiar texto del fabricante. Reescribir todo con voz propia.

Responde EXCLUSIVAMENTE con JSON válido sin markdown, sin backticks, sin comentarios. Estructura exacta:

{
  "h1": "string máx 65 chars",
  "afirmacion_inicial": "Sujeto + Verbo + Predicado técnico (1 oración)",
  "descripcion_corta": "Resumen para listados (máx 160 chars)",
  "descripcion_larga": "HTML con párrafos <p>, mínimo 3-5 oraciones, qué es, para qué sirve, qué gana el comprador",
  "audiencia": [
    {"grupo": "Nombre del perfil", "perfil": "H4 específico", "caso_uso": "Caso de uso concreto en 1-2 oraciones"}
  ],
  "specs_contexto": [
    {"spec": "Nombre", "valor": "Valor técnico", "significado": "Qué significa para el usuario"}
  ],
  "beneficios_reales": [
    {"feature": "Feature técnico", "beneficio": "Beneficio medible para el comprador"}
  ],
  "info_fabricante": "2-4 oraciones sobre la marca: trayectoria, posicionamiento, garantía oficial",
  "por_que_comprar": [
    {"argumento": "Garantía / Soporte / Pago / Entrega / Autenticidad", "detalle": "Detalle concreto"}
  ],
  "reviews": [
    {"nombre_completo": "Carlos M.", "ciudad": "Bogotá, Colombia", "cargo": "Director Creativo", "rating": 5, "contenido": "4-5 oraciones con beneficio específico medible"}
  ],
  "faq": [
    {"pregunta": "¿Pregunta?", "respuesta": "Respuesta de 2-4 oraciones"}
  ],
  "cierre_estrategico": "Resumen + diferencial All For All + CTA natural (3-4 oraciones)",
  "specs": {"Spec1": "Valor1", "Spec2": "Valor2"},
  "category": "categoría sugerida",
  "brand": "marca identificada",
  "meta_title": "máx 60 chars con keyword + marca",
  "meta_description": "150-160 chars con propuesta de valor"
}

Reglas de cantidad mínima:
- audiencia: exactamente 3 perfiles
- specs_contexto: mínimo 6 specs
- beneficios_reales: exactamente 5 beneficios
- por_que_comprar: exactamente 5 argumentos
- reviews: EXACTAMENTE 3 reseñas representativas
- faq: entre 5 y 8 preguntas
- specs (objeto plano): mínimo 5`;

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    // Acepta nombres en español (nuevo) o inglés (compat)
    const nombre = body.nombre || body.name || '';
    const marca = body.marca || body.brand || '';
    const modelo = body.modelo || body.model || '';
    const categoria = body.categoria || body.category || '';
    const subcategoria = body.subcategoria || body.subcategory || '';
    const precio = body.precio || body.price || '';
    const condition = body.condition || 'Nuevo';
    const warranty = body.warranty || '';
    const specs_raw = body.specs_raw || body.specs || '';
    const descripcion_fabricante = body.descripcion_fabricante || body.notes || '';

    if (!nombre) {
      return new Response(
        JSON.stringify({ error: 'Falta el nombre del producto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userPrompt = `Genera la ficha completa para este producto siguiendo TODAS las reglas:

Nombre: ${nombre}
Marca: ${marca || 'Identifica por el nombre'}
Modelo: ${modelo || 'N/A'}
Categoría: ${categoria || 'N/A'}
Subcategoría: ${subcategoria || 'N/A'}
Estado: ${condition}
Garantía: ${warranty || '12 meses con fabricante'}
Precio: ${precio ? `$${precio} COP` : 'N/A'}
Specs en bruto: ${specs_raw || 'No proporcionadas — infiere las más probables del modelo'}
Descripción del fabricante (NO copiar, solo referencia): ${descripcion_fabricante || 'N/A'}

Genera el JSON completo. Si faltan specs, infiere las más probables del modelo según conocimiento técnico de la categoría.`;

    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 8000,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: 'Límite de IA alcanzado, intenta en unos segundos' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: 'Créditos de IA agotados' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const errText = await response.text();
      console.error('AI Gateway error:', response.status, errText);
      throw new Error(`AI Gateway: ${response.status}`);
    }

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content ?? '';
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); }
        catch { throw new Error('La IA no devolvió JSON válido. Reintenta.'); }
      } else {
        throw new Error('La IA no devolvió JSON válido. Reintenta.');
      }
    }

    // Forzar 3 reviews
    if (!Array.isArray(parsed.reviews)) parsed.reviews = [];
    parsed.reviews = parsed.reviews.slice(0, 3);
    while (parsed.reviews.length < 3) {
      parsed.reviews.push({
        nombre_completo: 'Cliente A.',
        ciudad: 'Bogotá, Colombia',
        cargo: 'Profesional independiente',
        rating: 5,
        contenido: 'Producto con buen desempeño. La compra y el soporte de All For All fueron claros y rápidos.',
      });
    }

    // Normalizar para el cliente: incluir también campos en inglés que ya usa el admin
    const out = {
      // Editorial completo
      h1: parsed.h1 || nombre,
      afirmacion_inicial: parsed.afirmacion_inicial || null,
      descripcion_corta: parsed.descripcion_corta || null,
      descripcion_larga: parsed.descripcion_larga || null,
      audiencia: parsed.audiencia || [],
      specs_contexto: parsed.specs_contexto || [],
      beneficios_reales: parsed.beneficios_reales || [],
      info_fabricante: parsed.info_fabricante || null,
      por_que_comprar: parsed.por_que_comprar || [],
      reviews: parsed.reviews,
      faq: parsed.faq || [],
      cierre_estrategico: parsed.cierre_estrategico || null,
      // Compat con admin actual (inglés)
      description: parsed.descripcion_larga || null,
      short_description: parsed.descripcion_corta || null,
      meta_title: parsed.meta_title || null,
      meta_description: parsed.meta_description || null,
      specs: parsed.specs || (parsed.specs_contexto || []).reduce((acc: any, s: any) => {
        if (s?.spec && s?.valor) acc[s.spec] = s.valor;
        return acc;
      }, {}),
      category: parsed.category || categoria || null,
      brand: parsed.brand || marca || null,
    };

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Error:', e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
