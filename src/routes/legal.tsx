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
          <h2 className="text-2xl font-bold text-foreground">
            Política de Privacidad y Tratamiento de Datos Personales
          </h2>
          <p>
            All For All S.A.S., NIT 901.009.310-8, con domicilio en Bogotá, Colombia, en
            cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas aplicables,
            informa:
          </p>
          <div>
            <h3 className="font-semibold text-foreground">1. Datos recopilados</h3>
            <p>Nombre completo, correo electrónico, teléfono, dirección de entrega, información de pago.</p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">2. Finalidad del tratamiento</h3>
            <p>
              Procesamiento de pedidos, envío de productos, comunicaciones comerciales con
              consentimiento previo, mejora de la experiencia de compra, cumplimiento de obligaciones
              legales y contables.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">3. Derechos del titular</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Conocer, actualizar, rectificar y suprimir sus datos.</li>
              <li>Revocar la autorización otorgada.</li>
              <li>
                Presentar quejas ante la Superintendencia de Industria y Comercio (SIC).
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">4. Para ejercer sus derechos</h3>
            <p>
              Envíe un correo a:{" "}
              <a
                href="mailto:ventas.marketplace@allforall.com.co"
                className="text-secondary hover:underline"
              >
                ventas.marketplace@allforall.com.co
              </a>
              {" "}indicando nombre completo, solicitud específica y documento de identidad.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">5. Seguridad</h3>
            <p>
              Implementamos medidas técnicas y administrativas para proteger su información contra
              acceso no autorizado, pérdida o alteración.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">6. Transferencia a terceros</h3>
            <p>
              No compartimos datos con terceros sin autorización, excepto cuando sea requerido por
              ley o necesario para la prestación del servicio (transportadoras, pasarelas de pago).
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">7. Vigencia</h3>
            <p>
              Los datos se conservan mientras exista una relación comercial activa o sea requerido
              por ley.
            </p>
          </div>
          <p className="text-xs italic">
            Esta política puede ser actualizada. La versión vigente estará siempre disponible en
            nuestro sitio web.
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
