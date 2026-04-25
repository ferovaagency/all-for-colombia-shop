import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("afa_cookies")) {
      const t = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  const accept = () => {
    localStorage.setItem("afa_cookies", "accepted");
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-30 max-w-md bg-card border shadow-elevated rounded-lg p-4 animate-fade-in-up">
      <p className="text-sm text-foreground mb-3">
        Usamos cookies para mejorar tu experiencia. Al continuar, aceptas nuestra{" "}
        <Link to="/legal" className="underline text-secondary">política de privacidad</Link>.
      </p>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={accept}>Rechazar</Button>
        <Button size="sm" onClick={accept} className="bg-primary">Aceptar</Button>
      </div>
    </div>
  );
}
