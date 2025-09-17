/*
  # Create Transacciones Table for Accounting Ledger

  1. New Tables
    - `transacciones`
      - `id_transaccion` (serial, primary key) - Auto-incrementing unique identifier
      - `timestamp` (timestamptz) - Transaction timestamp with timezone
      - `tipo_transaccion` (text) - Type of transaction
      - `origen_tipo` (text) - Origin type from nested origen object
      - `origen_nombre` (text) - Origin name from nested origen object
      - `producto_nombre` (text) - Product name from nested producto object
      - `producto_destilado` (text) - Product destilado from nested producto object
      - `movimiento_cantidad` (numeric) - Movement quantity (units or ml)
      - `movimiento_unidad` (text) - Unit type (unidades or ml)
      - `operacion` (text) - Operation type
      - `origen_movimiento` (text) - Movement origin location
      - `destino_movimiento` (text) - Movement destination location
      - `costo_transaccion` (numeric) - Transaction cost
      - `precio_venta_receta` (numeric) - Recipe sale price
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `transacciones` table
    - Add policies for authenticated and anonymous users to allow all operations
    - Add index on timestamp for performance

  3. Features
    - Auto-incrementing transaction ID
    - Comprehensive transaction logging
    - Flat structure for easy querying and reporting
    - Timezone-aware timestamps
*/

CREATE TABLE IF NOT EXISTS transacciones (
  id_transaccion SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  tipo_transaccion TEXT NOT NULL,
  origen_tipo TEXT,
  origen_nombre TEXT,
  producto_nombre TEXT NOT NULL,
  producto_destilado TEXT NOT NULL,
  movimiento_cantidad NUMERIC NOT NULL,
  movimiento_unidad TEXT NOT NULL DEFAULT 'unidades',
  operacion TEXT NOT NULL,
  origen_movimiento TEXT,
  destino_movimiento TEXT,
  costo_transaccion NUMERIC DEFAULT 0,
  precio_venta_receta NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE transacciones ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated operations on transacciones"
  ON transacciones
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for anonymous users (for webhook access)
CREATE POLICY "Allow anon operations on transacciones"
  ON transacciones
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create index on timestamp for performance
CREATE INDEX IF NOT EXISTS idx_transacciones_timestamp 
  ON transacciones (timestamp DESC);

-- Create index on transaction type for filtering
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo 
  ON transacciones (tipo_transaccion);

-- Create index on product for filtering
CREATE INDEX IF NOT EXISTS idx_transacciones_producto 
  ON transacciones (producto_nombre, producto_destilado);