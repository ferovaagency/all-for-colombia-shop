import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, ShieldCheck, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/distribuidores/")({
  head: () => ({
    meta: [
      { title: "Distribuidores — All For All" },
      { name: "description", content: "Conviértete en distribuidor autorizado de All For All. Precios mayoristas, catálogo exclusivo y soporte dedicado." },
      { property: "og:title", content: "Sé distribuidor All For All" },
      { property: "og:description", content: "Precios de distribuidor, catálogo exclusivo y soporte dedicado." },
    ],
  }),
  component: DistributorLandingPage,
});

function DistributorLandingPage() {
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoginError("");
    setLoading(true);
    const { data, error } = await supabase
      .from("distributors")
      .select("*")
      .eq("email", loginEmail.trim().toLowerCase())
      .eq("status", "approved")
      .maybeSingle();
    setLoading(false);

    if (error || !data) {
      setLoginError("Credenciales incorrectas o cuenta pendiente de aprobación");
      return;
    }
    if (data.password_hash !== loginPassword) {
      setLoginError("Contraseña incorrecta");
      return;
    }

    localStorage.setItem(
      "afa_distributor",
      JSON.stringify({
        id: data.id,
        company: data.company_name,
        email: data.email,
      }),
    );
    toast.success(`Bienvenido, ${data.company_name}`);
    navigate({ to: "/distribuidores/portal" });
  };

  return (
    <>
      <section className="bg-gradient-hero text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-sm mb-4">
            <Handshake className="h-4 w-4" /> Programa de distribuidores
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            ¿Vendes tecnología? Seamos aliados.
          </h1>
          <p className="text-lg md:text-xl text-white/85 leading-relaxed mb-8">
            Accede a precios de distribuidor, catálogo exclusivo y soporte dedicado.
            Solo para empresas verificadas.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90">
              <Link to="/distribuidores/registro">
                Solicitar ser distribuidor <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/10 border-white/30 hover:bg-white/20 text-white"
              onClick={() => setLoginOpen(true)}
            >
              Ya tengo acceso
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 max-w-5xl">
        <h2 className="text-3xl font-bold text-center mb-2">Preguntas frecuentes</h2>
        <p className="text-center text-muted-foreground mb-10">
          Resolvemos las dudas que tienen la mayoría de nuestros aliados.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <Benefit
            icon={<FileText className="h-6 w-6" />}
            title="¿Cuáles son los precios de distribuidor?"
            text="Precios especiales por volumen, exclusivos para distribuidores verificados. Los ves al ingresar al portal."
          />
          <Benefit
            icon={<ShieldCheck className="h-6 w-6" />}
            title="¿Cómo me verifican?"
            text="Llenas el formulario, revisamos tu información en máximo 2 días hábiles y te enviamos tus credenciales."
          />
          <Benefit
            icon={<Handshake className="h-6 w-6" />}
            title="¿Qué incluye el portal?"
            text="Catálogo con precios de distribuidor, generación de pedidos directos y seguimiento en tiempo real."
          />
        </div>

        <div className="mt-12 text-center">
          <Button asChild size="lg" className="bg-primary">
            <Link to="/distribuidores/registro">
              Empezar mi solicitud <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Acceso distribuidores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email corporativo</Label>
              <Input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="empresa@correo.com"
                maxLength={255}
              />
            </div>
            <div>
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                maxLength={100}
              />
            </div>
            {loginError && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded p-2">
                {loginError}
              </p>
            )}
            <Button onClick={handleLogin} disabled={loading} className="w-full bg-primary">
              {loading ? "Verificando..." : "Ingresar al portal"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              ¿Aún no tienes cuenta?{" "}
              <Link to="/distribuidores/registro" className="text-secondary hover:underline">
                Solicita acceso
              </Link>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="h-12 w-12 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
