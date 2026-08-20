import { createFileRoute } from '@tanstack/react-router';
import { mpFetch } from '@/server/mipaquete.server';

/**
 * GET /api/mipaquete/tracking?mpCode=123456
 * Returns the shipment tracking history for a mipaquete code.
 */
export const Route = createFileRoute('/api/mipaquete/tracking')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const mpCode = url.searchParams.get('mpCode')?.trim();
          if (!mpCode || !/^\d{1,12}$/.test(mpCode)) {
            return Response.json(
              { error_code: 'invalid_input', description: 'mpCode inválido' },
              { status: 400 },
            );
          }
          const result = await mpFetch(`/getSendingTracking?mpCode=${encodeURIComponent(mpCode)}`, {
            method: 'GET',
          });
          return Response.json({ tracking: result });
        } catch (e: any) {
          if (e instanceof Response) return e;
          console.error('mipaquete tracking error:', e);
          return Response.json(
            { error_code: 'server_error', description: e?.message ?? 'Unexpected error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
