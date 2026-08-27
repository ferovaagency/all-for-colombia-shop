import { supabase } from "@/integrations/supabase/client";

type AvailabilityProduct = {
  id: string;
  slug: string;
  name: string;
  sku?: string | null;
  price?: number | null;
};

export function logAvailabilityRequest(
  product: AvailabilityProduct,
  source: "product_card" | "product_detail",
) {
  const payload = {
    items: [
      {
        product_id: product.id,
        slug: product.slug,
        name: product.name,
        sku: product.sku ?? null,
        price: product.price ?? null,
        source,
      },
    ],
  };

  void (async () => {
    try {
      await supabase.from("availability_requests").insert(payload);
    } catch {
      // noop: never block the WhatsApp redirect or show errors to the user
    }
  })();
}
