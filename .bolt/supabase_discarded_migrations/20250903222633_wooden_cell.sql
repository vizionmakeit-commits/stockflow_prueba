@@ .. @@
 INSERT INTO public.productos (nombre, costo_unitario, capacidad_ml_por_unidad, es_receta, id_producto_externo) VALUES
   ('Agua Mineral', 10, 355, false, 'AGUA-01'),
   ('Margarita', 0, 1, true, 'MARG-01')
 ON CONFLICT (nombre) DO NOTHING;
+
+-- ========= DATOS INICIALES: INVENTARIO =========
+-- Crear stock inicial para testing del endpoint de ventas
+-- Nota: Se usan subconsultas para obtener los IDs de productos y ubicaciones
+
+INSERT INTO public.inventario (producto_id, ubicacion_id, cantidad_ml) VALUES
+  -- Agua Mineral en bodega: 10 botellas × 355ml = 3,550ml
+  (
+    (SELECT id FROM public.productos WHERE nombre = 'Agua Mineral'),
+    (SELECT id FROM public.ubicaciones WHERE nombre = 'bodega'),
+    3550
+  ),
+  -- Agua Mineral en barra: 5 botellas × 355ml = 1,775ml
+  (
+    (SELECT id FROM public.productos WHERE nombre = 'Agua Mineral'),
+    (SELECT id FROM public.ubicaciones WHERE nombre = 'barra'),
+    1775
+  ),
+  -- Margarita en barra: 2000ml disponibles para preparar
+  (
+    (SELECT id FROM public.productos WHERE nombre = 'Margarita'),
+    (SELECT id FROM public.ubicaciones WHERE nombre = 'barra'),
+    2000
+  )
+ON CONFLICT (producto_id, ubicacion_id) DO NOTHING;