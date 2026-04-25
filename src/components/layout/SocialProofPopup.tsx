import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CITIES = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Bucaramanga", "Pereira", "Manizales", "Ibagué", "Santa Marta"];

export function SocialProofPopup() {
  const [item, setItem] = useState<{ city: string; product: string } | null>(null);
  const [products, setProducts] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("products")
      .select("name")
      .eq("active", true)
      .limit(20)
      .then(({ data }) => {
        if (data?.length) setProducts(data.map((d: any) => d.name));
      });
  }, []);

  useEffect(() => {
    if (!products.length) return;
    let timer: ReturnType<typeof setTimeout>;
    const showOne = () => {
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      setItem({ city, product });
      timer = setTimeout(() => {
        setItem(null);
        timer = setTimeout(showOne, 12000 + Math.random() * 8000);
      }, 6000);
    };
    timer = setTimeout(showOne, 15000);
    return () => clearTimeout(timer);
  }, [products]);

  if (!item) return null;

  return (
    <div className="fixed bottom-24 left-6 z-30 max-w-xs bg-card border shadow-elevated rounded-lg p-3 flex items-start gap-3 animate-fade-in-up">
      <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
        <ShoppingBag className="h-5 w-5 text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Alguien en {item.city}</p>
        <p className="text-sm font-medium truncate">acaba de comprar {item.product}</p>
      </div>
      <button onClick={() => setItem(null)} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
