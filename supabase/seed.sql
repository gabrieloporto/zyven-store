-- ============================================================================
-- SEED INICIAL DE DESARROLLO — ZYVEN STORE (Actualizado y Confirmado)
-- IMPORTANTE:
-- 1. Todos los precios y stocks son de demostración/desarrollo.
-- 2. Todos los productos y variantes se crean inicialmente en estado 'draft'.
-- 3. No ejecutar este seed en producción.
-- ============================================================================

DO $$
DECLARE
  v_wh_id UUID;
  v_cat_perfumes UUID;
  v_cat_tecnologia UUID;
  v_cat_indumentaria UUID;

  v_brand_jpg UUID;
  v_brand_valentino UUID;
  v_brand_rabanne UUID;
  v_brand_xerjoff UUID;
  v_brand_ch UUID;
  v_brand_onlyou UUID;
  v_brand_armani UUID;
  v_brand_apple UUID;
  v_brand_jbl UUID;
  v_brand_nike UUID;

  v_prod_id UUID;
  v_var_id UUID;
  rec RECORD;
  v_color RECORD;
BEGIN
  SELECT id INTO v_wh_id FROM public.warehouses WHERE code = 'ALEJANDRO_KORN' LIMIT 1;

  -- 1. Categorías iniciales
  INSERT INTO public.categories (name, slug, description, sort_order, suggested_attribute_keys)
  VALUES
    ('Perfumes', 'perfumes', 'Fragancias internacionales y perfumes originales.', 1, '["volumen_ml", "concentracion", "familia_olfativa", "genero"]'::jsonb),
    ('Tecnología', 'tecnologia', 'Auriculares, parlantes portátiles, cargadores y accesorios tecnológicos.', 2, '["modelo", "conectividad", "conector", "compatibilidad"]'::jsonb),
    ('Indumentaria', 'indumentaria', 'Prendas deportivas y urbanas.', 3, '["material", "calce", "temporada"]'::jsonb)
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_cat_perfumes FROM public.categories WHERE slug = 'perfumes';
  SELECT id INTO v_cat_tecnologia FROM public.categories WHERE slug = 'tecnologia';
  SELECT id INTO v_cat_indumentaria FROM public.categories WHERE slug = 'indumentaria';

  -- 2. Marcas iniciales
  INSERT INTO public.brands (name, slug)
  VALUES
    ('Jean Paul Gaultier', 'jean-paul-gaultier'),
    ('Valentino', 'valentino'),
    ('Paco Rabanne', 'paco-rabanne'),
    ('Xerjoff', 'xerjoff'),
    ('Carolina Herrera', 'carolina-herrera'),
    ('Onlyou', 'onlyou'),
    ('Emporio Armani', 'emporio-armani'),
    ('Apple', 'apple'),
    ('JBL', 'jbl'),
    ('Nike', 'nike')
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_brand_jpg FROM public.brands WHERE slug = 'jean-paul-gaultier';
  SELECT id INTO v_brand_valentino FROM public.brands WHERE slug = 'valentino';
  SELECT id INTO v_brand_rabanne FROM public.brands WHERE slug = 'paco-rabanne';
  SELECT id INTO v_brand_xerjoff FROM public.brands WHERE slug = 'xerjoff';
  SELECT id INTO v_brand_ch FROM public.brands WHERE slug = 'carolina-herrera';
  SELECT id INTO v_brand_onlyou FROM public.brands WHERE slug = 'onlyou';
  SELECT id INTO v_brand_armani FROM public.brands WHERE slug = 'emporio-armani';
  SELECT id INTO v_brand_apple FROM public.brands WHERE slug = 'apple';
  SELECT id INTO v_brand_jbl FROM public.brands WHERE slug = 'jbl';
  SELECT id INTO v_brand_nike FROM public.brands WHERE slug = 'nike';

  -- 3. Productos con variante simple / principal
  FOR rec IN
    SELECT * FROM (
      VALUES
        -- PERFUMES (10 productos confirmados)
        (v_cat_perfumes, v_brand_jpg, 'Jean Paul Gaultier Le Male Elixir EDP 100 ml', 'jpg-le-male-elixir-edp-100ml', 'ZYV-PERF-JPG-ELIX-100', '100 ml', false, '["Presentación"]'::jsonb, '{"Presentación": "100 ml"}'::jsonb, '{"volumen_ml": 100, "concentracion": "Eau de Parfum Elixir"}'::jsonb, 250000::bigint, 2, true, false, 'none', true, NULL::text, 450),
        (v_cat_perfumes, v_brand_jpg, 'Jean Paul Gaultier Le Male EDP 100 ml', 'jpg-le-male-edp-100ml', 'ZYV-PERF-JPG-LMEDP-100', '100 ml', false, '["Presentación"]'::jsonb, '{"Presentación": "100 ml"}'::jsonb, '{"volumen_ml": 100, "concentracion": "Eau de Parfum"}'::jsonb, 210000::bigint, 3, true, false, 'none', true, NULL::text, 450),
        (v_cat_perfumes, v_brand_jpg, 'Jean Paul Gaultier Le Beau Le Parfum 100 ml', 'jpg-le-beau-le-parfum-100ml', 'ZYV-PERF-JPG-LBLP-100', '100 ml', false, '["Presentación"]'::jsonb, '{"Presentación": "100 ml"}'::jsonb, '{"volumen_ml": 100, "concentracion": "Le Parfum"}'::jsonb, 270000::bigint, 2, true, false, 'none', true, NULL::text, 450),
        (v_cat_perfumes, v_brand_valentino, 'Valentino Uomo Born in Roma Intense 100 ml', 'valentino-uomo-born-in-roma-intense-100ml', 'ZYV-PERF-VAL-BIRI-100', '100 ml', false, '["Presentación"]'::jsonb, '{"Presentación": "100 ml"}'::jsonb, '{"volumen_ml": 100, "concentracion": "Eau de Parfum Intense"}'::jsonb, 230000::bigint, 2, true, false, 'none', true, NULL::text, 460),
        (v_cat_perfumes, v_brand_xerjoff, 'Xerjoff Erba Pura con pañuelo 100 ml', 'xerjoff-erba-pura-con-panuelo-100ml', 'ZYV-PERF-XER-ERBA-100', '100 ml con pañuelo', false, '["Presentación"]'::jsonb, '{"Presentación": "100 ml con pañuelo"}'::jsonb, '{"volumen_ml": 100, "concentracion": "Eau de Parfum", "incluye_panuelo": true}'::jsonb, 360000::bigint, 2, true, false, 'none', true, NULL::text, 600),
        (v_cat_perfumes, v_brand_xerjoff, 'Xerjoff Purple Accento 100 ml', 'xerjoff-purple-accento-100ml', 'ZYV-PERF-XER-PACC-100', '100 ml', false, '["Presentación"]'::jsonb, '{"Presentación": "100 ml"}'::jsonb, '{"volumen_ml": 100, "concentracion": "Eau de Parfum"}'::jsonb, 390000::bigint, 1, true, false, 'none', true, NULL::text, 600),
        (v_cat_perfumes, v_brand_onlyou, 'Onlyou Perfume Collection Ref. B976-2 EDP 100 ml', 'onlyou-perfume-collection-ref-b976-2-100ml', 'ZYV-PERF-OY-B976-100', '100 ml', false, '["Presentación"]'::jsonb, '{"Presentación": "100 ml"}'::jsonb, '{"volumen_ml": 100, "concentracion": "Eau de Parfum", "referencia": "B976-2", "inspiracion": "Phantom Brown"}'::jsonb, 160000::bigint, 2, true, false, 'none', true, NULL::text, 430),
        (v_cat_perfumes, v_brand_armani, 'Emporio Armani Stronger With You Intensely Eau de Parfum 100 ml', 'emporio-armani-stronger-with-you-intensely-edp-100ml', 'ZYV-PERF-EA-SWYI-100', '100 ml', false, '["Presentación"]'::jsonb, '{"Presentación": "100 ml"}'::jsonb, '{"volumen_ml": 100, "concentracion": "Eau de Parfum", "familia_olfativa": "Oriental Fougère"}'::jsonb, 220000::bigint, 2, true, false, 'none', true, NULL::text, 440),
        (v_cat_perfumes, v_brand_rabanne, 'Paco Rabanne One Million 100 ml', 'paco-rabanne-one-million-100ml', 'ZYV-PERF-PR-1MIL-100', '100 ml', false, '["Presentación"]'::jsonb, '{"Presentación": "100 ml"}'::jsonb, '{"volumen_ml": 100, "concentracion": "Eau de Toilette"}'::jsonb, 200000::bigint, 3, true, false, 'none', true, NULL::text, 440),
        (v_cat_perfumes, v_brand_ch, 'Carolina Herrera Bad Boy Eau de Parfum 110 ml', 'carolina-herrera-bad-boy-edp-110ml', 'ZYV-PERF-CH-BBOY-110', '110 ml', false, '["Presentación"]'::jsonb, '{"Presentación": "110 ml"}'::jsonb, '{"volumen_ml": 110, "concentracion": "Eau de Parfum"}'::jsonb, 210000::bigint, 2, true, false, 'none', true, NULL::text, 480),

        -- TECNOLOGÍA (3 simples + JBL GO 4 con 6 variantes de color más abajo)
        (v_cat_tecnologia, v_brand_apple, 'Cable USB-C para iPhone de 1 metro', 'cable-usb-c-para-iphone-1m', 'ZYV-TEC-CBL-USBC-1M', '1 metro', false, '["Largo"]'::jsonb, '{"Largo": "1 metro"}'::jsonb, '{"longitud_m": 1, "conector": "USB-C", "compatibilidad": "iPhone"}'::jsonb, 12000::bigint, 10, false, false, 'none', true, NULL::text, 80),
        (v_cat_tecnologia, v_brand_apple, 'Cargador portátil inalámbrico MagSafe para iPhone', 'cargador-portatil-inalambrico-magsafe-iphone', 'ZYV-TEC-MAGSAFE-BAT', 'Estándar', false, '[]'::jsonb, '{}'::jsonb, '{"tecnologia": "MagSafe inalámbrico", "compatibilidad": "iPhone"}'::jsonb, 35000::bigint, 4, false, true, 'standalone_powerbank', true, NULL::text, 220),
        (v_cat_tecnologia, v_brand_apple, 'AirPods Pro de tercera generación', 'airpods-pro-tercera-generacion', 'ZYV-TEC-AIRPODS-PRO3', 'Blanco', false, '[]'::jsonb, '{}'::jsonb, '{"generacion": "3.ª generación", "conectividad": "Bluetooth"}'::jsonb, 350000::bigint, 2, false, true, 'contained_in_equipment', true, NULL::text, 200),

        -- INDUMENTARIA (1 producto)
        (v_cat_indumentaria, v_brand_nike, 'Remera Nike Pro Dri-FIT Tight Top', 'remera-nike-pro-dri-fit-tight-top', 'ZYV-IND-NIKE-PRO-M', 'Talle M', true, '["Talle", "Color"]'::jsonb, '{"Talle": "M"}'::jsonb, '{"tecnologia_tela": "Dri-FIT", "calce": "Tight Fit"}'::jsonb, 65000::bigint, 3, false, false, 'none', true, NULL::text, 200)
    ) AS t(
      category_id, brand_id, name, slug, sku, variant_title, has_variants,
      option_names, option_values, attributes, price_pesos, demo_stock,
      flammable, lithium, lithium_type, name_confirmed, review_notes, weight_grams
    )
  LOOP
    INSERT INTO public.products (
      category_id, brand_id, name, slug, status, has_variants,
      option_names, attributes, contains_flammable_liquid,
      contains_lithium_battery, lithium_battery_type,
      requires_special_packaging, commercial_name_confirmed, quality_review_notes
    ) VALUES (
      rec.category_id, rec.brand_id, rec.name, rec.slug, 'draft', rec.has_variants,
      rec.option_names, rec.attributes, rec.flammable,
      rec.lithium, rec.lithium_type,
      (rec.flammable OR rec.lithium), rec.name_confirmed, rec.review_notes
    )
    ON CONFLICT (slug) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_prod_id;

    INSERT INTO public.product_variants (
      product_id, sku, title, is_default, status,
      price_centavos, option_values, weight_grams
    ) VALUES (
      v_prod_id, rec.sku, rec.variant_title, true, 'draft',
      rec.price_pesos * 100, rec.option_values, rec.weight_grams
    )
    ON CONFLICT (sku) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_var_id;

    INSERT INTO public.inventory_levels (
      variant_id, warehouse_id, on_hand, reserved, low_stock_threshold
    ) VALUES (
      v_var_id, v_wh_id, rec.demo_stock, 0, 2
    )
    ON CONFLICT (variant_id) DO NOTHING;

    INSERT INTO public.inventory_movements (
      variant_id, warehouse_id, movement_type, quantity_delta,
      on_hand_before, on_hand_after, reserved_before, reserved_after,
      reference_type, idempotency_key, reason
    ) VALUES (
      v_var_id, v_wh_id, 'initial_seed', rec.demo_stock,
      0, rec.demo_stock, 0, 0,
      'seed', 'seed-init:' || rec.sku, 'Stock inicial de demostración (borrador)'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;

  -- 4. Parlante Bluetooth portátil JBL GO 4 Pro con sus 6 variantes de color (Negro, Blanco, Azul, Rojo, Violeta, Rosa)
  INSERT INTO public.products (
    category_id, brand_id, name, slug, status, has_variants,
    option_names, attributes, contains_flammable_liquid,
    contains_lithium_battery, lithium_battery_type,
    requires_special_packaging, commercial_name_confirmed
  ) VALUES (
    v_cat_tecnologia, v_brand_jbl, 'Parlante Bluetooth portátil JBL GO 4 Pro',
    'parlante-bluetooth-portatil-jbl-go-4-pro', 'draft', true,
    '["Color"]'::jsonb, '{"modelo": "GO 4 Pro", "conectividad": "Bluetooth"}'::jsonb,
    false, true, 'contained_in_equipment', true, true
  )
  ON CONFLICT (slug) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_prod_id;

  FOR v_color IN
    SELECT * FROM (
      VALUES
        ('ZYV-TEC-JBL-GO4P-BLK', 'Negro',   '{"Color": "Negro"}'::jsonb,   true,  1),
        ('ZYV-TEC-JBL-GO4P-WHT', 'Blanco',  '{"Color": "Blanco"}'::jsonb,  false, 2),
        ('ZYV-TEC-JBL-GO4P-BLU', 'Azul',    '{"Color": "Azul"}'::jsonb,    false, 3),
        ('ZYV-TEC-JBL-GO4P-RED', 'Rojo',    '{"Color": "Rojo"}'::jsonb,    false, 4),
        ('ZYV-TEC-JBL-GO4P-VIO', 'Violeta', '{"Color": "Violeta"}'::jsonb, false, 5),
        ('ZYV-TEC-JBL-GO4P-PNK', 'Rosa',    '{"Color": "Rosa"}'::jsonb,    false, 6)
    ) AS c(sku, color_name, opt_val, is_def, s_order)
  LOOP
    INSERT INTO public.product_variants (
      product_id, sku, title, is_default, status,
      price_centavos, option_values, weight_grams, sort_order
    ) VALUES (
      v_prod_id, v_color.sku, v_color.color_name, v_color.is_def, 'draft',
      9000000, v_color.opt_val, 320, v_color.s_order
    )
    ON CONFLICT (sku) DO UPDATE
      SET title = EXCLUDED.title,
          option_values = EXCLUDED.option_values,
          sort_order = EXCLUDED.sort_order,
          updated_at = now()
    RETURNING id INTO v_var_id;

    INSERT INTO public.inventory_levels (
      variant_id, warehouse_id, on_hand, reserved, low_stock_threshold
    ) VALUES (
      v_var_id, v_wh_id, 4, 0, 2
    )
    ON CONFLICT (variant_id) DO NOTHING;

    INSERT INTO public.inventory_movements (
      variant_id, warehouse_id, movement_type, quantity_delta,
      on_hand_before, on_hand_after, reserved_before, reserved_after,
      reference_type, idempotency_key, reason
    ) VALUES (
      v_var_id, v_wh_id, 'initial_seed', 4,
      0, 4, 0, 0,
      'seed', 'seed-init:' || v_color.sku, 'Stock inicial de demostración (borrador)'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;
END $$;
