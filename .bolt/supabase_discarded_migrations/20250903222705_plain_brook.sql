@@ .. @@
 -- ========= DATOS DE PRUEBA PARA TESTING =========
 
 -- Insertar ubicaciones básicas
 INSERT INTO public.ubicaciones (nombre) VALUES 
   ('bodega'),
   ('barra')
 ON CONFLICT (nombre) DO NOTHING;
 
 -- Insertar productos de prueba
 INSERT INTO public.productos (nombre, costo_unitario, capacidad_ml_por_unidad, es_receta, id_producto_externo) VALUES 
   ('Agua Mineral', 10, 355, false, 'AGUA-01'),
   ('Margarita', 0, 1, true, 'MARG-01')
 ON CONFLICT (nombre) DO NOTHING;
 
 -- Insertar inventario inicial para testing
 INSERT INTO public.inventario (producto_id, ubicacion_id, cantidad_ml) VALUES 
   -- Agua Mineral en bodega (10 botellas = 3550ml)
   ((SELECT id FROM public.productos WHERE nombre = 'Agua Mineral'), 
    (SELECT id FROM public.ubicaciones WHERE nombre = 'bodega'), 
    3550),
   -- Agua Mineral en barra (5 botellas = 1775ml)
   ((SELECT id FROM public.productos WHERE nombre = 'Agua Mineral'), 
    (SELECT id FROM public.ubicaciones WHERE nombre = 'barra'), 
    1775),
   -- Margarita en barra (cantidad base para recetas)
   ((SELECT id FROM public.productos WHERE nombre = 'Margarita'), 
    (SELECT id FROM public.ubicaciones WHERE nombre = 'barra'), 
    2000)
 ON CONFLICT (producto_id, ubicacion_id) DO NOTHING;
+
+-- ========= VALIDACIONES Y VERIFICACIONES =========
+
+-- Función para validar la integridad de los datos
+DO $$
+BEGIN
+  -- Verificar que las ubicaciones fueron creadas
+  IF (SELECT COUNT(*) FROM public.ubicaciones) < 2 THEN
+    RAISE EXCEPTION 'Error: No se crearon las ubicaciones requeridas';
+  END IF;
+  
+  -- Verificar que los productos fueron creados
+  IF (SELECT COUNT(*) FROM public.productos) < 2 THEN
+    RAISE EXCEPTION 'Error: No se crearon los productos requeridos';
+  END IF;
+  
+  -- Verificar que el inventario fue creado
+  IF (SELECT COUNT(*) FROM public.inventario) < 3 THEN
+    RAISE EXCEPTION 'Error: No se creó el inventario inicial';
+  END IF;
+  
+  -- Verificar que las políticas RLS están activas
+  IF NOT EXISTS (
+    SELECT 1 FROM pg_policies 
+    WHERE tablename IN ('ubicaciones', 'productos', 'inventario')
+  ) THEN
+    RAISE EXCEPTION 'Error: Las políticas RLS no están configuradas correctamente';
+  END IF;
+  
+  RAISE NOTICE 'MIGRACIÓN PILLAR 1 COMPLETADA EXITOSAMENTE';
+  RAISE NOTICE 'Ubicaciones creadas: %', (SELECT COUNT(*) FROM public.ubicaciones);
+  RAISE NOTICE 'Productos creados: %', (SELECT COUNT(*) FROM public.productos);
+  RAISE NOTICE 'Registros de inventario: %', (SELECT COUNT(*) FROM public.inventario);
+  RAISE NOTICE 'Stock total en sistema: % ml', (SELECT SUM(cantidad_ml) FROM public.inventario);
+END $$;