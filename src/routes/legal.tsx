import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal")({
  head: () => ({ meta: [{ title: "Legal — All For All" }, { name: "robots", content: "noindex" }] }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl prose prose-sm">
      <h1 className="text-4xl font-bold mb-6">Información legal</h1>

      <h2 className="text-2xl font-bold mt-8 mb-3">Términos y condiciones</h2>
      <p className="text-muted-foreground">
        Al usar el sitio All For All aceptas los siguientes términos. La empresa se reserva
        el derecho de modificar precios, disponibilidad y políticas en cualquier momento.
        Los productos están sujetos a existencias.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-3">Política de privacidad</h2>
      <p className="text-muted-foreground">
        Tratamos los datos personales conforme a la Ley 1581 de 2012 de Colombia. La información
        recopilada se usa exclusivamente para procesar pedidos, brindar soporte y enviar
        comunicaciones comerciales si el usuario lo autoriza.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-3">Política de envíos</h2>
      <p className="text-muted-foreground">
        Realizamos envíos a todo Colombia. Los tiempos varían entre 2 y 7 días hábiles
        dependiendo del destino. El costo de envío se calcula al confirmar la compra.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-3">Cambios y devoluciones</h2>
      <p className="text-muted-foreground">
        Aceptamos devoluciones dentro de los 5 días hábiles posteriores a la entrega siempre que
        el producto se encuentre en su empaque original y sin uso. Para iniciar el proceso,
        contáctanos por WhatsApp o email.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-3">Cookies</h2>
      <p className="text-muted-foreground">
        Usamos cookies para recordar tus preferencias y mejorar la experiencia. Puedes
        desactivarlas desde tu navegador, aunque algunas funciones podrían no estar disponibles.
      </p>
    </div>
  );
}
