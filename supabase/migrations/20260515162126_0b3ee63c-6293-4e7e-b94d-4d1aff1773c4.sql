-- Renombrar categorías existentes (case-insensitive)
UPDATE categories SET name = 'Computadores', slug = 'computadores'
WHERE LOWER(name) IN ('computadores y accesorios', 'computadores accesorios', 'pc y accesorios');

UPDATE categories SET name = 'Hogar', slug = 'hogar'
WHERE LOWER(name) IN ('hogar y tecnología', 'hogar y tecnologia', 'hogar tecnologia', 'hogar tech');

-- Crear nuevas categorías si no existen (esquema usa 'image' no 'image_url')
INSERT INTO categories (name, slug, parent_id, image, sort_order)
VALUES
  ('Ferretería y Hogar Inteligente', 'ferreteria-hogar-inteligente', NULL, NULL, 100),
  ('TV y Video', 'tv-y-video', NULL, NULL, 110)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- Limpiar prefijos "H1:", "H4:", etc. en campos editoriales de productos
UPDATE products
SET audiencia = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'grupo', regexp_replace(elem->>'grupo', '^[Hh][1-6][:.\s]+', ''),
      'perfil', regexp_replace(elem->>'perfil', '^[Hh][1-6][:.\s]+', ''),
      'caso_uso', regexp_replace(elem->>'caso_uso', '^[Hh][1-6][:.\s]+', '')
    )
  )
  FROM jsonb_array_elements(audiencia) elem
)
WHERE audiencia IS NOT NULL AND jsonb_typeof(audiencia) = 'array';

UPDATE products
SET por_que_comprar = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'argumento', regexp_replace(elem->>'argumento', '^[Hh][1-6][:.\s]+', ''),
      'detalle', regexp_replace(elem->>'detalle', '^[Hh][1-6][:.\s]+', '')
    )
  )
  FROM jsonb_array_elements(por_que_comprar) elem
)
WHERE por_que_comprar IS NOT NULL AND jsonb_typeof(por_que_comprar) = 'array';

UPDATE products
SET beneficios_reales = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'feature', regexp_replace(elem->>'feature', '^[Hh][1-6][:.\s]+', ''),
      'beneficio', regexp_replace(elem->>'beneficio', '^[Hh][1-6][:.\s]+', '')
    )
  )
  FROM jsonb_array_elements(beneficios_reales) elem
)
WHERE beneficios_reales IS NOT NULL AND jsonb_typeof(beneficios_reales) = 'array';

UPDATE products
SET faq = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'pregunta', regexp_replace(elem->>'pregunta', '^[Hh][1-6][:.\s]+', ''),
      'respuesta', regexp_replace(elem->>'respuesta', '^[Hh][1-6][:.\s]+', '')
    )
  )
  FROM jsonb_array_elements(faq) elem
)
WHERE faq IS NOT NULL AND jsonb_typeof(faq) = 'array';

UPDATE products SET description = regexp_replace(description, '^[Hh][1-6][:.\s]+', '')
WHERE description ~ '^[Hh][1-6][:.\s]+';

UPDATE products SET info_fabricante = regexp_replace(info_fabricante, '^[Hh][1-6][:.\s]+', '')
WHERE info_fabricante ~ '^[Hh][1-6][:.\s]+';

UPDATE products SET cierre_estrategico = regexp_replace(cierre_estrategico, '^[Hh][1-6][:.\s]+', '')
WHERE cierre_estrategico ~ '^[Hh][1-6][:.\s]+';

-- Distribuidor de prueba aprobado (esquema actual: password_hash + email)
INSERT INTO distributors (
  email, password_hash, username, company_name, contact_name, nit, phone, city,
  business_type, status, approved_at, discount_percentage, min_order_value,
  payment_terms, notes
) VALUES (
  'distribuidor-test@allforall.com.co', 'TestDist2026!', 'distribuidor-test',
  'Distribuidor Test', 'María Test', '900000000-0', '3000000000', 'Bogotá',
  'Tienda física', 'approved', NOW(), 20, 500000, 'contado',
  'Cuenta de prueba para validación interna del portal'
)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';