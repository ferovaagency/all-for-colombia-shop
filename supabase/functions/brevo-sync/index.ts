import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  email: string;
  list: 'distributors' | 'newsletter' | 'buyers';
  attributes?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { email, list, attributes }: SyncRequest = await req.json();

    if (!email || !list) {
      return new Response(JSON.stringify({ error: 'email y list son obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: 'BREVO_API_KEY no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const listMap: Record<string, string | undefined> = {
      distributors: Deno.env.get('BREVO_LIST_DISTRIBUTORS'),
      newsletter: Deno.env.get('BREVO_LIST_NEWSLETTER'),
      buyers: Deno.env.get('BREVO_LIST_BUYERS'),
    };

    const listId = listMap[list];
    if (!listId) {
      return new Response(JSON.stringify({ error: `Lista '${list}' no configurada en Brevo` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
        'accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        attributes: attributes || {},
        listIds: [Number(listId)],
        updateEnabled: true,
      }),
    });

    if (!response.ok && response.status !== 204) {
      const errBody = await response.text();
      console.error('Brevo error:', response.status, errBody);
      if (response.status === 400) {
        const addToListRes = await fetch(`https://api.brevo.com/v3/contacts/lists/${listId}/contacts/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': BREVO_API_KEY,
            'accept': 'application/json',
          },
          body: JSON.stringify({ emails: [email] }),
        });
        if (!addToListRes.ok && addToListRes.status !== 201 && addToListRes.status !== 204) {
          const addErr = await addToListRes.text();
          console.error('Brevo add to list error:', addToListRes.status, addErr);
          throw new Error(`Brevo: ${addToListRes.status}`);
        }
      } else {
        throw new Error(`Brevo: ${response.status}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, list, email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Error sync Brevo:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
