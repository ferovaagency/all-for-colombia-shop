import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { mpFetch, COLOMBIA_COUNTRY_CODE } from '@/server/mipaquete.server';

/**
 * POST /api/mipaquete/quote
 * Quotes shipping options (couriers, price, delivery days) for a destination.
 * Origin is fixed to the store's warehouse (env), so the client can't spoof it.
 */
const bodySchema = z.object({
  destinyLocationCode: z.string().trim().min(4).max(12), // DANE code
  quantity: z.number().int().min(1).max(100).default(1),
  width: z.number().positive().max(500),
  length: z.number().positive().max(500),
  height: z.number().positive().max(500),
  weight: z.number().positive().max(1000),
  declaredValue: z.number().min(0).max(100_000_000),
});

export const Route = createFileRoute('/api/mipaquete/quote')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const parsed = bodySchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json(
              { error_code: 'invalid_input', description: parsed.error.issues[0]?.message ?? 'Invalid body' },
              { status: 400 },
            );
          }
          const d = parsed.data;
          const originLocationCode = (process.env.MIPAQUETE_ORIGIN_DANE || '11001000').trim(); // Bogotá D.C.

          const result = await mpFetch('/quoteShipping', {
            method: 'POST',
            body: {
              originCountryCode: COLOMBIA_COUNTRY_CODE,
              originLocationCode,
              destinyCountryCode: COLOMBIA_COUNTRY_CODE,
              destinyLocationCode: d.destinyLocationCode,
              quantity: d.quantity,
              width: d.width,
              length: d.length,
              height: d.height,
              weight: d.weight,
              declaredValue: d.declaredValue,
            },
          });

          return Response.json({ options: result });
        } catch (e: any) {
          if (e instanceof Response) return e;
          console.error('mipaquete quote error:', e);
          return Response.json(
            { error_code: 'server_error', description: e?.message ?? 'Unexpected error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
