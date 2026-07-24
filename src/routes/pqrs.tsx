import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Loader2, ScrollText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LegalLink, PrivacyNotice } from "@/components/legal/ConsentControls";
import { submitPrivacyRequest } from "@/lib/consent.functions";
import { recordLegalAcceptance } from "@/lib/consent";

export const Route = createFileRoute("/pqrs")({
  head: () => ({
    meta: [
      { title: "PQRS y Derechos de Datos Personales — All For All" },
      {
        name: "description",
        content:
          "Radica peticiones, quejas, reclamos o ejerce tus derechos de acceso, rectificación, supresión y revocatoria conforme a la Ley 1581 de 2012.",
      },
    ],
  }),
  component: PqrsPage,
});

const TYPES = [
  {
    value: "acceso",
    label: "Acceso",
    help: "Quiero saber qué datos míos tratan y con qué finalidad.",
  },
  {
    value: "actualizacion",
    label: "Actualización",
    help: "Mis datos están desactualizados y quiero corregirlos.",
  },
  {
    value: "rectificacion",
    label: "Rectificación",
    help: "Hay información inexacta, incompleta o errónea sobre mí.",
  },
  {
    value: "supresion",
    label: "Supresión",
    help: "Quiero que eliminen mis datos personales.",
  },
  {
    value: "revocatoria",
    label: "Revocatoria",
    help: "Retiro la autorización que había dado para tratar mis datos.",
  },
  { value: "consulta", label: "Consulta", help: "Tengo una pregunta sobre el tratamiento." },
  { value: "reclamo", label: "Reclamo", help: "Considero que se incumplió la normativa." },
] as const;

type RequestType = (typeof TYPES)[number]["value"];

function PqrsPage() {
  const [type, setType] = useState<RequestType>("acceso");
  const [form, setForm] = useState({
    full_name: "",
    document_id: "",
    email: "",
    phone: "",
    description: "",
  });
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);

  const setField = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      toast.error("Debes autorizar el tratamiento de tus datos para radicar la solicitud");
      return;
    }
    setLoading(true);
    const res = await submitPrivacyRequest({
      data: {
        type,
        full_name: form.full_name,
        document_id: form.document_id,
        email: form.email,
        phone: form.phone || null,
        description: form.description,
      },
    }).catch(() => ({ ok: false, error: "Error de red" }) as const);
    setLoading(false);

    if (!res.ok) {
      toast.error("error" in res ? res.error : "No pudimos radicar tu solicitud");
      return;
    }

    recordLegalAcceptance({
      keys: ["privacidad", "aviso"],
      origin: "pqrs",
      reference: form.email.toLowerCase(),
    }).catch(() => {});

    setTicket(("id" in res && res.id) || "recibida");
  };

  if (ticket) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-xl text-center">
        <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto mb-5" />
        <h1 className="text-3xl font-bold mb-3">Solicitud radicada</h1>
        <p className="text-muted-foreground mb-2">Registramos tu solicitud con el número:</p>
        <p className="font-mono text-sm bg-muted rounded-lg px-4 py-2 inline-block mb-6">
          {ticket.slice(0, 8).toUpperCase()}
        </p>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          Te responderemos al correo indicado dentro de los términos de la Ley 1581 de 2012: diez
          (10) días hábiles para consultas y quince (15) días hábiles para reclamos, prorrogables
          conforme a la ley. Si no podemos responder a tiempo te informaremos las razones y la nueva
          fecha estimada.
        </p>
        <Button asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-14 md:py-20 max-w-3xl">
          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-primary-foreground/60">
            <ShieldCheck className="h-3.5 w-3.5" /> Habeas Data
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mt-3">
            PQRS y derechos sobre tus datos
          </h1>
          <p className="mt-4 text-primary-foreground/75 leading-relaxed">
            Como titular puedes conocer, actualizar, rectificar y suprimir tus datos personales, así
            como revocar la autorización otorgada. Radica aquí tu solicitud y te respondemos por
            escrito.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 max-w-3xl">
        <form onSubmit={submit} className="space-y-6">
          <div className="bg-card border rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-1">¿Qué necesitas?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona el derecho que deseas ejercer.
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <label
                  key={t.value}
                  className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                    type === t.value ? "border-secondary bg-secondary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t.value}
                    checked={type === t.value}
                    onChange={() => setType(t.value)}
                    className="mt-1 accent-[var(--secondary)]"
                  />
                  <span>
                    <span className="font-medium text-sm block">{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.help}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6">
            <h2 className="font-semibold text-lg mb-4">Tus datos</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Pedimos tu documento únicamente para verificar que eres el titular de los datos, tal
              como exige la Ley 1581 de 2012.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Nombre completo *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setField("full_name", e.target.value)}
                  required
                  minLength={3}
                  maxLength={120}
                />
              </div>
              <div>
                <Label>Número de documento *</Label>
                <Input
                  value={form.document_id}
                  onChange={(e) => setField("document_id", e.target.value)}
                  required
                  minLength={4}
                  maxLength={30}
                />
              </div>
              <div>
                <Label>Correo electrónico *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  required
                  maxLength={255}
                />
              </div>
              <div>
                <Label>Teléfono (opcional)</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  maxLength={30}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Describe tu solicitud *</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={5}
                  placeholder="Cuéntanos con el mayor detalle posible qué necesitas."
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs leading-relaxed cursor-pointer mt-5">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[var(--secondary)]"
              />
              <span className="text-muted-foreground">
                Autorizo el tratamiento de los datos aquí suministrados con la única finalidad de
                gestionar y responder esta solicitud, conforme al <LegalLink doc="aviso" /> y la{" "}
                <LegalLink doc="privacidad" />.<span className="text-destructive ml-0.5">*</span>
              </span>
            </label>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <Button type="submit" size="lg" disabled={loading || !consent} className="bg-primary">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Radicando…
                  </>
                ) : (
                  "Radicar solicitud"
                )}
              </Button>
              <PrivacyNotice className="sm:flex-1">
                Usaremos estos datos exclusivamente para tramitar tu solicitud y acreditar su
                atención ante las autoridades.
              </PrivacyNotice>
            </div>
          </div>
        </form>

        <div className="mt-8 rounded-2xl border bg-muted/30 p-5 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <ScrollText className="h-4 w-4 mt-0.5 shrink-0 text-secondary" />
            <span>
              Agotado el trámite interno, puedes acudir ante la{" "}
              <strong className="text-foreground">Superintendencia de Industria y Comercio</strong>{" "}
              si consideras vulnerado tu derecho a la protección de datos personales. Consulta el
              detalle en la <LegalLink doc="privacidad" />.
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
