import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Recipe {
  id: number;
  name: string;
  sale_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  product_name: string;
  destilado_name: string;
  quantity_ml: number;
  created_at: string;
}

export interface RecipeWithIngredients extends Recipe {
  recipe_ingredients: RecipeIngredient[];
}