-- Peso y dimensiones por producto, necesarios para cotizar y generar guías de
-- envío con mipaquete (peso en kg, dimensiones del empaque en cm).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight_kg numeric,
  ADD COLUMN IF NOT EXISTS length_cm numeric,
  ADD COLUMN IF NOT EXISTS width_cm  numeric,
  ADD COLUMN IF NOT EXISTS height_cm numeric;