/*
  # Transaction System Final Adjustments

  1. Schema Changes
    - Remove `precio_venta_receta` column from transacciones table
    - Add `id_venta` column (BIGINT) after `id_transaccion`
    - Verify `timestamp` column is DATE type for YYYY-MM-DD format

  2. Business Logic
    - Implement sales ID assignment trigger function
    - Sales get unique consecutive id_venta
    - Non-sales get id_venta = null
    - Recipe ingredients share same id_venta

  3. Sales Definition
    - Update_Receta transactions (all are sales)
    - Update_Unidades with operacion='salida_stock' AND destino='barra'
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
    ALTER TABLE transacciones ALTER COLUMN timestamp TYPE DATE USING timestamp::DATE;
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
CREATE SEQUENCE IF NOT EXISTS sales_id_sequence START 1;

-- Step 5: Create function to assign sales IDs
CREATE OR REPLACE FUNCTION assign_sales_id()
RETURNS TRIGGER AS $$
DECLARE
  is_sale BOOLEAN := FALSE;
  current_sale_id BIGINT;
BEGIN
  -- Determine if this transaction is a sale
  IF NEW.tipo_transaccion = 'Update_Recetas' THEN
    is_sale := TRUE;
  ELSIF NEW.tipo_transaccion = 'Update_Unidades' 
    AND NEW.operacion = 'salida_stock' 
    AND NEW.destino_movimiento = 'barra' THEN
    is_sale := TRUE;
  END IF;

  -- Assign id_venta based on sale status
  IF is_sale THEN
    -- For recipe sales, check if there's already a sale ID for this batch
    -- This handles the case where multiple ingredients from the same recipe
    -- are inserted in the same transaction batch
    IF NEW.tipo_transaccion = 'Update_Recetas' AND NEW.origen_nombre IS NOT NULL THEN
      -- Look for existing sale ID from the same recipe in recent transactions (last 5 minutes)
      SELECT id_venta INTO current_sale_id
      FROM transacciones 
      WHERE tipo_transaccion = 'Update_Recetas'
        AND origen_nombre = NEW.origen_nombre
        AND created_at >= NOW() - INTERVAL '5 minutes'
        AND id_venta IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1;
      
      -- If found, use the same sale ID; otherwise generate new one
      IF current_sale_id IS NOT NULL THEN
        NEW.id_venta := current_sale_id;
      ELSE
        NEW.id_venta := nextval('sales_id_sequence');
      END IF;
    ELSE
      -- For unit sales, always generate new sale ID
      NEW.id_venta := nextval('sales_id_sequence');
    END IF;
  ELSE
    -- Not a sale, set id_venta to null
    NEW.id_venta := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to automatically assign sales IDs
DROP TRIGGER IF EXISTS assign_sales_id_trigger ON transacciones;
CREATE TRIGGER assign_sales_id_trigger
  BEFORE INSERT ON transacciones
  FOR EACH ROW
  EXECUTE FUNCTION assign_sales_id();

-- Step 7: Add index for better performance on id_venta queries
CREATE INDEX IF NOT EXISTS idx_transacciones_id_venta 
ON transacciones (id_venta) 
WHERE id_venta IS NOT NULL;