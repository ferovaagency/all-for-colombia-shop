import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/legal")({
  head: () => ({ meta: [{ title: "Legal — All For All" }, { name: "robots", content: "noindex" }] }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-2">Información legal</h1>
      <p className="text-sm text-muted-foreground mb-8">
        All For All S.A.S. — NIT 901.009.310-8 — Bogotá, Colombia
      </p>

      <Tabs defaultValue="terminos" className="w-full">
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 bg-muted p-1">
          <TabsTrigger value="terminos">Términos y Condiciones</TabsTrigger>
          <TabsTrigger value="garantia">Garantía y Devoluciones</TabsTrigger>
          <TabsTrigger value="envios">Política de Envíos</TabsTrigger>
          <TabsTrigger value="privacidad">Privacidad y Datos</TabsTrigger>
          <TabsTrigger value="cookies">Cookies</TabsTrigger>
        </TabsList>

        <TabsContent value="terminos" className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
          <h2 className="text-2xl font-bold text-foreground">Términos y Condiciones</h2>
          <p>
            All For All S.A.S., NIT 901.009.310-8, con sede en Bogotá, Colombia, opera la tienda
            en línea allforall.com.co. Al realizar una compra acepta estos términos.
          </p>
          <p>Precios en COP. Envíos a todo Colombia.</p>
          <p>
            Nos reservamos el derecho de cancelar pedidos con información incorrecta o fraude
            detectado.
          </p>
        </TabsContent>

        <TabsContent value="garantia" className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
          <h2 className="text-2xl font-bold text-foreground">Garantía y Devoluciones</h2>
          <p>
            En cumplimiento del Estatuto del Consumidor (Ley 1480 de 2011), todos nuestros
            productos cuentan con garantía legal frente a defectos de fabricación.
          </p>
          <p>
            <strong className="text-foreground">Plazo de garantía:</strong> el establecido por el fabricante
            (generalmente 12 meses), contados desde la fecha de entrega.
          </p>
          <p>
            <strong className="text-foreground">Retracto:</strong> dispone de 5 días hábiles a partir
            de la entrega para ejercer el derecho de retracto, siempre que el producto se
            encuentre en su empaque original, sin uso y con todos sus accesorios.
          </p>
          <p>
            <strong className="text-foreground">Cambios:</strong> aceptamos cambios por talla, color
            o referencia dentro de los 5 días hábiles siguientes a la entrega, sujeto a
            disponibilidad de inventario.
          </p>
          <p>
            <strong className="text-foreground">Productos no cubiertos:</strong> daños causados por
            mal uso, manipulación indebida, accidentes, humedad o reparaciones realizadas por
            terceros no autorizados.
          </p>
          <p>
            Para iniciar el proceso de garantía o devolución, contáctenos por WhatsApp o correo
            electrónico con su número de pedido y evidencia del inconveniente.
          </p>
        </TabsContent>

        <TabsContent value="envios" className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
          <h2 className="text-2xl font-bold text-foreground">Política de Envíos</h2>
          <p>Realizamos envíos a todo el territorio colombiano.</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Bogotá y área metropolitana: 1-3 días hábiles.</li>
            <li>Ciudades principales: 2-5 días hábiles.</li>
            <li>Municipios: 3-7 días hábiles.</li>
          </ul>
          <p>El costo se calcula al momento del pago según peso y destino.</p>
          <p>Para rastreo de pedidos contáctenos por WhatsApp.</p>
        </TabsContent>

        <TabsContent value="privacidad" className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
          <h2 className="text-2xl font-bold text-foreground">Privacidad y Datos Personales</h2>
          <p>
            En cumplimiento con la Ley 1581 de 2012, All For All S.A.S. NIT 901.009.310-8
            informa que los datos personales recopilados (nombre, email, teléfono, dirección)
            son utilizados exclusivamente para procesar pedidos y comunicaciones relacionadas.
          </p>
          <p>No compartimos datos con terceros sin autorización.</p>
          <p>
            Para ejercer derechos de acceso, rectificación o supresión contáctenos a través de
            nuestros canales oficiales.
          </p>
        </TabsContent>

        <TabsContent value="cookies" className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
          <h2 className="text-2xl font-bold text-foreground">Cookies</h2>
          <p>Usamos cookies para mejorar la experiencia de navegación.</p>
          <p>Las cookies nos ayudan a recordar tus preferencias y analizar el uso del sitio.</p>
          <p>Al continuar navegando aceptas el uso de cookies.</p>
          <p>Puedes gestionarlas desde tu navegador.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
