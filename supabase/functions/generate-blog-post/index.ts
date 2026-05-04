import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Eres redactor experto siguiendo la GUÍA EDITORIAL DE BLOGS de Ferova Agency para All For All.

REGLAS ABSOLUTAS:
1. Antes de escribir, todo artículo responde: ¿qué aprende el lector? ¿qué decisión toma? ¿realmente ayuda?
2. SOLO 1 H1 con fórmula: "[Keyword principal] + [Promesa de valor o contexto] | All For All" (máx 65 chars)
3. Frase inicial AFIRMATIVA (Sujeto + Verbo + Predicado), NUNCA pregunta ni anécdota
4. Resumen introductorio que explique qué aprenderá y prometa valor práctico
5. Desarrollo con jerarquía H2>H3>H4 sin saltar niveles
6. Tono conversado pero profesional, NO académico, NO robótico
7. Educación antes que venta — CTA sutil al final, nunca agresiva
8. Keyword principal en H1, primer párrafo y al menos un H2 (densidad 2-3% máx)
9. Mencionar "All For All" máximo 2 veces de forma contextual
10. NUNCA "somos los mejores", "¡compra ya!", clickbait vacío
11. Cierre = conclusión + resumen práctico + reflexión + CTA sutil
12. NUNCA escribir el texto literal "H1", "H2", "H3", "H4" en el contenido visible

Extensiones por tipo:
- "rapido": 600-900 palabras
- "informativo": 800-1200 palabras
- "autoridad": 1200-2000 palabras
- "guia": 2000-3500 palabras

Responde EXCLUSIVAMENTE con JSON válido sin markdown, sin backticks. Estructura:

{
  "h1": "string máx 65 chars con keyword + promesa",
  "slug": "url-amigable-con-keyword-principal",
  "keyword_principal": "keyword exacta",
  "keywords_secundarias": ["sec1", "sec2", "sec3"],
  "frase_inicial": "Afirmación con Sujeto + Verbo + Predicado",
  "resumen_intro": "Párrafo introductorio (3-5 oraciones)",
  "contenido_html": "<h2>...</h2><p>...</p><h3>...</h3><p>...</p> CUERPO COMPLETO con H2/H3/H4 sin saltar niveles. NO incluir el H1 aquí.",
  "cierre_html": "<h2>Conclusión</h2><p>...</p><p>Resumen práctico</p><p>Reflexión + CTA sutil</p>",
  "meta_title": "máx 60 chars con keyword",
  "meta_description": "150-160 chars con propuesta de valor",
  "imagen_alt": "Descripción de imagen con keyword si es natural"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { tema, keyword_principal, industria, tipo, audiencia_objetivo, notas_adicionales } = await req.json();

    if (!tema || !keyword_principal || !industria) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos: tema, keyword_principal e industria' }),
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

    const userPrompt = `Genera un blog completo siguiendo TODAS las reglas:

Tema: ${tema}
Keyword principal: ${keyword_principal}
Industria: ${industria}
Tipo: ${tipo || 'informativo'}
Audiencia: ${audiencia_objetivo || 'profesionales y compradores interesados en tecnología'}
Notas: ${notas_adicionales || 'ninguna'}

Genera el JSON completo cumpliendo la extensión mínima de palabras del tipo solicitado.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 8000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: 'Límite de IA alcanzado' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: 'Créditos de IA agotados' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const errText = await response.text();
      console.error('AI Gateway:', response.status, errText);
      throw new Error(`AI Gateway: ${response.status}`);
    }

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content ?? '';
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let parsed: any;
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

    if (!parsed.h1 || !parsed.contenido_html) {
      throw new Error('JSON incompleto: faltan h1 o contenido_html');
    }

    parsed.slug = String(parsed.slug || parsed.h1)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);

    parsed.industria = industria;
    parsed.tipo = tipo || 'informativo';

    return new Response(JSON.stringify(parsed), {
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
