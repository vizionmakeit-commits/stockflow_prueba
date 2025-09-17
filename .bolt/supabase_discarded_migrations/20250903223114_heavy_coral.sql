/*
  # Insertar datos de prueba para Pillar 1

  1. Datos de prueba
    - Inserta ubicaciones básicas: 'bodega' y 'barra'
    - Inserta productos de prueba: 'Agua Mineral' (simple) y 'Margarita' (receta)
    - Inserta inventario inicial con stock realista para testing

  2. Características
    - Usa ON CONFLICT DO NOTHING para evitar duplicados en ubicaciones y productos
    - Usa ON CONFLICT DO UPDATE para actualizar inventario existente
    - Utiliza subconsultas para obtener IDs dinámicamente
    - Stock inicial preparado para testing del endpoint de ventas
*/

-- Insertar las ubicaciones base si no existen
INSERT INTO public.ubicaciones (nombre)
VALUES
    ('bodega'),
    ('barra')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar los productos de prueba si no existen
INSERT INTO public.productos (nombre, costo_unitario, capacidad_ml_por_unidad, es_receta, id_producto_externo)
VALUES
    ('Agua Mineral', 10, 355, false, 'AGUA-01'),
    ('Margarita', 0, 1, true, 'MARG-01')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar el inventario inicial asegurando que las filas de producto y ubicación existan
-- Usamos ON CONFLICT para poder re-ejecutarlo. Actualizará el stock si ya existe.
INSERT INTO public.inventario (producto_id, ubicacion_id, cantidad_ml)
SELECT
    p.id AS producto_id,
    u.id AS ubicacion_id,
    CASE
        WHEN p.nombre = 'Agua Mineral' AND u.nombre = 'bodega' THEN 3550 -- 10 botellas
        WHEN p.nombre = 'Agua Mineral' AND u.nombre = 'barra' THEN 1775  -- 5 botellas
        WHEN p.nombre = 'Margarita' AND u.nombre = 'barra' THEN 2000  -- 2000ml base
    END AS cantidad_ml
FROM
    productos p
CROSS JOIN
    ubicaciones u
WHERE
    (p.nombre = 'Agua Mineral' AND u.nombre IN ('bodega', 'barra')) OR
    (p.nombre = 'Margarita' AND u.nombre = 'barra')
ON CONFLICT (producto_id, ubicacion_id)
DO UPDATE SET
    cantidad_ml = EXCLUDED.cantidad_ml,
    updated_at = NOW();