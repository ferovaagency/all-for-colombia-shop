-- =====================================================================
-- Fusion de los clones vacios que creo la sincronizacion de inventario.
--
-- NO SE EJECUTA SOLO. Lo corre Mafe, o alguien con su visto bueno explicito.
--
-- Contexto: cuando la hoja le cambiaba el codigo a un producto, la version
-- vieja de `inventory-sync` no lo reconocia, insertaba un clon en blanco (sin
-- fotos, sin marca, sin categoria) y mandaba el producto editado a stock 0.
-- El arreglo de la funcion evita que vuelva a pasar; este script limpia los
-- dos casos que ya ocurrieron.
--
-- Criterio de fusion: se conserva el registro VIEJO (el que el admin edito).
-- Conserva su id, su slug, sus fotos, su marca, su categoria y su ficha. De
-- las columnas del clon solo se traen las que son de la hoja: sku, inv_sku,
-- stock y precio. Asi la URL publica del producto no cambia.
--
-- Verificado antes de escribir esto (25-09-2026):
--   - product_reviews, weekly_deals y promo_coupons: 0 filas apuntan a los clones.
--   - orders: 0 pedidos mencionan los clones ni sus SKU.
--   => borrar los clones no arrastra nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PASO 0. Mirar que hay antes de tocar. Ejecutar y LEER la salida.
-- ---------------------------------------------------------------------
select
  case when id in ('ecca1792-9e25-4eb9-8719-065e4967889e',
                   'd03db74a-d2ae-4e79-9be9-8ef27fcf1d2b')
       then 'SE CONSERVA' else 'SE BORRA' end as destino,
  id, sku, inv_sku, name, slug, stock, price, active, inv_estado,
  coalesce(array_length(images, 1), 0) as fotos,
  (brand_id is not null) as tiene_marca,
  (category_id is not null) as tiene_categoria,
  created_at
from products
where id in (
  'ecca1792-9e25-4eb9-8719-065e4967889e',  -- Honeywell PC42E-T  editado  IMP-0864
  '8aba5711-65d8-401b-88eb-4618fd337ee1',  -- Honeywell PC42E-T  clon     IMP-0858
  'd03db74a-d2ae-4e79-9be9-8ef27fcf1d2b',  -- Epson WF-C5890     editado  IMP-0862
  'c9cbf20a-e444-4248-b730-a05d18b26702'   -- Epson WF-C5890     clon     IMP-0856
)
order by name, created_at;

-- ---------------------------------------------------------------------
-- PASO 1. La fusion, en una sola transaccion.
--
-- El clon se borra ANTES de reasignar su SKU, porque products_inv_sku_uniq
-- es un indice unico parcial y no deja que dos filas compartan inv_sku.
--
-- Si algo sale distinto de lo esperado, ROLLBACK y no pasa nada.
-- ---------------------------------------------------------------------
begin;

-- Honeywell PC42E-T: IMP-0864 (editado) recibe el codigo y el stock de IMP-0858.
delete from products where id = '8aba5711-65d8-401b-88eb-4618fd337ee1';
update products
   set sku            = 'IMP-0858',
       inv_sku        = 'IMP-0858',
       stock          = 5,
       price          = 653900,
       inv_estado     = 'vinculado',
       inv_synced_at  = now()
 where id = 'ecca1792-9e25-4eb9-8719-065e4967889e';

-- Epson WF-C5890: IMP-0862 (editado) recibe el codigo y el stock de IMP-0856.
delete from products where id = 'c9cbf20a-e444-4248-b730-a05d18b26702';
update products
   set sku            = 'IMP-0856',
       inv_sku        = 'IMP-0856',
       stock          = 17,
       price          = 2102900,
       inv_estado     = 'vinculado',
       inv_synced_at  = now()
 where id = 'd03db74a-d2ae-4e79-9be9-8ef27fcf1d2b';

-- Debe devolver 2 filas, las dos con fotos, marca y categoria, y con el codigo nuevo.
select id, sku, inv_sku, name, slug, stock, price, inv_estado,
       coalesce(array_length(images, 1), 0) as fotos,
       (brand_id is not null) as tiene_marca,
       (category_id is not null) as tiene_categoria
  from products
 where id in ('ecca1792-9e25-4eb9-8719-065e4967889e',
              'd03db74a-d2ae-4e79-9be9-8ef27fcf1d2b');

-- Si la salida es la esperada:
commit;
-- Si no:
-- rollback;

-- ---------------------------------------------------------------------
-- PASO 2. Vigilancia. Deja esta consulta a mano: lista los grupos de
-- productos con el mismo nombre normalizado donde una copia tiene foto y
-- la otra no. Si vuelve a aparecer algo aqui, la sincronizacion volvio a
-- clonar y hay que mirarla.
--
-- Hoy, ademas de estos dos, hay 16 grupos de nombre repetido en los que las
-- DOS copias tienen foto. Esos son duplicados de otro origen y se revisan
-- uno por uno: este script no los toca.
-- ---------------------------------------------------------------------
with n as (
  select id, sku, inv_sku, name, stock, inv_estado,
         coalesce(array_length(images, 1), 0) as fotos,
         upper(regexp_replace(
           translate(name, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'),
           '[^A-Za-z0-9]', '', 'g')) as nkey
    from products
)
select nkey,
       count(*) as copias,
       count(*) filter (where fotos > 0) as con_foto,
       count(*) filter (where fotos = 0) as sin_foto,
       count(*) filter (where inv_estado = 'sin_inventario') as archivados
  from n
 group by nkey
having count(*) > 1
   and count(*) filter (where fotos = 0) > 0
   and count(*) filter (where fotos > 0) > 0
 order by copias desc;
