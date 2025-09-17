/*
  # Fix Row Level Security policies for recipes and recipe_ingredients tables

  1. Security Updates
    - Add proper RLS policies for authenticated users
    - Allow INSERT, SELECT, UPDATE, DELETE operations for authenticated users
    - Ensure both tables have appropriate access controls

  2. Tables affected
    - `recipes` - Allow all operations for authenticated users
    - `recipe_ingredients` - Allow all operations for authenticated users
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on recipes" ON recipes;
DROP POLICY IF EXISTS "Allow all operations on recipe_ingredients" ON recipe_ingredients;

-- Create comprehensive policies for recipes table
CREATE POLICY "Allow all operations on recipes"
  ON recipes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create comprehensive policies for recipe_ingredients table  
CREATE POLICY "Allow all operations on recipe_ingredients"
  ON recipe_ingredients
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled on both tables
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;