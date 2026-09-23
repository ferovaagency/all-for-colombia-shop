-- Guarda el ultimo valor de "Activo Web" que trajo la hoja, para que el
-- sincronizador solo pise products.active cuando esa celda CAMBIE.
-- Asi el activo/inactivo se puede manejar desde el admin de la pagina sin que
-- la corrida de los 15 minutos lo revierta.
--
-- Sin destruccion de datos: columna nueva, anulable, sin default.
-- NULL significa "todavia no se ha visto el valor de la hoja"; en la primera
-- corrida despues de aplicar esto, la hoja escribe el activo una vez y de ahi
-- en adelante solo cuando cambie.
alter table public.products
  add column if not exists inv_activo_hoja boolean;

comment on column public.products.inv_activo_hoja is
  'Ultimo valor de la columna "Activo Web" de la hoja de inventario. El sync solo escribe products.active cuando este valor cambia.';
