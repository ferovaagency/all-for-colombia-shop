import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { email, contact_name, company_name, temp_password } = await req.json();

    if (!email || !temp_password) {
      return new Response(JSON.stringify({ error: 'email y temp_password obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY no configurada');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Bienvenido a All For All Distribuidores</title></head>
<body style="font-family: Arial, sans-serif; background:#f5f7fa; padding:20px; color:#020f1e;">
  <div style="max-width:600px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
    <div style="background:#020f1e; color:white; padding:32px; text-align:center;">
      <h1 style="margin:0; font-size:24px;">Bienvenido a All For All</h1>
      <p style="margin:8px 0 0; opacity:0.85;">Programa de Distribuidores</p>
    </div>
    <div style="padding:32px;">
      <p>Hola <strong>${contact_name}</strong>,</p>
      <p>Tu solicitud para <strong>${company_name}</strong> ha sido aprobada. Ya puedes acceder al portal mayorista de All For All con precios especiales y condiciones comerciales preferenciales.</p>
      <div style="background:#f5f7fa; padding:20px; border-radius:8px; margin:24px 0; border-left:4px solid #568baf;">
        <p style="margin:0 0 12px; font-weight:600;">Tus credenciales de acceso:</p>
        <p style="margin:4px 0;"><strong>Usuario:</strong> ${email}</p>
        <p style="margin:4px 0;"><strong>Contraseña temporal:</strong> ${temp_password}</p>
        <p style="margin:12px 0 0; font-size:13px; color:#3e4653;">Por seguridad, te recomendamos cambiarla en tu primer ingreso.</p>
      </div>
      <div style="text-align:center; margin:32px 0;">
        <a href="https://allforall.com.co/distribuidores" style="display:inline-block; background:#568baf; color:white; padding:14px 32px; text-decoration:none; border-radius:8px; font-weight:600;">Acceder al portal</a>
      </div>
      <p style="font-size:14px; color:#3e4653;">Si tienes cualquier duda, responde a este correo o escríbenos por WhatsApp al +57 321 828 0762.</p>
    </div>
    <div style="background:#f5f7fa; padding:20px; text-align:center; font-size:12px; color:#3e4653;">
      All For All · Tecnología y electrónica con garantía oficial<br>
      <a href="https://allforall.com.co" style="color:#568baf;">allforall.com.co</a>
    </div>
  </div>
</body></html>`;

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
        'accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'All For All', email: 'distribuidores@allforall.com.co' },
        to: [{ email, name: contact_name }],
        subject: 'Acceso aprobado al portal de distribuidores All For All',
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Brevo email error:', response.status, err);
      throw new Error(`Brevo email: ${response.status}`);
    }

    return new Response(JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
