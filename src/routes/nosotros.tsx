import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Truck, Heart, Target } from "lucide-react";

export const Route = createFileRoute("/nosotros")({
  head: () => ({
    meta: [
      { title: "Sobre nosotros — All For All" },
      { name: "description", content: "All For All: tu tienda colombiana con todo lo que necesitas para hogar y empresa." },
      { property: "og:title", content: "Sobre All For All" },
      { property: "og:description", content: "Todo lo que necesitas, para todos los colombianos." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Sobre All For All</h1>
          <p className="text-xl text-white/85 max-w-2xl mx-auto italic">
            "Todo lo que necesitas, para todos los colombianos."
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 max-w-3xl">
        <h2 className="text-3xl font-bold mb-4">Nuestra historia</h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Nacimos en Bogotá con una idea simple: ofrecer en un solo lugar todo lo que las personas
          y las empresas colombianas necesitan. Desde tecnología y soluciones para el hogar
          hasta equipos corporativos, aires acondicionados y plóters profesionales.
          Nuestro compromiso es que cada cliente reciba el producto correcto, con asesoría real
          y entrega confiable.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card icon={<Target className="h-6 w-6" />} title="Misión">
            Acercar productos de calidad y soluciones integrales a hogares y empresas en todo
            Colombia, con un servicio cercano, transparente y eficiente.
          </Card>
          <Card icon={<Heart className="h-6 w-6" />} title="Visión">
            Ser la tienda de confianza de los colombianos para todo tipo de productos,
            reconocida por su variedad, asesoría humana y entrega rápida.
          </Card>
        </div>

        <div className="bg-card border rounded-2xl p-6 grid sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-secondary mt-1" />
            <div>
              <p className="font-semibold">Sede principal</p>
              <p className="text-sm text-muted-foreground">Bogotá, Colombia</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Truck className="h-5 w-5 text-secondary mt-1" />
            <div>
              <p className="font-semibold">Cobertura</p>
              <p className="text-sm text-muted-foreground">Envíos a todo Colombia</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="h-10 w-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center mb-3">{icon}</div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
