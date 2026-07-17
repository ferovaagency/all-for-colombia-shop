import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/shop/ProductCard";
import { trackWhatsAppClick } from "@/lib/analytics";

export function ZeroResults({ term }: { term?: string }) {
  const [top, setTop] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(slug,name), brands(slug,name)")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      setTop(data || []);
    })();
  }, []);

  const waMsg = term
    ? `Hola, estaba buscando: ${term}. ¿Tienen disponibilidad?`
    : "Hola, no encontré lo que buscaba en la tienda. ¿Me pueden ayudar?";

  return (
    <div className="space-y-8">
      <div className="bg-muted/40 border rounded-2xl p-8 md:p-10 text-center">
        <h2 className="text-xl md:text-2xl font-bold mb-2">
          {term ? <>No encontramos resultados para “{term}”</> : <>Sin resultados con esos filtros</>}
        </h2>
        <p className="text-muted-foreground mb-5 max-w-xl mx-auto">
          Prueba con otro término, revisa la ortografía o pídele a nuestro asesor Ali que te ayude a
          conseguirlo.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/tienda"
            className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
          >
            Ver todo el catálogo
          </Link>
          <a
            href={`https://wa.me/573134977955?text=${encodeURIComponent(waMsg)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppClick("zero_results", { term })}
            className="inline-flex items-center px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-semibold hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Escríbele a Ali por WhatsApp
          </a>
        </div>
      </div>

      {top.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3">Productos más recientes</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {top.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
