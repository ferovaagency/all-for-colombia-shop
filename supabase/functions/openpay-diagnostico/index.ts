import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function trimEnv(name: string) {
  return Deno.env.get(name)?.trim() ?? '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const merchantId = trimEnv('OPENPAY_MERCHANT_ID');
  const privateKey = trimEnv('OPENPAY_PRIVATE_KEY');
  const sandboxValue = trimEnv('OPENPAY_SANDBOX');
  const isSandbox = sandboxValue === 'true';
  const baseUrl = isSandbox ? 'https://sandbox-api.openpay.co' : 'https://api.openpay.co';

  const diagnostic: Record<string, unknown> = {
    entorno: isSandbox ? 'sandbox' : 'produccion',
    url_base: baseUrl,
    merchant_id: merchantId,
    private_key_preview: privateKey ? `${privateKey.slice(0, 6)}...` : '',
  };

  if (!merchantId || !privateKey) {
    return new Response(
      JSON.stringify({
        ...diagnostic,
        status_http_openpay: null,
        cuerpo_openpay: {
          error_code: 'missing_openpay_config',
          description: 'OPENPAY_MERCHANT_ID y OPENPAY_PRIVATE_KEY deben estar configurados.',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const authHeader = 'Basic ' + btoa(`${privateKey}:`);
  const url = `${baseUrl}/v1/${merchantId}/customers?limit=1`;

  try {
    const openpayRes = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
    });

    const contentType = openpayRes.headers.get('content-type') ?? '';
    let body: unknown;
    if (contentType.includes('application/json')) {
      body = await openpayRes.json();
    } else {
      body = await openpayRes.text();
    }

    return new Response(
      JSON.stringify({
        ...diagnostic,
        status_http_openpay: openpayRes.status,
        cuerpo_openpay: body,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ...diagnostic,
        status_http_openpay: null,
        cuerpo_openpay: {
          error_code: 'diagnostic_request_failed',
          description: error instanceof Error ? error.message : 'Error ejecutando diagnóstico Openpay',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});