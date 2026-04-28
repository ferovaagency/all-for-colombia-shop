-- Limpiar categorías anteriores sin productos asignados
DELETE FROM categories WHERE id NOT IN 
  (SELECT DISTINCT category_id FROM products 
   WHERE category_id IS NOT NULL);

-- Asegurar UNIQUE en slug para ON CONFLICT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_slug_key'
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Categorías padre
INSERT INTO categories (slug, name, sort_order) VALUES
('audio','Audio',1),
('gaming','Gaming',2),
('computadores-accesorios','Computadores y Accesorios',3),
('celulares-tablets','Celulares y Tablets',4),
('hogar-tech','Hogar y Tecnología',5),
('impresion','Impresión',6),
('accesorios','Accesorios',7)
ON CONFLICT (slug) DO UPDATE SET 
  name=EXCLUDED.name, sort_order=EXCLUDED.sort_order, parent_id=NULL;

-- Subcategorías Audio
INSERT INTO categories (slug, name, parent_id, sort_order) VALUES
('parlantes','Parlantes',(SELECT id FROM categories WHERE slug='audio'),1),
('microfonos','Micrófonos',(SELECT id FROM categories WHERE slug='audio'),2),
('audifonos-diademas','Audífonos y Diademas',(SELECT id FROM categories WHERE slug='audio'),3)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- Subcategorías Gaming
INSERT INTO categories (slug, name, parent_id, sort_order) VALUES
('sillas-gamer','Sillas Gamer',(SELECT id FROM categories WHERE slug='gaming'),1),
('teclados','Teclados',(SELECT id FROM categories WHERE slug='gaming'),2),
('mouses','Mouses',(SELECT id FROM categories WHERE slug='gaming'),3),
('combos-teclado-mouse','Combos Teclado y Mouse',(SELECT id FROM categories WHERE slug='gaming'),4),
('pad-mouse','Pad Mouse',(SELECT id FROM categories WHERE slug='gaming'),5),
('monitores','Monitores',(SELECT id FROM categories WHERE slug='gaming'),6)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- Subcategorías Computadores y Accesorios
INSERT INTO categories (slug, name, parent_id, sort_order) VALUES
('pc-laptops','PCs y Laptops',(SELECT id FROM categories WHERE slug='computadores-accesorios'),1),
('memorias','Memorias',(SELECT id FROM categories WHERE slug='computadores-accesorios'),2),
('cables','Cables',(SELECT id FROM categories WHERE slug='computadores-accesorios'),3),
('cargadores','Cargadores',(SELECT id FROM categories WHERE slug='computadores-accesorios'),4),
('morrales','Morrales y Bolsos',(SELECT id FROM categories WHERE slug='computadores-accesorios'),5),
('camaras-seguridad','Cámaras de Seguridad',(SELECT id FROM categories WHERE slug='computadores-accesorios'),6)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- Subcategorías Celulares y Tablets
INSERT INTO categories (slug, name, parent_id, sort_order) VALUES
('celulares','Celulares',(SELECT id FROM categories WHERE slug='celulares-tablets'),1),
('smartwatch','Smartwatch',(SELECT id FROM categories WHERE slug='celulares-tablets'),2),
('tablets','Tablets',(SELECT id FROM categories WHERE slug='celulares-tablets'),3)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- Subcategorías Hogar y Tecnología
INSERT INTO categories (slug, name, parent_id, sort_order) VALUES
('hogar-inteligente','Hogar Inteligente',(SELECT id FROM categories WHERE slug='hogar-tech'),1),
('cocina','Cocina',(SELECT id FROM categories WHERE slug='hogar-tech'),2),
('herramientas','Herramientas',(SELECT id FROM categories WHERE slug='hogar-tech'),3),
('articulos-auto','Artículos para Auto',(SELECT id FROM categories WHERE slug='hogar-tech'),4),
('comodidad','Comodidad',(SELECT id FROM categories WHERE slug='hogar-tech'),5),
('termos','Termos',(SELECT id FROM categories WHERE slug='hogar-tech'),6),
('proyectores','Proyectores',(SELECT id FROM categories WHERE slug='hogar-tech'),7),
('electronica','Artículos y Electrónica',(SELECT id FROM categories WHERE slug='hogar-tech'),8),
('aires-acondicionados','Aires Acondicionados',(SELECT id FROM categories WHERE slug='hogar-tech'),9)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;

-- Subcategorías Impresión
INSERT INTO categories (slug, name, parent_id, sort_order) VALUES
('impresoras','Impresoras',(SELECT id FROM categories WHERE slug='impresion'),1),
('tintas','Tintas e Insumos',(SELECT id FROM categories WHERE slug='impresion'),2),
('ploters','Plóters',(SELECT id FROM categories WHERE slug='impresion'),3)
ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, parent_id=EXCLUDED.parent_id, sort_order=EXCLUDED.sort_order;