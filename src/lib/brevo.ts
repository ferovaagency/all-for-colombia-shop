import { supabase } from '@/integrations/supabase/client';

export type BrevoList = 'distributors' | 'newsletter' | 'buyers';

export async function syncToBrevo(
  email: string,
  list: BrevoList,
  attributes?: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('brevo-sync', {
      body: { email, list, attributes },
    });
    if (error) return { ok: false, error: error.message };
    if (data?.error) return { ok: false, error: data.error };
    return { ok: true };
  } catch (e) {
    console.error('Error sync Brevo:', e);
    return { ok: false, error: (e as Error).message };
  }
}
