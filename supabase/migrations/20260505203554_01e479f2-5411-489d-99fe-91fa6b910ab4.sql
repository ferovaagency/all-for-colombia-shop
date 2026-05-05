
-- BLOQUE 1: brands
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS show_in_home BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 100;

UPDATE brands SET show_in_home = FALSE
WHERE LOWER(name) IN ('daikin', 'carrier', 'kisonli');

INSERT INTO brands (name, slug, show_in_home, display_order)
VALUES
  ('Viewsonic', 'viewsonic', TRUE, 10),
  ('Ferrenovo', 'ferrenovo', TRUE, 20),
  ('Polycon', 'polycon', TRUE, 30),
  ('Wacom', 'wacom', TRUE, 40),
  ('Honor', 'honor', TRUE, 50),
  ('Motorola', 'motorola', TRUE, 60),
  ('Lenovo', 'lenovo', TRUE, 70),
  ('Gigabyte', 'gigabyte', TRUE, 80),
  ('MSI', 'msi', TRUE, 90)
ON CONFLICT (slug) DO UPDATE SET
  show_in_home = TRUE,
  display_order = EXCLUDED.display_order;

-- BLOQUE 5: vista de categorías visibles
CREATE OR REPLACE VIEW categories_with_products AS
SELECT 
  c.*,
  COALESCE(p.product_count, 0) AS product_count
FROM categories c
LEFT JOIN (
  SELECT category_id, COUNT(*) AS product_count
  FROM products
  WHERE active = true AND stock > 0
  GROUP BY category_id
) p ON p.category_id = c.id
WHERE COALESCE(p.product_count, 0) > 0
   OR c.id IN (
     SELECT DISTINCT parent_id FROM categories child
     WHERE parent_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM products pr
         WHERE pr.category_id = child.id AND pr.active = true AND pr.stock > 0
       )
   );

GRANT SELECT ON categories_with_products TO anon, authenticated;
