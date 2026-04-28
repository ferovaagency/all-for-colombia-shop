// Generates a product sheet (description + benefits + FAQs) using Lovable AI Gateway.
// No external API key required — uses LOVABLE_API_KEY available in Edge Functions.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, sku, brand, category, price, specs, description } = await req.json();

    if (!name) {
      return new Response(JSON.stringify({ error: "El nombre del producto es obligatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY no configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Genera una ficha de producto profesional para e-commerce colombiano.

Producto: ${name}
SKU: ${sku || "N/A"}
Marca: ${brand || "N/A"}
Categoría: ${category || "N/A"}
Precio: ${price ? "$" + Number(price).toLocaleString("es-CO") + " COP" : "N/A"}
Especificaciones: ${specs || "N/A"}
Notas adicionales: ${description || "N/A"}

Genera el siguiente contenido en español colombiano, optimizado para SEO:

## Descripción completa
(150-200 palabras, persuasiva, clara y orientada a conversión)

## Descripción corta
(30-40 palabras, ideal para vista previa)

## Beneficios principales
(5 bullets cortos y concretos)

## Preguntas frecuentes
(3 preguntas con respuestas breves de 2-3 líneas cada una)

Usa formato Markdown limpio y no incluyas títulos extra ni introducciones.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Eres un copywriter experto en ecommerce colombiano. Escribes fichas de producto claras, persuasivas y optimizadas para SEO en español colombiano.",
          },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de uso alcanzado. Intenta más tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Se requieren créditos en Lovable AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Error en el servicio de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-product-sheet error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
