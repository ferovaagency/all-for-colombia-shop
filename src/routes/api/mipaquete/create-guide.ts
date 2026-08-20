import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { mpFetch, getApiKey, COLOMBIA_COUNTRY_CODE } from '@/server/mipaquete.server';

/**
 * POST /api/mipaquete/create-guide   { order_id }
 * Generates the shipping guide for a PAID order via mipaquete createSending,
 * then stores mpCode + guide URL on the order.
 *
 * Admin-only (spends mipaquete balance): caller must send
 * `Authorization: Bearer <supabase access token>` of a user with the admin role.
 *
 * Shipping details are read from order.shipping_address (jsonb), which the
 * checkout populates: { address, city, destinyDaneCode, deliveryCompany, package }.
 * Sender/origin come from env.
 */
const bodySchema = z.object({ order_id: z.string().uuid() });

function env(key: string, fallback = '') {
  return (process.env[key] || fallback).trim();
}

export const Route = createFileRoute('/api/mipaquete/create-guide')({
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

          const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

          // ---- Admin authorization ----
          const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
          if (!token) {
            return Response.json({ error_code: 'unauthorized', description: 'Falta el token de sesión.' }, { status: 401 });
          }
          const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userData?.user) {
            return Response.json({ error_code: 'unauthorized', description: 'Sesión inválida.' }, { status: 401 });
          }
          const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
            _user_id: userData.user.id,
            _role: 'admin',
          });
          if (!isAdmin) {
            return Response.json({ error_code: 'forbidden', description: 'Requiere rol de administrador.' }, { status: 403 });
          }

          // ---- Load order ----
          const { data: order, error: orderErr } = await supabaseAdmin
            .from('orders')
            .select('id, customer_name, customer_email, customer_phone, customer_id_type, customer_id_number, subtotal, total, status, items, shipping_address')
            .eq('id', parsed.data.order_id)
            .maybeSingle();
          if (orderErr) return Response.json({ error_code: 'db_error', description: orderErr.message }, { status: 500 });
          if (!order) return Response.json({ error_code: 'not_found', description: 'Pedido no encontrado' }, { status: 404 });
          if (order.status !== 'paid') {
            return Response.json({ error_code: 'not_paid', description: 'El pedido no está pagado.' }, { status: 409 });
          }

          const ship: any = order.shipping_address ?? {};
          if (ship?.mipaquete?.mpCode) {
            return Response.json({ error_code: 'already_generated', description: 'La guía ya fue generada.', ...ship.mipaquete }, { status: 409 });
          }

          const destinyDaneCode = String(ship.destinyDaneCode ?? '').trim();
          const deliveryCompany = String(ship.deliveryCompany ?? '').trim();
          if (!destinyDaneCode || !deliveryCompany) {
            return Response.json(
              { error_code: 'missing_shipping_data', description: 'El pedido no tiene código DANE de destino o transportadora seleccionada.' },
              { status: 422 },
            );
          }

          const pkg = ship.package ?? {};
          const [firstName, ...restName] = String(order.customer_name || '').trim().split(/\s+/);
          const { userId } = await getApiKey();

          const payload = {
            adminTransactionData: { saleValue: Number(env('MIPAQUETE_COLLECT_ON_DELIVERY') === 'true' ? order.total : 0) },
            channel: 'All For All',
            comments: ship.notes ?? '',
            criteria: 'price',
            deliveryCompany,
            description: `Pedido ${order.id}`,
            locate: {
              destinyDaneCode,
              originDaneCode: env('MIPAQUETE_ORIGIN_DANE', '11001000'),
              originCountryCode: COLOMBIA_COUNTRY_CODE,
              destinyCountryCode: COLOMBIA_COUNTRY_CODE,
            },
            paymentType: Number(env('MIPAQUETE_PAYMENT_TYPE', '101')),
            productInformation: {
              declaredValue: Number(pkg.declaredValue ?? order.subtotal ?? 0),
              forbiddenProduct: false,
              height: Number(pkg.height ?? 10),
              large: Number(pkg.length ?? 10),
              productReference: `Pedido ${String(order.id).slice(0, 8)}`,
              quantity: Number(pkg.quantity ?? 1),
              weight: Number(pkg.weight ?? 1),
              width: Number(pkg.width ?? 10),
            },
            receiver: {
              cellPhone: String(order.customer_phone || '').replace(/\D/g, '').slice(-10),
              destinationAddress: ship.address ?? '',
              email: order.customer_email ?? '',
              name: firstName || order.customer_name || '',
              nit: String(order.customer_id_number || '.'),
              nitType: String(order.customer_id_type || 'CC'),
              prefix: '+57',
              surname: restName.join(' ') || '.',
            },
            requestPickup: env('MIPAQUETE_REQUEST_PICKUP', 'false'),
            sender: {
              cellPhone: env('MIPAQUETE_SENDER_CELLPHONE'),
              email: env('MIPAQUETE_SENDER_EMAIL'),
              name: env('MIPAQUETE_SENDER_NAME', 'All For All'),
              nit: env('MIPAQUETE_SENDER_NIT', '901009310'),
              nitType: env('MIPAQUETE_SENDER_NIT_TYPE', 'NIT'),
              pickupAddress: env('MIPAQUETE_SENDER_ADDRESS', 'Cra. 13 #134a-16 Ofi 201, Bogotá'),
              prefix: '+57',
              surname: env('MIPAQUETE_SENDER_SURNAME', '.'),
            },
            user: userId,
          };

          const result: any = await mpFetch('/createSending', { method: 'POST', body: payload });

          const mipaquete = {
            mpCode: result?.mpCode ?? result?.code ?? null,
            guideUrl: result?.labelUrl ?? result?.guideUrl ?? result?.url ?? null,
            deliveryCompany,
            createdAt: new Date().toISOString(),
          };
          await supabaseAdmin
            .from('orders')
            .update({ shipping_address: { ...ship, mipaquete } })
            .eq('id', order.id);

          return Response.json({ ok: true, ...mipaquete, raw: result });
        } catch (e: any) {
          if (e instanceof Response) return e;
          console.error('mipaquete create-guide error:', e);
          return Response.json(
            { error_code: 'server_error', description: e?.message ?? 'Unexpected error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
