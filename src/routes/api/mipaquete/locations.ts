import { createFileRoute } from '@tanstack/react-router';
import { searchLocations } from '@/server/mipaquete.server';

/**
 * GET /api/mipaquete/locations?q=medell
 * Autocomplete for the checkout city field: returns Colombian locations
 * (name + DANE code) matching the query. The DANE code feeds quoteShipping.
 */
export const Route = createFileRoute('/api/mipaquete/locations')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const q = new URL(request.url).searchParams.get('q') ?? '';
          const results = await searchLocations(q);
          return Response.json(
            { results },
            { headers: { 'Cache-Control': 'public, max-age=600' } },
          );
        } catch (e: any) {
          if (e instanceof Response) return e;
          console.error('mipaquete locations error:', e);
          return Response.json(
            { error_code: 'server_error', description: e?.message ?? 'Unexpected error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
