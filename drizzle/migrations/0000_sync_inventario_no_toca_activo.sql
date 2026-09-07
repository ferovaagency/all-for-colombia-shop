CREATE OR REPLACE FUNCTION public.sync_inventario(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actualizados int := 0;
  v_sin_vincular int := 0;
  v_recibidos int := 0;
  v_bloqueados int := 0;
begin
  create temp table if not exists _inv_tmp (
    sku text primary key, qty int, price numeric, cost numeric, activo boolean
  ) on commit drop;
  delete from _inv_tmp;

  insert into _inv_tmp (sku, qty, price, cost, activo)
  select trim(x->>'sku'),
         greatest(coalesce((x->>'qty')::numeric, 0)::int, 0),
         coalesce((x->>'price')::numeric, 0),
         coalesce((x->>'cost')::numeric, 0),
         coalesce(upper(trim(coalesce(x->>'activo','SI'))) in ('SI','SÍ','TRUE','1','X'), true)
  from jsonb_array_elements(payload) x
  where coalesce(trim(x->>'sku'),'') <> ''
  on conflict (sku) do nothing;

  select count(*) into v_recibidos from _inv_tmp;
  select count(*) into v_bloqueados from _inv_tmp where cost <= 1000;

  -- La hoja manda en stock y precio. El resto de campos (nombre, descripción,
  -- categoría, marca, activo, dimensiones) se respetan tal como se editan en el admin.
  update products p
     set stock = i.qty,
         price = case when i.cost > 1000 and i.price > 0 then i.price else p.price end,
         inv_estado = case when i.cost <= 1000 then 'precio_pendiente' else 'vinculado' end,
         inv_synced_at = now()
    from _inv_tmp i
   where p.inv_sku = i.sku;
  get diagnostics v_actualizados = row_count;

  select count(*) into v_sin_vincular
    from _inv_tmp i
   where not exists (select 1 from products p where p.inv_sku = i.sku);

  return jsonb_build_object(
    'ok', true,
    'recibidos', v_recibidos,
    'actualizados', v_actualizados,
    'sin_vincular', v_sin_vincular,
    'precio_pendiente', v_bloqueados,
    'ts', now()
  );
end
$function$;