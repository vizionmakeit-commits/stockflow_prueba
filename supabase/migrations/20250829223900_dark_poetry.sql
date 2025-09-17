/*
  # Agregar configuración de reporte programado

  1. Nuevas Columnas
    - `reporte_reposicion_activado` (boolean) - Activa/desactiva el reporte programado
    - `reporte_frecuencia` (text) - Frecuencia: 'daily', 'weekly', 'biweekly', 'monthly'
    - `reporte_dia` (text) - Día específico según frecuencia
    - `reporte_hora` (text) - Hora de envío en formato HH:MM

  2. Valores por Defecto
    - Reporte desactivado por defecto
    - Frecuencia semanal por defecto
    - Lunes como día por defecto
    - 09:00 como hora por defecto

  3. Seguridad
    - Mantiene RLS existente
    - Mantiene políticas existentes
*/

-- Agregar columnas para configuración de reporte programado
DO $$
BEGIN
  -- Columna para activar/desactivar reporte
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracion_alertas' AND column_name = 'reporte_reposicion_activado'
  ) THEN
    ALTER TABLE configuracion_alertas 
    ADD COLUMN reporte_reposicion_activado BOOLEAN DEFAULT false;
  END IF;

  -- Columna para frecuencia del reporte
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracion_alertas' AND column_name = 'reporte_frecuencia'
  ) THEN
    ALTER TABLE configuracion_alertas 
    ADD COLUMN reporte_frecuencia TEXT DEFAULT 'weekly';
  END IF;

  -- Columna para día específico
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracion_alertas' AND column_name = 'reporte_dia'
  ) THEN
    ALTER TABLE configuracion_alertas 
    ADD COLUMN reporte_dia TEXT DEFAULT 'monday';
  END IF;

  -- Columna para hora de envío
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'configuracion_alertas' AND column_name = 'reporte_hora'
  ) THEN
    ALTER TABLE configuracion_alertas 
    ADD COLUMN reporte_hora TEXT DEFAULT '09:00';
  END IF;
END $$;

-- Actualizar el registro existente con valores por defecto si no existen
UPDATE configuracion_alertas 
SET 
  reporte_reposicion_activado = COALESCE(reporte_reposicion_activado, false),
  reporte_frecuencia = COALESCE(reporte_frecuencia, 'weekly'),
  reporte_dia = COALESCE(reporte_dia, 'monday'),
  reporte_hora = COALESCE(reporte_hora, '09:00')
WHERE id = 1;