-- Normalizador de nombres de producto: Title Case en español latino,
-- siglas técnicas en mayúscula, conectores en minúscula y tildes corregidas.
CREATE OR REPLACE FUNCTION public.normalizar_nombre_producto(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_words text[];
  w text;
  lw text;
  res text[] := '{}';
  i int := 0;
  siglas text[] := ARRAY['USB','RGB','ARGB','LED','LCD','OLED','QLED','SSD','HDD','RAM','DDR','HDMI','VGA','DVI','TV','PC','CPU','GPU','IPS','VA','TN','LAN','WAN','BT','NFC','GPS','ANC','ATX','PSU','KVM','POE','UPS','DPI','RPM','AIO','NVME','SATA','PCIE','FHD','UHD','HD','SD','QHD','ID','IP','AC','DC','RJ45','OTG','PS','XL','XXL','SKU','NIT','IA','AI','EVA','ABS','PVC','MP3','MP4','USD','COP','VR','AR','EU','US','OEM','KG','ML','CM','MM'];
  conectores text[] := ARRAY['de','del','la','las','el','los','y','o','u','con','para','por','en','a','al','un','una','unos','unas','sin','sobre','tipo'];
BEGIN
  IF p_name IS NULL THEN RETURN NULL; END IF;
  v_words := regexp_split_to_array(btrim(regexp_replace(p_name, '\s+', ' ', 'g')), ' ');
  IF v_words IS NULL THEN RETURN p_name; END IF;

  FOREACH w IN ARRAY v_words LOOP
    CONTINUE WHEN w = '';
    i := i + 1;
    lw := lower(w);

    -- Corrección ortográfica (español latino)
    lw := CASE lw
      WHEN 'inalambrico' THEN 'inalámbrico'
      WHEN 'inalambrica' THEN 'inalámbrica'
      WHEN 'inalambricos' THEN 'inalámbricos'
      WHEN 'inalambricas' THEN 'inalámbricas'
      WHEN 'camara' THEN 'cámara'
      WHEN 'camaras' THEN 'cámaras'
      WHEN 'termica' THEN 'térmica'
      WHEN 'termico' THEN 'térmico'
      WHEN 'termicas' THEN 'térmicas'
      WHEN 'termicos' THEN 'térmicos'
      WHEN 'portatil' THEN 'portátil'
      WHEN 'portatiles' THEN 'portátiles'
      WHEN 'bateria' THEN 'batería'
      WHEN 'baterias' THEN 'baterías'
      WHEN 'raton' THEN 'ratón'
      WHEN 'electrico' THEN 'eléctrico'
      WHEN 'electrica' THEN 'eléctrica'
      WHEN 'electricos' THEN 'eléctricos'
      WHEN 'electricas' THEN 'eléctricas'
      WHEN 'electronico' THEN 'electrónico'
      WHEN 'electronica' THEN 'electrónica'
      WHEN 'electronicos' THEN 'electrónicos'
      WHEN 'audifono' THEN 'audífono'
      WHEN 'audifonos' THEN 'audífonos'
      WHEN 'telefono' THEN 'teléfono'
      WHEN 'telefonos' THEN 'teléfonos'
      WHEN 'microfono' THEN 'micrófono'
      WHEN 'microfonos' THEN 'micrófonos'
      WHEN 'impresion' THEN 'impresión'
      WHEN 'television' THEN 'televisión'
      WHEN 'televisor' THEN 'televisor'
      WHEN 'mecanico' THEN 'mecánico'
      WHEN 'mecanica' THEN 'mecánica'
      WHEN 'magnetico' THEN 'magnético'
      WHEN 'magnetica' THEN 'magnética'
      WHEN 'plastico' THEN 'plástico'
      WHEN 'metalico' THEN 'metálico'
      WHEN 'automatico' THEN 'automático'
      WHEN 'automatica' THEN 'automática'
      WHEN 'hidraulico' THEN 'hidráulico'
      WHEN 'hidraulica' THEN 'hidráulica'
      WHEN 'multifuncion' THEN 'multifunción'
      WHEN 'refrigeracion' THEN 'refrigeración'
      WHEN 'iluminacion' THEN 'iluminación'
      WHEN 'conexion' THEN 'conexión'
      WHEN 'extension' THEN 'extensión'
      WHEN 'proteccion' THEN 'protección'
      WHEN 'presion' THEN 'presión'
      WHEN 'tension' THEN 'tensión'
      WHEN 'alimentacion' THEN 'alimentación'
      WHEN 'ventilacion' THEN 'ventilación'
      WHEN 'reproduccion' THEN 'reproducción'
      WHEN 'grabacion' THEN 'grabación'
      WHEN 'resolucion' THEN 'resolución'
      WHEN 'ergonomico' THEN 'ergonómico'
      WHEN 'ergonomica' THEN 'ergonómica'
      WHEN 'optico' THEN 'óptico'
      WHEN 'optica' THEN 'óptica'
      WHEN 'acustico' THEN 'acústico'
      WHEN 'acustica' THEN 'acústica'
      WHEN 'energia' THEN 'energía'
      WHEN 'garantia' THEN 'garantía'
      WHEN 'nino' THEN 'niño'
      WHEN 'ninos' THEN 'niños'
      WHEN 'nina' THEN 'niña'
      WHEN 'ninas' THEN 'niñas'
      WHEN 'numerico' THEN 'numérico'
      WHEN 'numerica' THEN 'numérica'
      WHEN 'ingles' THEN 'inglés'
      WHEN 'espanol' THEN 'español'
      WHEN 'movil' THEN 'móvil'
      WHEN 'moviles' THEN 'móviles'
      WHEN 'maquina' THEN 'máquina'
      WHEN 'rapido' THEN 'rápido'
      WHEN 'rapida' THEN 'rápida'
      WHEN 'basico' THEN 'básico'
      WHEN 'basica' THEN 'básica'
      WHEN 'clasico' THEN 'clásico'
      WHEN 'clasica' THEN 'clásica'
      WHEN 'practico' THEN 'práctico'
      WHEN 'practica' THEN 'práctica'
      WHEN 'unico' THEN 'único'
      WHEN 'unica' THEN 'única'
      WHEN 'multiple' THEN 'múltiple'
      WHEN 'estandar' THEN 'estándar'
      WHEN 'fotografia' THEN 'fotografía'
      WHEN 'aereo' THEN 'aéreo'
      WHEN 'aerea' THEN 'aérea'
      WHEN 'grafico' THEN 'gráfico'
      WHEN 'grafica' THEN 'gráfica'
      WHEN 'wifi' THEN 'wi-fi'
      ELSE lw
    END;

    IF upper(lw) = ANY(siglas) THEN
      res := res || upper(lw);
    ELSIF lw ~ '[0-9]' THEN
      res := res || upper(w);
    ELSIF i > 1 AND lw = ANY(conectores) THEN
      res := res || lw;
    ELSE
      res := res || initcap(lw);
    END IF;
  END LOOP;

  RETURN array_to_string(res, ' ');
END;
$$;

-- Trigger: cualquier producto que entre o se actualice queda normalizado,
-- venga del admin o de la sincronización con la hoja de inventario.
CREATE OR REPLACE FUNCTION public.products_normalizar_nombre()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.name := public.normalizar_nombre_producto(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_normalizar_nombre ON public.products;
CREATE TRIGGER trg_products_normalizar_nombre
BEFORE INSERT OR UPDATE OF name ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_normalizar_nombre();