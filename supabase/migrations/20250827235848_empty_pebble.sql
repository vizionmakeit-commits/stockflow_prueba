/*
  # Fix RLS policies for anon role access

  1. Security Updates
    - Drop existing restrictive policies
    - Create new policies that allow anon role operations
    - Enable operations for both recipes and recipe_ingredients tables
  
  2. Policy Changes
    - Allow anon role to perform all CRUD operations
    - Remove authentication requirement for basic operations
    - Maintain data integrity while allowing access
*/

-- Drop existing policies that might be blocking anon access
DROP POLICY IF EXISTS "Allow all operations on recipes" ON recipes;
DROP POLICY IF EXISTS "Allow all operations on recipe_ingredients" ON recipe_ingredients;

-- Create new policies for recipes table that allow anon role
CREATE POLICY "Allow anon operations on recipes"
  ON recipes
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create new policies for recipe_ingredients table that allow anon role  
CREATE POLICY "Allow anon operations on recipe_ingredients"
  ON recipe_ingredients
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Also allow authenticated users (for future use)
CREATE POLICY "Allow authenticated operations on recipes"
  ON recipes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated operations on recipe_ingredients"
  ON recipe_ingredients
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);