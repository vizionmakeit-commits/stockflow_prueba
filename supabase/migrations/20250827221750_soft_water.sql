/*
  # Create Recipe Management Tables

  1. New Tables
    - `recipes`
      - `id` (integer, primary key, auto-increment)
      - `name` (text, unique, not null)
      - `sale_price` (numeric, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `recipe_ingredients`
      - `id` (integer, primary key, auto-increment)
      - `recipe_id` (foreign key to recipes.id, cascade delete)
      - `product_name` (text, not null)
      - `destilado_name` (text, not null)
      - `quantity_ml` (numeric, not null)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their data
*/

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  sale_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create recipe_ingredients table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  destilado_name TEXT NOT NULL,
  quantity_ml NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Create policies for recipes table
CREATE POLICY "Allow all operations on recipes"
  ON recipes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for recipe_ingredients table
CREATE POLICY "Allow all operations on recipe_ingredients"
  ON recipe_ingredients
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipes_updated_at 
    BEFORE UPDATE ON recipes 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();