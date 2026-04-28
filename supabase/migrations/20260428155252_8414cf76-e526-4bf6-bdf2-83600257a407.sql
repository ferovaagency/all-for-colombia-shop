-- Bucket privado para comprobantes de pago
insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

-- Policies: cualquiera puede subir (checkout público), solo authenticated/admin lee
create policy "Anyone can upload payment receipts"
on storage.objects
for insert
to public
with check (bucket_id = 'payment-receipts');

create policy "Authenticated can read payment receipts"
on storage.objects
for select
to authenticated
using (bucket_id = 'payment-receipts');

-- Añadir columna receipt_url a orders (si no existe)
alter table public.orders add column if not exists receipt_url text;