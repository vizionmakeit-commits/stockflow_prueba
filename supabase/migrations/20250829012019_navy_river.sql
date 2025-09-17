/*
  # Transaction System Final Adjustments

  1. Database Schema Changes
    - Remove `precio_venta_receta` column from transacciones table
    - Verify `timestamp` column is DATE type for YYYY-MM-DD format
    - Add `id_venta` column (BIGINT) after `id_transaccion`

  2. Sales ID Management
    - Create sequence for unique consecutive sales IDs
    - Add function to generate sales IDs based on business rules
    - Add trigger to automatically assign sales IDs

  3. Business Rules
    - Sales: Update_Receta transactions OR salida_stock to barra
    - Non-sales: entrada_stock, transferencia, ajuste_inventario
    - Recipe ingredients share same id_venta
*/

-- Step 1: Remove precio_venta_receta column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacciones' AND column_name = 'precio_venta_receta'
  ) THEN
    ALTER TABLE transacciones DROP COLUMN precio_venta_receta;
  END IF;
END $$;

-- Step 2: Ensure timestamp is DATE type
DO $$
BEGIN
  -- Check if timestamp column exists and is not DATE type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacciones' 
    AND column_name = 'timestamp' 
    AND data_type != 'date'
  ) THEN
    -- Convert existing timestamp data to date format and change column type
    ALTER TABLE transacciones 
    ALTER COLUMN timestamp TYPE DATE USING timestamp::DATE;
  END IF;
END $$;

-- Step 3: Add id_venta column after id_transaccion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transacciones' AND column_name = 'id_venta'
  ) THEN
    ALTER TABLE transacciones ADD COLUMN id_venta BIGINT;
  END IF;
END $$;

-- Step 4: Create sequence for sales IDs
CREATE SEQUENCE IF NOT EXISTS sales_id_seq START 1;

-- Step 5: Create function to determine if transaction is a sale
CREATE OR REPLACE FUNCTION is_sale_transaction(
  p_tipo_transaccion TEXT,
  p_operacion TEXT,
  p_destino_movimiento TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Sales Definition:
  -- 1. Any transaction from "Update_Recetas" module
  -- 2. Any transaction from "Update_Unidades" where operacion is 'salida_stock' AND destino is 'barra'
  
  IF p_tipo_transaccion = 'Update_Recetas' THEN
    RETURN TRUE;
  END IF;
  
  IF p_tipo_transaccion = 'Update_Unidades' 
     AND p_operacion = 'salida_stock' 
     AND p_destino_movimiento = 'barra' THEN
    RETURN TRUE;
  END IF;
  
  -- All other cases are not sales
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create function to assign sales ID
CREATE OR REPLACE FUNCTION assign_sales_id() RETURNS TRIGGER AS $$
DECLARE
  current_sale_id BIGINT;
  batch_timestamp DATE;
  batch_origen_nombre TEXT;
BEGIN
  -- Only process if this is a sale transaction
  IF is_sale_transaction(NEW.tipo_transaccion, NEW.operacion, NEW.destino_movimiento) THEN
    
    -- For recipe sales, check if there's already a sale ID for this batch
    -- (same timestamp, same origen_nombre, same tipo_transaccion)
    IF NEW.tipo_transaccion = 'Update_Recetas' THEN
      SELECT id_venta INTO current_sale_id
      FROM transacciones 
      WHERE timestamp = NEW.timestamp
        AND origen_nombre = NEW.origen_nombre
        AND tipo_transaccion = NEW.tipo_transaccion
        AND id_venta IS NOT NULL
      LIMIT 1;
      
      -- If found, use the existing sale ID for this recipe batch
      IF current_sale_id IS NOT NULL THEN
        NEW.id_venta := current_sale_id;
        RETURN NEW;
      END IF;
    END IF;
    
    -- Generate new sale ID
    NEW.id_venta := nextval('sales_id_seq');
  ELSE
    -- Not a sale transaction, set id_venta to null
    NEW.id_venta := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to automatically assign sales IDs
DROP TRIGGER IF EXISTS assign_sales_id_trigger ON transacciones;
CREATE TRIGGER assign_sales_id_trigger
  BEFORE INSERT ON transacciones
  FOR EACH ROW
  EXECUTE FUNCTION assign_sales_id();

-- Step 8: Add index for efficient sales ID queries
CREATE INDEX IF NOT EXISTS idx_transacciones_id_venta ON transacciones(id_venta) WHERE id_venta IS NOT NULL;

-- Step 9: Add index for sales batch detection
CREATE INDEX IF NOT EXISTS idx_transacciones_sales_batch ON transacciones(timestamp, origen_nombre, tipo_transaccion) WHERE id_venta IS NOT NULL;