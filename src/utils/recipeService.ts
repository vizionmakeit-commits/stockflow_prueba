import { supabase, Recipe, RecipeIngredient, RecipeWithIngredients } from './supabaseClient';

// Recipe CRUD Operations
export class RecipeService {
  
  // Create a new recipe
  static async createRecipe(name: string, salePrice?: number): Promise<Recipe | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .insert([
          { 
            name: name.trim(),
            sale_price: salePrice || null
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating recipe:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createRecipe:', error);
      return null;
    }
  }

  // Get all recipes
  static async getAllRecipes(): Promise<Recipe[]> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recipes:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllRecipes:', error);
      return [];
    }
  }

  // Get recipe with ingredients
  static async getRecipeWithIngredients(recipeId: number): Promise<RecipeWithIngredients | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (*)
        `)
        .eq('id', recipeId)
        .single();

      if (error) {
        console.error('Error fetching recipe with ingredients:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getRecipeWithIngredients:', error);
      return null;
    }
  }

  // Update recipe
  static async updateRecipe(id: number, name?: string, salePrice?: number): Promise<Recipe | null> {
    try {
      const updateData: Partial<Recipe> = {};
      if (name !== undefined) updateData.name = name.trim();
      if (salePrice !== undefined) updateData.sale_price = salePrice;

      const { data, error } = await supabase
        .from('recipes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating recipe:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateRecipe:', error);
      return null;
    }
  }

  // Delete recipe (ingredients will be deleted automatically due to CASCADE)
  static async deleteRecipe(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting recipe:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteRecipe:', error);
      return false;
    }
  }

  // Add ingredient to recipe
  static async addIngredient(
    recipeId: number, 
    productName: string, 
    destiladoName: string, 
    quantityMl: number
  ): Promise<RecipeIngredient | null> {
    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .insert([
          {
            recipe_id: recipeId,
            product_name: productName.trim(),
            destilado_name: destiladoName.trim(),
            quantity_ml: quantityMl
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error adding ingredient:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in addIngredient:', error);
      return null;
    }
  }

  // Update ingredient
  static async updateIngredient(
    id: number,
    productName?: string,
    destiladoName?: string,
    quantityMl?: number
  ): Promise<RecipeIngredient | null> {
    try {
      const updateData: Partial<RecipeIngredient> = {};
      if (productName !== undefined) updateData.product_name = productName.trim();
      if (destiladoName !== undefined) updateData.destilado_name = destiladoName.trim();
      if (quantityMl !== undefined) updateData.quantity_ml = quantityMl;

      const { data, error } = await supabase
        .from('recipe_ingredients')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating ingredient:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateIngredient:', error);
      return null;
    }
  }

  // Delete ingredient
  static async deleteIngredient(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting ingredient:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteIngredient:', error);
      return false;
    }
  }

  // Get ingredients for a recipe
  static async getRecipeIngredients(recipeId: number): Promise<RecipeIngredient[]> {
    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipeId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching recipe ingredients:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRecipeIngredients:', error);
      return [];
    }
  }
}