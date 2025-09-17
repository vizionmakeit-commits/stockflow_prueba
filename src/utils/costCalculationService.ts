import { fetchInventoryData } from './googleSheets';
import { InventoryItem } from '../types/inventory';

export interface IngredientCost {
  productName: string;
  destiladoName: string;
  quantityMl: number;
  unitCost: number;
  bottleCapacity: number;
  ingredientCost: number;
}

export class CostCalculationService {
  private static inventoryCache: InventoryItem[] = [];
  private static lastCacheUpdate: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get inventory data with caching
  private static async getInventoryData(): Promise<InventoryItem[]> {
    const now = Date.now();
    
    // Only fetch if cache is empty or expired, and not currently fetching
    if ((this.inventoryCache.length === 0 || (now - this.lastCacheUpdate) > this.CACHE_DURATION)) {
      try {
        console.log('Fetching inventory data for cost calculation...');
        this.inventoryCache = await fetchInventoryData();
        this.lastCacheUpdate = now;
        console.log('Inventory data cached successfully:', this.inventoryCache.length, 'items');
      } catch (error) {
        console.error('Error fetching inventory data for cost calculation:', error);
        // Return cached data if available, otherwise empty array
        return this.inventoryCache;
      }
    }
    
    return this.inventoryCache;
  }

  // Find product in inventory
  private static findProduct(inventory: InventoryItem[], productName: string, destiladoName: string): InventoryItem | null {
    return inventory.find(item => 
      item.producto.toLowerCase().trim() === productName.toLowerCase().trim() &&
      item.destilado.toLowerCase().trim() === destiladoName.toLowerCase().trim()
    ) || null;
  }

  // Calculate ingredient cost
  static async calculateIngredientCost(
    productName: string, 
    destiladoName: string, 
    quantityMl: number
  ): Promise<IngredientCost> {
    // Input validation
    if (!productName || !destiladoName || quantityMl <= 0) {
      return {
        productName,
        destiladoName,
        quantityMl,
        unitCost: 0,
        bottleCapacity: 750,
        ingredientCost: 0
      };
    }

    try {
      console.log('Calculating cost for:', { productName, destiladoName, quantityMl });
      const inventory = await this.getInventoryData();
      const product = this.findProduct(inventory, productName, destiladoName);
      
      if (!product) {
        console.warn('Product not found in inventory:', { productName, destiladoName });
        // Product not found in inventory
        return {
          productName,
          destiladoName,
          quantityMl,
          unitCost: 0,
          bottleCapacity: 750, // Default bottle capacity
          ingredientCost: 0
        };
      }

      // Standard bottle capacity (can be made configurable later)
      const bottleCapacity = 750; // ml
      
      // Calculate ingredient cost: (Unit Cost / Bottle Capacity) * Quantity
      const ingredientCost = (product.costo_unitario / bottleCapacity) * quantityMl;

      console.log('Cost calculated successfully:', {
        productName,
        unitCost: product.costo_unitario,
        ingredientCost
      });

      return {
        productName,
        destiladoName,
        quantityMl,
        unitCost: product.costo_unitario,
        bottleCapacity,
        ingredientCost: Math.round(ingredientCost * 100) / 100 // Round to 2 decimal places
      };
    } catch (error) {
      console.error('Error calculating ingredient cost:', error);
      return {
        productName,
        destiladoName,
        quantityMl,
        unitCost: 0,
        bottleCapacity: 750,
        ingredientCost: 0
      };
    }
  }

  // Calculate total recipe cost
  static async calculateRecipeCost(ingredients: Array<{
    product_name: string;
    destilado_name: string;
    quantity_ml: number;
  }>): Promise<{
    ingredients: IngredientCost[];
    totalCost: number;
  }> {
    if (!ingredients || ingredients.length === 0) {
      return {
        ingredients: [],
        totalCost: 0
      };
    }

    try {
      console.log('Calculating recipe cost for', ingredients.length, 'ingredients');
      
      // Filter out invalid ingredients
      const validIngredients = ingredients.filter(ing => 
        ing.product_name && 
        ing.destilado_name && 
        ing.quantity_ml > 0
      );
      
      if (validIngredients.length === 0) {
        return {
          ingredients: [],
          totalCost: 0
        };
      }

      const ingredientCosts = await Promise.all(
        validIngredients.map(ingredient => 
          this.calculateIngredientCost(
            ingredient.product_name,
            ingredient.destilado_name,
            ingredient.quantity_ml
          )
        )
      );

      const totalCost = ingredientCosts.reduce((sum, ingredient) => sum + ingredient.ingredientCost, 0);

      console.log('Recipe cost calculated:', { totalCost, ingredientCount: ingredientCosts.length });

      return {
        ingredients: ingredientCosts,
        totalCost: Math.round(totalCost * 100) / 100 // Round to 2 decimal places
      };
    } catch (error) {
      console.error('Error calculating recipe cost:', error);
      return {
        ingredients: [],
        totalCost: 0
      };
    }
  }

  // Clear cache (useful for manual refresh)
  static clearCache(): void {
    this.inventoryCache = [];
    this.lastCacheUpdate = 0;
  }
}