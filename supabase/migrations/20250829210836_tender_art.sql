/*
  # Create Alert Configuration Table

  1. New Tables
    - `configuracion_alertas`
      - `id` (integer, primary key)
      - `alerta_stock_critico_activada` (boolean, default false)
      - `alerta_ajuste_manual_activada` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `configuracion_alertas` table
    - Add policies for authenticated and anonymous users

  3. Initial Data
    - Insert default configuration row with both alerts disabled
*/

CREATE TABLE IF NOT EXISTS configuracion_alertas (
  id integer PRIMARY KEY DEFAULT 1,
  alerta_stock_critico_activada boolean DEFAULT false,
  alerta_ajuste_manual_activada boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE configuracion_alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon operations on configuracion_alertas"
  ON configuracion_alertas
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated operations on configuracion_alertas"
  ON configuracion_alertas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_configuracion_alertas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_configuracion_alertas_updated_at
  BEFORE UPDATE ON configuracion_alertas
  FOR EACH ROW
  EXECUTE FUNCTION update_configuracion_alertas_updated_at();

-- Insert initial configuration row
INSERT INTO configuracion_alertas (id, alerta_stock_critico_activada, alerta_ajuste_manual_activada)
VALUES (1, false, false)
ON CONFLICT (id) DO NOTHING;