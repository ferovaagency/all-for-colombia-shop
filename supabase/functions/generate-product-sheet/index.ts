import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { name, price, brand, category, condition,
            warranty, specs } = body;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY no configurada');

    const systemPrompt = `Eres un experto en copywriting para
e-commerce colombiano. Sigues estrictamente la Guía Editorial
Ferova Agency para fichas de producto.

REGLAS ABSOLUTAS:
1. Generas contenido en español colombiano natural y profesional
2. Nunca usas adjetivos vacíos como "increíble", "maravilloso",
   "revolucionario" sin sustento técnico
3. Cada beneficio debe ser concreto y medible
4. La marca y "All For All" se mencionan máximo 2 veces cada una
5. Siempre respondes SOLO con el JSON solicitado, sin texto extra
6. El JSON debe ser válido y parseable`;

    const userPrompt = `Genera la ficha completa de este producto
para All For All (e-commerce colombiano de tecnología).

DATOS DEL PRODUCTO:
Nombre: ${name}
${price ? `Precio: $${parseInt(price).toLocaleString('es-CO')} COP` : ''}
${brand ? `Marca: ${brand}` : ''}
${category ? `Categoría: ${category}` : ''}
${condition ? `Estado: ${condition}` : ''}
${warranty ? `Garantía: ${warranty}` : ''}
${specs ? `Especificaciones proporcionadas:\n${specs}` : ''}

ESTRUCTURA OBLIGATORIA — Sigue estas reglas al pie de la letra:

DESCRIPCIÓN COMPLETA (campo "description" en HTML):
Genera HTML completo con esta estructura exacta:

<h2>[Nombre producto] — [atributo diferenciador principal]</h2>

<p>[Primera oración OBLIGATORIA: Sujeto + Verbo + Predicado
técnico con contexto de uso real. NUNCA preguntas. NUNCA
"Este producto es...". Ejemplo: "El Logitech MX Master 3S
combina precisión electromagnética con conectividad
multidispositivo para profesionales que trabajan en múltiples
pantallas."]</p>

<p>[Párrafo introductorio de 3-5 oraciones: qué es el producto,
para qué sirve en la práctica, qué gana el comprador.
NO listar specs aquí. Tono conversado pero profesional.]</p>

<h3>¿Para quién es este producto?</h3>
<ul>
  <li><strong>[Perfil 1 concreto con cargo o situación real]:</strong> [Caso de uso específico y medible]</li>
  <li><strong>[Perfil 2 concreto]:</strong> [Caso de uso específico]</li>
  <li><strong>[Perfil 3 concreto]:</strong> [Caso de uso específico]</li>
</ul>

<h3>Beneficios reales</h3>
<ul>
  <li><strong>[Feature]</strong> — [Beneficio concreto medible. Formato: qué tiene → qué gana el usuario.]</li>
  <li>[4 beneficios más con el mismo formato]</li>
</ul>

<h3>Especificaciones técnicas con contexto</h3>
<table>
  <thead>
    <tr><th>Especificación</th><th>Valor</th><th>¿Qué significa para ti?</th></tr>
  </thead>
  <tbody>
    <tr><td>[Spec]</td><td>[Valor técnico]</td><td>[Impacto real para el usuario]</td></tr>
  </tbody>
</table>

<h3>Preguntas frecuentes</h3>
<p><strong>[Pregunta real que haría un comprador indeciso]</strong></p>
<p>[Respuesta honesta de 2-3 oraciones que genera confianza.]</p>
<p><strong>[Segunda pregunta sobre compatibilidad o uso]</strong></p>
<p>[Respuesta]</p>
<p><strong>[Tercera pregunta sobre garantía, envío o soporte]</strong></p>
<p>[Respuesta mencionando All For All y el proceso]</p>

<h3>¿Por qué comprarlo en All For All?</h3>
<ul>
  <li>[Argumento 1 concreto: garantía, tiempo, soporte]</li>
  <li>[Argumento 2: autenticidad, procedencia]</li>
  <li>[Argumento 3: asesoría, proceso de compra]</li>
</ul>

<h3>Testimonio de cliente</h3>
<blockquote>
  "[Testimonio verosímil de 3-4 oraciones que menciona un beneficio específico medible.]"
  <footer>— [Nombre colombiano real], [Cargo profesional], [Ciudad colombiana]</footer>
</blockquote>

DESCRIPCIÓN CORTA (campo "short_description"):
Máximo 40 palabras. Resumen del beneficio principal.
Formato: [Qué es] + [Para quién] + [Beneficio principal].

META TITLE (campo "meta_title"):
Máximo 60 caracteres.
Formato: [Nombre producto] [Marca] | All For All

META DESCRIPTION (campo "meta_description"):
150-160 caracteres exactos.

SPECS INFERIDAS (campo "specs"):
Formato JSON: {"Especificación": "Valor técnico"}. Mínimo 5.

CATEGORÍA SUGERIDA (campo "category"):
De: Audio, Gaming, Computadores y Accesorios, Celulares y Tablets,
Hogar y Tecnología, Impresión, Accesorios.

MARCA IDENTIFICADA (campo "brand"):
Si no se proporcionó, identifica la marca por el nombre.

Responde ÚNICAMENTE con este JSON válido, sin texto adicional:
{
  "description": "[HTML completo con toda la estructura]",
  "short_description": "[máx 40 palabras]",
  "meta_title": "[máx 60 chars]",
  "meta_description": "[150-160 chars]",
  "specs": {
    "[Especificación 1]": "[Valor 1]",
    "[Especificación 2]": "[Valor 2]"
  },
  "category": "[categoría sugerida o la proporcionada]",
  "brand": "[marca identificada o la proporcionada]"
}`;

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
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4000,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI Gateway error:', response.status, errText);
      if (response.status === 429)
        return new Response(
          JSON.stringify({ error: 'Límite de uso alcanzado. Intenta más tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      if (response.status === 402)
        return new Response(
          JSON.stringify({ error: 'Se requieren créditos en Lovable AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      throw new Error(`AI Gateway: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content ?? '';

    let parsed: any = {};
    try {
      let jsonStr = rawContent
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '');
      const start = jsonStr.indexOf('{');
      const end = jsonStr.lastIndexOf('}');
      if (start >= 0 && end > start) {
        jsonStr = jsonStr.slice(start, end + 1);
        parsed = JSON.parse(jsonStr);
      } else {
        parsed = { description: rawContent };
      }
    } catch (parseErr) {
      console.error('Parse error:', parseErr);
      parsed = { description: rawContent };
    }

    if (parsed.description && !parsed.description.trim().startsWith('<')) {
      const paragraphs = parsed.description
        .split('\n\n')
        .filter((p: string) => p.trim())
        .map((p: string) => `<p>${p.trim()}</p>`)
        .join('\n');
      parsed.description = paragraphs;
    }

    return new Response(
      JSON.stringify({
        content: parsed.description || rawContent,
        description: parsed.description,
        short_description: parsed.short_description,
        meta_title: parsed.meta_title,
        meta_description: parsed.meta_description,
        specs: parsed.specs,
        category: parsed.category,
        brand: parsed.brand,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Error:', e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
