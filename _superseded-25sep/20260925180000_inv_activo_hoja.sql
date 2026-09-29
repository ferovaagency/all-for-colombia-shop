-- "Activo Web" se maneja en los dos lados: en la hoja de inventario y en el
-- admin de la pagina. Para saber si la hoja CAMBIO esa celda (y no repetir el
-- mismo valor pisando lo que el admin acaba de decidir) hay que recordar cual
-- fue el ultimo valor que vino de la hoja.
--
-- Es una columna nueva y nullable: no toca ni un dato existente. NULL significa
-- "todavia no se ha sincronizado con la hoja nueva", y en esa primera corrida
-- la hoja sí escribe el activo, una sola vez, para sembrar el valor.
alter table public.products
  add column if not exists inv_activo_hoja boolean;

comment on column public.products.inv_activo_hoja is
  'Ultimo valor de "Activo Web" leido de la hoja de inventario. La sincronizacion solo pisa products.active cuando este valor cambia.';

-- Estados posibles de inv_estado, para referencia:
--   vinculado        el SKU de la hoja corresponde a este producto
--   sku_reasignado   la hoja le cambio el codigo a este producto (se reviso y se reasigno)
--   sin_inventario   su SKU ya no viene en la hoja; queda en stock 0
