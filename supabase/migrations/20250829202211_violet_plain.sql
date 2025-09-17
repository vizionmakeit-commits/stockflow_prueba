/*
  # Añadir campo id_usuario a tabla transacciones

  1. Modificación de Estructura
    - Añadir columna `id_usuario` tipo TEXT a la tabla `transacciones`
    - Campo obligatorio con valor por defecto 'admin_default'
    - Índice para optimizar consultas por usuario

  2. Compatibilidad
    - Mantiene todas las columnas existentes
    - No afecta datos existentes
    - Preparación para sistema multi-usuario
*/

-- Añadir columna id_usuario a la tabla transacciones
ALTER TABLE transacciones 
ADD COLUMN id_usuario TEXT NOT NULL DEFAULT 'admin_default';

-- Crear índice para optimizar consultas por usuario
CREATE INDEX idx_transacciones_id_usuario ON transacciones (id_usuario);

-- Comentario para documentar el cambio
COMMENT ON COLUMN transacciones.id_usuario IS 'Identificador del usuario que realizó la transacción. Valor por defecto: admin_default';