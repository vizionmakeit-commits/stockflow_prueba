@@ .. @@
 CREATE POLICY "Allow authenticated users to manage inventory" ON public.inventario FOR ALL TO authenticated USING (true);
+
+-- ========= DATOS DE PRUEBA INICIALES =========
+-- Insertar ubicaciones básicas requeridas para testing
+INSERT INTO public.ubicaciones (nombre) VALUES 
+  ('bodega'),
+  ('barra')
+ON CONFLICT (nombre) DO NOTHING;
+
+-- Insertar productos de prueba para testing del endpoint de ventas
+INSERT INTO public.productos (
+  nombre, 
+  costo_unitario, 
+  capacidad_ml_por_unidad, 
+  es_receta, 
+  id_producto_externo
+) VALUES 
+  -- Producto simple: Agua Mineral
+  (
+    'Agua Mineral',
+    10,
+    355,
+    false,
+    'AGUA-01'
+  ),
+  -- Producto receta: Margarita
+  (
+    'Margarita',
+    0,
+    1,
+    true,
+    'MARG-01'
+  )
+ON CONFLICT (nombre) DO NOTHING;