import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  RefreshCw, 
  Calculator, 
  Save, 
  X,
  Send,
  Plus,
  DollarSign,
  Edit,
  Trash2,
  Minus,
  ArrowLeft,
  Package,
  Wine,
  Eye,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { RecipeService } from '../utils/recipeService';
import { CostCalculationService, IngredientCost } from '../utils/costCalculationService';
import { Recipe, RecipeWithIngredients } from '../utils/supabaseClient';

// Interfaces para datos de Supabase
interface ProductoSupabase {
  id: string;
  nombre: string;
  destilado: string | null;
  costo_unitario: number;
  capacidad_ml_por_unidad: number;
  seguimiento_stock: boolean;
}

interface TransactionPayload {
  tipo_transaccion: string;
  timestamp: string;
  id_usuario: string;
  id_venta?: string;
  origen: {
    tipo: string;
    nombre: string;
  };
  producto: {
    nombre: string;
    destilado: string;
  };
  movimiento: {
    cantidad_ml: number;
    operacion: string;
    movimiento_unidad: string;
    origen: string | null;
    destino: string;
  };
  valores: {
    costo_transaccion: number;
  };
}

// Toast Notification Component
interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3500);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    } text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-sm`}>
      <div className="h-5 w-5 flex-shrink-0">
        {type === 'success' ? '✓' : '✗'}
      </div>
      <span className="font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors"
      >
        ×
      </button>
    </div>
  );
};

const UpdateRecetasModule: React.FC = () => {
  // Estados básicos
  const [products, setProducts] = useState<ProductoSupabase[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Estados para recetas
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [selectedRecipeData, setSelectedRecipeData] = useState<RecipeWithIngredients | null>(null);
  const [saleQuantity, setSaleQuantity] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados para editor
  const [showEditor, setShowEditor] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [recipePrice, setRecipePrice] = useState('');
  const [ingredients, setIngredients] = useState<Array<{
    destilado: string;
    producto: string;
    cantidad: string;
  }>>([{ destilado: '', producto: '', cantidad: '' }]);

  // Estados para cálculos
  const [ingredientCosts, setIngredientCosts] = useState<IngredientCost[]>([]);
  const [totalRecipeCost, setTotalRecipeCost] = useState(0);

  const loadProducts = async () => {
    console.log('🔄 Starting loadProducts...');
    setLoadingProducts(true);
    try {
      // Cargar productos desde Supabase
      const { data: productosData, error: productosError } = await supabase
        .from('productos')
        .select('id, nombre, destilado, costo_unitario, capacidad_ml_por_unidad, seguimiento_stock')
        .eq('seguimiento_stock', true)
        .order('destilado', { ascending: true })
        .order('nombre', { ascending: true });

      if (productosError) {
        throw new Error(`Error cargando productos: ${productosError.message}`);
      }

      setProducts(productosData || []);
      console.log('✅ Products loaded successfully:', productosData?.length || 0, 'items');
    } catch (error) {
      console.error('❌ Error loading products:', error);
      showToast('Error al cargar productos desde Supabase', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const data = await RecipeService.getAllRecipes();
      setRecipes(data);
      console.log('✅ Recipes loaded:', data.length, 'recipes');
    } catch (error) {
      console.error('❌ Error loading recipes:', error);
      showToast('Error al cargar recetas', 'error');
    } finally {
      setLoadingRecipes(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    console.log('🚀 UpdateRecetasModule mounted, loading initial data...');
    loadProducts();
    loadRecipes();
  }, []);

  // Cargar datos de receta seleccionada
  useEffect(() => {
    const loadSelectedRecipeData = async () => {
      if (selectedRecipe) {
        try {
          const recipeData = await RecipeService.getRecipeWithIngredients(parseInt(selectedRecipe));
          setSelectedRecipeData(recipeData);
        } catch (error) {
          console.error('Error loading recipe data:', error);
        }
      } else {
        setSelectedRecipeData(null);
      }
    };

    loadSelectedRecipeData();
  }, [selectedRecipe]);

  // Calcular costos de ingredientes en tiempo real
  useEffect(() => {
    const calculateCosts = async () => {
      const validIngredients = ingredients.filter(ing => 
        ing.destilado && ing.producto && ing.cantidad && parseFloat(ing.cantidad) > 0
      );

      if (validIngredients.length === 0) {
        setIngredientCosts([]);
        setTotalRecipeCost(0);
        return;
      }

      try {
        const costs = await Promise.all(
          validIngredients.map(ingredient => 
            CostCalculationService.calculateIngredientCost(
              ingredient.producto,
              ingredient.destilado,
              parseFloat(ingredient.cantidad)
            )
          )
        );

        setIngredientCosts(costs);
        const total = costs.reduce((sum, cost) => sum + cost.ingredientCost, 0);
        setTotalRecipeCost(total);
      } catch (error) {
        console.error('Error calculating costs:', error);
      }
    };

    calculateCosts();
  }, [ingredients]);

  const destilados = [...new Set(products.map(p => p.destilado))].sort();

  const getProductosDisponibles = (destilado: string) => {
    return destilado 
      ? products.filter(p => p.destilado === destilado).map(p => p.nombre).sort()
      : [];
  };

  const handleRefreshData = async () => {
    setLoadingProducts(true);
    try {
      await Promise.all([
        loadProducts(),
        loadRecipes()
      ]);
      showToast('Datos actualizados correctamente', 'success');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showToast('Error al actualizar datos', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { destilado: '', producto: '', cantidad: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: string, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'destilado' && value) {
      updated[index].producto = '';
    }
    
    setIngredients(updated);
  };

  const handleSaveRecipe = async () => {
    if (!recipeName.trim()) {
      showToast('El nombre de la receta es obligatorio', 'error');
      return;
    }

    const validIngredients = ingredients.filter(ing => 
      ing.destilado && ing.producto && ing.cantidad && parseFloat(ing.cantidad) > 0
    );

    if (validIngredients.length === 0) {
      showToast('Debe agregar al menos un ingrediente válido', 'error');
      return;
    }

    setIsProcessing(true);
    
    try {
      let savedRecipe;
      
      if (editingRecipe) {
        // Update existing recipe
        savedRecipe = await RecipeService.updateRecipe(
          editingRecipe.id,
          recipeName.trim(),
          recipePrice ? parseFloat(recipePrice) : undefined
        );
        
        if (!savedRecipe) {
          throw new Error('Error al actualizar la receta');
        }
        
        // Delete existing ingredients
        for (const existingIngredient of editingRecipe.recipe_ingredients) {
          await RecipeService.deleteIngredient(existingIngredient.id);
        }
        
        showToast('Receta actualizada correctamente', 'success');
      } else {
        // Create new recipe
        savedRecipe = await RecipeService.createRecipe(
          recipeName.trim(),
          recipePrice ? parseFloat(recipePrice) : undefined
        );
        
        if (!savedRecipe) {
          throw new Error('Error al guardar la receta');
        }
        
        showToast('Receta creada correctamente', 'success');
      }


      // Add new ingredients
      for (const ingredient of validIngredients) {
        await RecipeService.addIngredient(
          savedRecipe.id,
          ingredient.producto,
          ingredient.destilado,
          parseFloat(ingredient.cantidad)
        );
      }

      
      // Reset form
      setRecipeName('');
      setRecipePrice('');
      setIngredients([{ destilado: '', producto: '', cantidad: '' }]);
      setShowEditor(false);
      setEditingRecipe(null);
      
      await loadRecipes();
      
    } catch (error) {
      console.error('Error saving/updating recipe:', error);
      showToast(editingRecipe ? 'Error al actualizar la receta' : 'Error al guardar la receta', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditRecipe = async () => {
    if (!selectedRecipe || !selectedRecipeData) return;

    try {
      // Pre-populate form with existing data
      setRecipeName(selectedRecipeData.name);
      setRecipePrice(selectedRecipeData.sale_price?.toString() || '');
      
      // Pre-populate ingredients
      const existingIngredients = selectedRecipeData.recipe_ingredients.map(ing => ({
        destilado: ing.destilado_name,
        producto: ing.product_name,
        cantidad: ing.quantity_ml.toString()
      }));
      
      setIngredients(existingIngredients.length > 0 ? existingIngredients : [{ destilado: '', producto: '', cantidad: '' }]);
      setEditingRecipe(selectedRecipeData);
      setShowEditor(true);
      
    } catch (error) {
      console.error('Error loading recipe for edit:', error);
      showToast('Error al cargar la receta para editar', 'error');
    }
  };

  const handleDeleteRecipe = async () => {
    if (!selectedRecipe) return;

    if (confirm('¿Estás seguro de que deseas eliminar esta receta?')) {
      try {
        await RecipeService.deleteRecipe(parseInt(selectedRecipe));
        showToast('Receta eliminada correctamente', 'success');
        setSelectedRecipe('');
        setSelectedRecipeData(null);
        await loadRecipes();
      } catch (error) {
        console.error('Error deleting recipe:', error);
        showToast('Error al eliminar la receta', 'error');
      }
    }
  };

  const handleConfirmSale = async () => {
    if (!selectedRecipeData || !saleQuantity) {
      showToast('Selecciona una receta y cantidad válida', 'error');
      return;
    }

    setIsProcessing(true);
    
    try {
      console.log('🔄 Processing recipe sale...');
      
      // Obtener ID de usuario actual (simplificado para testing)
      const currentUserId = 'admin_default'; // En producción, obtener del contexto de auth
      
      // PASO 1: Insertar registro de venta en tabla ventas
      const { data: ventaData, error: ventaError } = await supabase
        .from('ventas')
        .insert({
          id_externo_venta: `RECETA-${Date.now()}`,
          fecha_venta: new Date().toISOString(),
          total: (selectedRecipeData.sale_price || 0) * parseInt(saleQuantity),
          json_original: {
            receta: selectedRecipeData.name,
            cantidad: parseInt(saleQuantity),
            ingredientes: selectedRecipeData.recipe_ingredients
          }
        })
        .select('id')
        .single();

      if (ventaError) {
        throw new Error(`Error creando registro de venta: ${ventaError.message}`);
      }

      const ventaId = ventaData.id;
      console.log('✅ Sale record created with ID:', ventaId);

      // PASO 2: Calcular costos de ingredientes
      const ingredientCosts = await Promise.all(
        selectedRecipeData.recipe_ingredients.map(async (ing) => {
          const cost = await CostCalculationService.calculateIngredientCost(
            ing.product_name,
            ing.destilado_name,
            ing.quantity_ml * parseInt(saleQuantity)
          );
          return cost;
        })
      );

      // PASO 3: Crear array de transacciones de ingredientes
      const transactionPayloads: TransactionPayload[] = selectedRecipeData.recipe_ingredients.map(ing => ({
        tipo_transaccion: "Update_Recetas",
        timestamp: new Date().toISOString(),
        id_usuario: currentUserId,
        id_venta: ventaId, // Vincular con la venta creada
        origen: {
          tipo: "receta",
          nombre: selectedRecipeData.name
        },
        producto: {
          nombre: ing.product_name,
          destilado: ing.destilado_name
        },
        movimiento: {
          cantidad_ml: ing.quantity_ml * parseInt(saleQuantity),
          operacion: "salida_stock",
          movimiento_unidad: "ml",
          origen: null,
          destino: "barra"
        },
        valores: {
          costo_transaccion: ingredientCosts.find(cost => 
            cost.productName === ing.product_name && 
            cost.destiladoName === ing.destilado_name
          )?.ingredientCost || 0
        }
      }));

      console.log('📦 Created transaction payloads:', transactionPayloads.length, 'transactions');

      // PASO 4: Enviar transacciones al nuevo endpoint
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-manual-transaction`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionPayloads)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Si falla el procesamiento de transacciones, eliminar la venta creada
        await supabase.from('ventas').delete().eq('id', ventaId);
        
        throw new Error(`Error procesando transacciones: ${response.status} - ${errorData.error || 'Error desconocido'}`);
      }

      const responseData = await response.json();
      console.log('✅ Recipe sale processed successfully:', responseData);
      
      if (responseData.success) {
        showToast(`✅ Venta de receta procesada exitosamente (${transactionPayloads.length} ingredientes)`, 'success');
      } else {
        throw new Error(responseData.error || 'Error procesando venta de receta');
      }
      
      setSelectedRecipe('');
      setSelectedRecipeData(null);
      setSaleQuantity('');
      
    } catch (error) {
      console.error('Error processing sale:', error);
      showToast('Error al procesar la venta de receta', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Cálculos para vista previa de venta
  const selectedRecipeObj = recipes.find(r => r.id.toString() === selectedRecipe);
  const saleQty = parseInt(saleQuantity) || 0;
  
  // Estado para el costo real de la receta seleccionada
  const [selectedRecipeCost, setSelectedRecipeCost] = useState(0);
  
  // Calcular costo real de la receta seleccionada
  useEffect(() => {
    const calculateSelectedRecipeCost = async () => {
      if (selectedRecipeData && selectedRecipeData.recipe_ingredients.length > 0) {
        try {
          const costs = await Promise.all(
            selectedRecipeData.recipe_ingredients.map(ingredient => 
              CostCalculationService.calculateIngredientCost(
                ingredient.product_name,
                ingredient.destilado_name,
                ingredient.quantity_ml
              )
            )
          );
          
          const totalCost = costs.reduce((sum, cost) => sum + cost.ingredientCost, 0);
          setSelectedRecipeCost(totalCost);
        } catch (error) {
          console.error('Error calculating selected recipe cost:', error);
          setSelectedRecipeCost(0);
        }
      } else {
        setSelectedRecipeCost(0);
      }
    };

    calculateSelectedRecipeCost();
  }, [selectedRecipeData]);
  
  const totalSaleCost = selectedRecipeCost * saleQty;
  const totalSaleRevenue = selectedRecipeObj?.sale_price ? selectedRecipeObj.sale_price * saleQty : 0;
  const totalSaleProfitability = totalSaleRevenue - totalSaleCost;

  // Cálculos para editor
  const salePrice = parseFloat(recipePrice) || 0;
  const profitability = salePrice - totalRecipeCost;
  const profitMargin = salePrice > 0 ? ((profitability / salePrice) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-8 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-100">
                <CheckSquare className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Update por Recetas</h1>
                <p className="text-lg text-gray-600 mt-2">
                  Gestión de inventario mediante recetas y ventas
                </p>
              </div>
            </div>
            
            <button
              onClick={handleRefreshData}
              disabled={loadingProducts}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${loadingProducts ? 'animate-spin' : ''}`} />
              Actualizar Datos
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {!showEditor ? (
            // Vista Principal - Venta de Recetas
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-6 w-6 text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Venta de Recetas</h2>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEditor(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva Receta
                  </button>
                  
                  {selectedRecipe && (
                    <>
                      <button
                        onClick={handleEditRecipe}
                        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </button>
                      
                      <button
                        onClick={handleDeleteRecipe}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Formulario de Venta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Receta
                  </label>
                  <select
                    value={selectedRecipe}
                    onChange={(e) => setSelectedRecipe(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar receta</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name} {recipe.sale_price ? `- $${recipe.sale_price.toFixed(2)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={saleQuantity}
                    onChange={(e) => setSaleQuantity(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                    min="1"
                    disabled={!selectedRecipe}
                  />
                </div>
              </div>

              {/* Vista Previa de Venta - Estilo idéntico a Update por Unidades */}
              {selectedRecipe && saleQuantity && selectedRecipeObj && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-purple-600" />
                    Vista Previa de la Venta
                  </h3>
                  
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-2 rounded-full text-sm font-medium">
                      <Wine className="h-4 w-4" />
                      Venta: {saleQty}x {selectedRecipeObj.name}
                    </div>
                    
                    <div className="flex items-center gap-2 bg-red-100 text-red-800 px-3 py-2 rounded-full text-sm font-medium">
                      <DollarSign className="h-4 w-4" />
                      Costo Total: ${totalSaleCost.toFixed(2)}
                    </div>
                    
                    <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-2 rounded-full text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      Ingresos: ${totalSaleRevenue.toFixed(2)}
                    </div>
                    
                    <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-sm font-medium">
                      <Calculator className="h-4 w-4" />
                      Rentabilidad: ${totalSaleProfitability.toFixed(2)}
                    </div>
                  </div>

                  {selectedRecipeData && (
                    <div className="mt-4 pt-4 border-t border-purple-200">
                      <p className="text-sm text-gray-600 mb-2">Ingredientes a descontar:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedRecipeData.recipe_ingredients.map((ing, idx) => (
                          <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            {ing.product_name}: {ing.quantity_ml * saleQty}ml
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botón Confirmar y Enviar */}
              {selectedRecipe && saleQuantity && (
                <div className="flex justify-end">
                  <button
                    onClick={handleConfirmSale}
                    disabled={isProcessing}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-all duration-200 font-medium"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isProcessing ? 'Procesando...' : 'Confirmar y Enviar'}
                  </button>
                </div>
              )}
            </>
          ) : (
            // Editor de Recetas
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowEditor(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingRecipe ? 'Editar Receta' : 'Nueva Receta'}
                  </h2>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEditor(false)}
                    className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                  
                  <button
                    onClick={handleSaveRecipe}
                    disabled={!recipeName.trim() || isProcessing}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isProcessing ? 
                      (editingRecipe ? 'Actualizando...' : 'Guardando...') : 
                      (editingRecipe ? 'Actualizar' : 'Guardar')
                    }
                  </button>
                </div>
              </div>

              {/* Información Básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la Receta *
                  </label>
                  <input
                    type="text"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ej: Margarita Clásica"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio de Venta
                  </label>
                  <input
                    type="number"
                    value={recipePrice}
                    onChange={(e) => setRecipePrice(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Ingredientes */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Ingredientes</h3>
                  <button
                    onClick={addIngredient}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-all duration-200 font-medium text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar Ingrediente
                  </button>
                </div>

                <div className="space-y-4">
                  {ingredients.map((ingredient, index) => {
                    const productosDisponibles = getProductosDisponibles(ingredient.destilado);
                    const ingredientCost = ingredientCosts.find(cost => 
                      cost.productName === ingredient.producto && 
                      cost.destiladoName === ingredient.destilado
                    );
                    
                    return (
                      <div key={index} className="grid grid-cols-12 gap-3 items-center bg-white p-4 rounded-lg border">
                        {/* Destilado */}
                        <div className="col-span-3">
                          <select
                            value={ingredient.destilado}
                            onChange={(e) => updateIngredient(index, 'destilado', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="">Seleccionar destilado</option>
                            {destilados.map((destilado) => (
                              <option key={destilado} value={destilado}>
                                {destilado}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Producto */}
                        <div className="col-span-3">
                          <select
                            value={ingredient.producto}
                            onChange={(e) => updateIngredient(index, 'producto', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            disabled={!ingredient.destilado}
                          >
                            <option value="">Seleccionar producto</option>
                            {productosDisponibles.map((producto) => (
                              <option key={producto} value={producto}>
                                {producto}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Cantidad */}
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={ingredient.cantidad}
                            onChange={(e) => updateIngredient(index, 'cantidad', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="ml"
                            min="1"
                          />
                        </div>

                        {/* Costo */}
                        <div className="col-span-3">
                          <div className="bg-green-100 px-3 py-2 rounded-lg text-sm font-medium text-green-800">
                            Costo: ${ingredientCost ? ingredientCost.ingredientCost.toFixed(2) : '0.00'}
                          </div>
                        </div>

                        {/* Eliminar */}
                        <div className="col-span-1">
                          <button
                            onClick={() => removeIngredient(index)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumen Financiero */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 border border-green-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-green-600" />
                  Resumen Financiero
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600">Costo Total Receta</p>
                    <p className="text-xl font-bold text-red-600">${totalRecipeCost.toFixed(2)}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600">Precio de Venta</p>
                    <p className="text-xl font-bold text-blue-600">${salePrice.toFixed(2)}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600">Rentabilidad</p>
                    <p className={`text-xl font-bold ${profitability >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${profitability.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600">Margen (%)</p>
                    <p className={`text-xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateRecetasModule;