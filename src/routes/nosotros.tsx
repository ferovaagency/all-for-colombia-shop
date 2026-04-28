import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Truck, Heart, Target, Clock, ShieldCheck, Award, Instagram } from "lucide-react";

export const Route = createFileRoute("/nosotros")({
  head: () => ({
    meta: [
      { title: "Sobre nosotros — All For All" },
      { name: "description", content: "Más de 10 años garantizando compras de tecnología seguras, transparentes y sin sorpresas. Something for everyone." },
      { property: "og:title", content: "Sobre All For All" },
      { property: "og:description", content: "Tecnología confiable con respaldo real. Más de 10 años en Colombia." },
    ],
  }),
  component: AboutPage,
});

const INSTAGRAM_URL = "https://www.instagram.com/all4all_col?igsh=MTNhN3cyNWU1czR3cw%3D%3D";
const TIKTOK_URL = "https://www.tiktok.com/@allforallcol?_r=1&_t=ZS-94OG8Q9A7vN";

function AboutPage() {
  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Comprar tecnología en línea no debería ser una apuesta
          </h1>
          <p className="text-lg md:text-xl text-white/85 leading-relaxed">
            En All For All llevamos más de 10 años garantizando que cada compra sea
            segura, transparente y sin sorpresas. <em>Something for everyone.</em>
          </p>
        </div>
      </section>

      {/* Trust cards */}
      <section className="container mx-auto px-4 -mt-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TrustCard icon={<Award className="h-6 w-6" />} title="10+ años" text="De experiencia en el sector tecnológico" />
          <TrustCard icon={<MapPin className="h-6 w-6" />} title="Bogotá, Colombia" text="Con envíos a todo el país" />
          <TrustCard icon={<ShieldCheck className="h-6 w-6" />} title="Marcas certificadas" text="Solo trabajamos con marcas reconocidas" />
          <TrustCard icon={<Heart className="h-6 w-6" />} title="Garantía real" text="Respaldo en cada producto que vendemos" />
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 max-w-3xl">
        <h2 className="text-3xl font-bold mb-6">¿Por qué comprar en All For All y no en otro lugar?</h2>
        <div className="space-y-5 text-muted-foreground leading-relaxed">
          <p>Entendemos la duda. En internet hay cientos de tiendas y no todas son confiables.</p>
          <p>
            En All For All seleccionamos cuidadosamente cada producto, trabajamos con marcas líderes
            y garantizamos que lo que ves es lo que recibes. Sin sorpresas, sin letras pequeñas.
          </p>
          <p>
            Llevamos más de 10 años en el sector tecnológico en Bogotá, lo que nos permite ofrecerte
            no solo un producto, sino conocimiento, respaldo y una relación a largo plazo.
          </p>
          <p>Más que vender tecnología, queremos que te sientas seguro al elegirnos.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Card icon={<Target className="h-6 w-6" />} title="Misión">
            Acercar la mejor tecnología a las personas a través de una experiencia de compra online
            simple, confiable y sin complicaciones.
          </Card>
          <Card icon={<Heart className="h-6 w-6" />} title="Visión">
            Ser el referente de ventas online de tecnología en Latinoamérica, reconocido por
            transformar la experiencia de compra digital con confianza y transparencia.
          </Card>
        </div>

        {/* Horario destacado */}
        <div className="mt-8 bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 rounded-2xl p-6 flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-secondary text-white flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">Horario de atención</h3>
            <p className="text-sm text-muted-foreground">Lunes a Viernes: 8:00 am – 5:00 pm</p>
            <p className="text-sm text-muted-foreground">Sábados: 9:00 am – 1:00 pm</p>
          </div>
        </div>

        {/* Sede + cobertura */}
        <div className="bg-card border rounded-2xl p-6 grid sm:grid-cols-2 gap-4 mt-6">
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

        {/* Redes */}
        <div className="mt-8 text-center">
          <h3 className="font-bold text-lg mb-4">Síguenos en redes</h3>
          <div className="flex justify-center gap-3">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border hover:border-secondary hover:text-secondary transition-colors"
            >
              <Instagram className="h-4 w-4" />
              <span className="text-sm font-medium">@all4all_col</span>
            </a>
            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border hover:border-secondary hover:text-secondary transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.36a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.21z"/></svg>
              <span className="text-sm font-medium">@allforallcol</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function TrustCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm">
      <div className="h-10 w-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center mb-3">{icon}</div>
      <p className="font-bold text-sm md:text-base">{title}</p>
      <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-snug">{text}</p>
    </div>
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
